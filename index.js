const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

io.on('connection', socket => {
  console.log('a user connected')
})

server.listen(4000, () => {
  console.log('The server is running: http://localhost:4000')
})