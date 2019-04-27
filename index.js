var express = require('express')
  , http = require('http')

var app = express()
var server = http.createServer(app)
var io = require('socket.io').listen(server)

io.on('connection', function(socket) {
	console.log('connected', socket.id)
})

module.exports = app
