const express = require('express')
const helmet = require('helmet')
const app = express()

var http = require('http').Server(app)
var io = require('socket.io')(http)


// add some security-related headers to the response
app.use(helmet())

io.on('connection', function(socket) {
	console.log('connected', socket.id)
})

module.exports = app
