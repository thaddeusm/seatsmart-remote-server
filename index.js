const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const simpleID = require('simple-id')

// hold information about connected devices and rooms (activity)
var activitiesIDDictionary = {}

// store closed activity rooms to force exit activity device connections
var closedActivityRooms = []

// this object holds information about connected devices and rooms (remote)
var idDictionary = {}

// store closed rooms to force exit remote connections
var closedRooms = []

const roomClosed = function(roomToCheck, connectionType) {
  let check = false

  let dictionary

  if (connectionType == 'remote') {
    dictionary = closedRooms
  } else {
    dictionary = closedActivityRooms
  }

  for (let i=0; i<dictionary.length; i++) {
    if (dictionary[i] == roomToCheck) {
      check = true
      break
    }
  }

  return check
}

const roomExists = function(roomToCheck, connectionType) {
  let check = false

  let dictionary

  if (connectionType == 'remote') {
    dictionary = idDictionary
  } else {
    dictionary = activitiesIDDictionary
  }

  let registeredRooms = Object.values(dictionary)

  for (let i=0; i<registeredRooms.length; i++) {
    if (registeredRooms[i] == roomToCheck) {
      check = true
      break
    }
  }

  return check
}

io.on('connection', socket => {
  console.log('a user connected')

  // Seatsmart Activities Events

  // set up an activity room
  socket.on('createActivityRoom', () => {
    let newID = simpleID(4, '1234567890')

    // send host to newly created room
    socket.join(newID)

    // register host in dictionary
    activitiesIDDictionary[socket.id] = newID

    // send room id back to host
    io.to(newID).emit('activityRoomEstablished', newID)
  })

  // activity device connects
  socket.on('joinActivityRoom', (room) => {
    if (roomExists(room, 'activity') && !roomClosed(room, 'activity')) {
      socket.join(room)

      // register activity device in dictionary
      activitiesIDDictionary[socket.id] = room

      // send notification to activity device and host
      io.to(socket.id).emit('roomJoined', room)
      io.to(room).emit('activityDeviceConnected', socket.id)
    } else {
      // notify activity device that room does not exist
      io.to(socket.id).emit('roomJoinRejected')
    }
  })

  // activity device user sends their shortened name for identification
  socket.on('sendingUsername', (name) => {
    io.to(activitiesIDDictionary[socket.id]).emit('incomingUsername', name)
  })

  // activity device requests data
  socket.on('requestActivityData', () => {
    let roomID = activitiesIDDictionary[socket.id]

    io.to(roomID).emit('activityDataRequested')
  })

  // host sends activity data to connected client
  socket.on('activityDataIncoming', (data) => {
    io.to(activitiesIDDictionary[socket.id]).emit('incomingActivityData', data)
  })

  // host sends start signal
  socket.on('sendStartSignal', () => {
    io.to(activitiesIDDictionary[socket.id]).emit('allowActivityStart')
  })

  // activity device sends activity response
  socket.on('sendResponseData', (data) => {
    io.to(activitiesIDDictionary[socket.id]).emit('incomingResponseData', data)
  })

  // host confirms response was received
  socket.on('confirmResponseReceipt', (data) => {
    io.to(activitiesIDDictionary[socket.id]).emit('responseReceiptConfirmed', data)
  })

  socket.on('rejoinActivityRoom', (room) => {
    socket.join(room)

    activitiesIDDictionary[socket.id] = room

    io.to(socket.id).emit('rejoinedActivityRoom')
    io.to(activitiesIDDictionary[socket.id]).emit('rejoinedRoom')
  })

  // upon reconnect, activity device checks if activity has started
  socket.on('checkActivityStatus', (room) => {
    io.to(room).emit('activityStatusRequested', socket.id)
  })

  // if the activity is finished, notify activity device attempting to join
  socket.on('rejectDeviceParticipation', (device) => {
    io.to(device).emit('participationRejected')
  })

  socket.on('cancelActivity', () => {
    let roomID = activitiesIDDictionary[socket.id]

    closedActivityRooms.push(roomID)

    // remove device from room
    socket.leave(activitiesIDDictionary[socket.id])
    // notify activity device
    io.to(activitiesIDDictionary[socket.id]).emit('activityCanceled')
  })

  // host ends session
  socket.on('endActivitySession', () => {
    let roomID = activitiesIDDictionary[socket.id]

    closedActivityRooms.push(roomID)

    // remove device from room
    socket.leave(activitiesIDDictionary[socket.id])
  })

  // Seatsmart Remote Events:

  // set up room to secure messages
  socket.on('establishRoom', () => {
    let newID = simpleID(4, '1234567890')

    // send host to newly created room
    socket.join(newID)

    // if the host is starting a new connection, close former
    if (idDictionary.hasOwnProperty(socket.id)) {
      io.to(idDictionary[socket.id]).emit('deviceDisconnection')
    }

    // register host in dictionary
    idDictionary[socket.id] = newID

    // send room id back to host
    io.to(newID).emit('roomEstablished', newID)
  })

  // remote client joins room
  socket.on('joinRoom', (room) => {
    if (roomExists(room, 'remote') && !roomClosed(room, 'remote')) {
      socket.join(room)

      // register client in dictionary
      idDictionary[socket.id] = room

      // send notification to remote device and host
      io.to(socket.id).emit('roomJoined', room)
      io.to(room).emit('remoteConnected')
    } else {
      // notify remote client that room does not exist
      io.to(socket.id).emit('roomJoinRejected')
    }
  })

  // client requests data
  socket.on('requestData', () => {
    let roomID = idDictionary[socket.id]

    if (!roomClosed(roomID)) {
      io.to(roomID).emit('dataRequested')
    } else {
      io.to(roomID).emit('sessionEnded')
    }
  })

  // host responds with encrypted data
  socket.on('dataIncoming', (data) => {
    io.to(idDictionary[socket.id]).emit('incomingData', data)
  })

  // client initiates action
  socket.on('initAction', (action) => {
    io.to(idDictionary[socket.id]).emit('requestAction', action)
  })

  // host responds with action completion confirmation
  socket.on('initConfirm', (actionID) => {
    io.to(idDictionary[socket.id]).emit('confirmAction', actionID)
  })

  // reconnect
  socket.on('rejoinRoom', (room) => {
    socket.join(room)

    // reregister device in dictionary in case of id change
    idDictionary[socket.id] = room
    

    // send notification to room
    io.to(idDictionary[socket.id]).emit('rejoinedRoom')
  })

  // host ends session
  socket.on('endSession', () => {
    let roomID = idDictionary[socket.id]

    // notify remote
    io.to(roomID).emit('sessionEnded')
    closedRooms.push(roomID)

    // remove device from room
    socket.leave(idDictionary[socket.id])
  })

  socket.on('disconnect', () => {
    // send notification to room
    io.to(idDictionary[socket.id]).emit('deviceDisconnection')
    io.to(activitiesIDDictionary[socket.id]).emit('deviceDisconnection', socket.id)
  })

})

server.listen(4000, () => {
  console.log('The server is running')
})