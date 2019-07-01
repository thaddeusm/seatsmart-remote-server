const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const simpleId = require('simple-id')

// this object holds information about connected devices and rooms
var idDictionary = {}

io.on('connection', socket => {
  console.log('a user connected')

  // set up room to secure messages
  socket.on('establishRoom', () => {
  	let newId = simpleId(4, '1234567890')

    // send host to newly created room
  	socket.join(newId)

    // if the host is starting a new connection, close former
    if (idDictionary.hasOwnProperty(socket.id)) {
      io.to(idDictionary[socket.id]).emit('deviceDisconnection')
    }

    // register host in dictionary
    idDictionary[socket.id] = newId

    // send room id back to host
  	io.to(newId).emit('roomEstablished', newId)
  })

  // remote client joins room
  socket.on('joinRoom', (room) => {
    socket.join(room)

    // register client in dictionary
    idDictionary[socket.id] = room

    // send notification to remote device and host
    io.to(socket.id).emit('roomJoined', room)
    io.to(room).emit('remoteConnected')
  })

  // client requests data
  socket.on('requestData', () => {
    io.to(idDictionary[socket.id]).emit('dataRequested')
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
    // notify remote
    io.to(idDictionary[socket.id]).emit('sessionEnded')

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