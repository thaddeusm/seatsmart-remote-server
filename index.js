const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const simpleId = require('simple-id')

var rooms = []

io.on('connection', socket => {
  console.log('a user connected')

  socket.on('action', (action) => {
  	console.log(action)
  })

  // set up room to secure messages
  socket.on('establishRoom', (passphrase) => {
  	let newId = simpleId()

  	socket.join(newId)

  	let roomInfo = {
  		id: newId,
  		passphrase: passphrase,
  		host: socket.id,
  		remote: ''
  	}

  	rooms.push(roomInfo)

  	io.to(newId).emit('roomEstablished', newId)
  	io.to(socket.id).emit('remoteConnected', roomInfo)
  })

})

server.listen(4000, () => {
  console.log('The server is running')
})