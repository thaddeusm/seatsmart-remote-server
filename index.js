const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const simpleID = require('simple-iD')

// this object holds information about connected devices and rooms (activity)
var activitiesIDDictionary = {}

// this object holds information about connected devices and rooms (remote)
var idDictionary = {}

// store closed rooms to force exit remote connections
var closedRooms = []

const roomClosed = function(roomToCheck) {
  let check = false

  for (let i=0; i<closedRooms.length; i++) {
    if (closedRooms[i] == roomToCheck) {
      check = true
      break
    }
  }

  return check
}

const roomExists = function(roomToCheck) {
  let check = false

  let registeredRooms = Object.values(idDictionary)

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

  // set up an activity preview room
  socket.on('createPreviewRoom', () => {
    let newID = simpleID(6, '1234567890abc')

    // send host to newly created room
    socket.join(newID)

    // register host in dictionary
    activitiesIDDictionary[socket.id] = newID

    // send room id back to host
    io.to(newID).emit('previewRoomEstablished', newID)
  })

  // preview device connects
  socket.on('joinPreviewRoom', (room) => {
    socket.join(room)

    // register preview device in dictionary
    activitiesIDDictionary[socket.id] = room

    // send notification to preview device and host
    io.to(socket.id).emit('roomJoined', room)
    io.to(room).emit('previewDeviceConnected')
  })

  // host sends activity data for preview
  socket.on('activityPreviewDataIncoming', (data) => {
    io.to(activitiesIDDictionary[socket.id]).emit('incomingActivityPreviewData', data)
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
    if (roomExists(room) && !roomClosed(room)) {
      socket.join(room)
    } else {
      // notify remote client that room does not exist
      io.to(socket.id).emit('roomJoinRejected')
    }

    // register client in dictionary
    idDictionary[socket.id] = room

    // send notification to remote device and host
    io.to(socket.id).emit('roomJoined', room)
    io.to(room).emit('remoteConnected')
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
  })

})

server.listen(4000, () => {
  console.log('The server is running')
})