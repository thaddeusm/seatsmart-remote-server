const express = require('express')
const app = express()

var http = require('http').Server(app)
var io = require('socket.io')(http)

io.on('connection', function(socket) {
	console.log('connected', socket.id)
})

module.exports = app
