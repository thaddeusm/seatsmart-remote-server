const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const simpleId = require('simple-id')

io.on('connection', socket => {
  console.log('a user connected')

  socket.on('action', (action) => {
  	console.log(action)
  })

  // set up room to secure messages
  socket.on('establishRoom', () => {
  	let newId = simpleId()

  	socket.join(newId)

    // send room id back to host
  	io.to(newId).emit('roomEstablished', newId)
  })

  // remote client joins room
  socket.on('joinRoom', (room) => {
    socket.join(room)

    io.to(socket.id).emit('roomJoined')
    io.to(room).emit('remoteConnected')
  })

  // reconnect
  socket.on('rejoinRoom', (room) => {
    socket.join(room)

    io.to(socket.id).emit('rejoinedRoom')
  })

})

server.listen(4000, () => {
  console.log('The server is running')
})