const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const simpleId = require('simple-id')

var idDictionary = {}

io.on('connection', socket => {
  console.log('a user connected')

  socket.on('action', (action) => {
  	console.log(action)
  })

  // set up room to secure messages
  socket.on('establishRoom', () => {
  	let newId = simpleId()

    // sent host to newly created room
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

    io.to(socket.id).emit('roomJoined', room)
    io.to(room).emit('remoteConnected')
  })

  // client checks passphrase
  socket.on('requestCheckPassphrase', (data) => {
    io.to(data.roomID).emit('checkPassphrase', data.passphrase)
  })

  // host responds to passphrase check
  socket.on('confirmPassphrase', () => {
    io.to(idDictionary[socket.id]).emit('passphraseConfirmed')
  })

  socket.on('rejectPassphrase', () => {
    io.to(idDictionary[socket.id]).emit('passphraseRejected')
  })

  // reconnect
  socket.on('rejoinRoom', (room) => {
    socket.join(room)

    // reregister device in dictionary in case of id change
    idDictionary[socket.id] = room

    io.to(socket.id).emit('rejoinedRoom')
  })

  socket.on('disconnect', () => {
    io.to(idDictionary[socket.id]).emit('deviceDisconnection')
  })

})

server.listen(4000, () => {
  console.log('The server is running')
})