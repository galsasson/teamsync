var httpPort = 3000;
var socketPort = 3001;

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(socketPort);

app.use(express.static(__dirname + '/videochat'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/includes'));
//Store all JS and CSS in Scripts folder.

app.get('/',function(req,res){
  res.sendFile('index.html');
  //It will find and locate index.html from View or Scripts
});

app.listen(httpPort);


io.sockets.on('connection', function (socket){

  // convenience function to log server messages to the client
  function log(){
    var array = ['>>> Message from server: '];
    for (var i = 0; i < arguments.length; i++) {
      array.push(arguments[i]);
    }
      socket.emit('log', array);
  }

  socket.on('message', function (message) {
    log('Got message:', message);
    // for a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  // signal is { room:<room>, data:<data> }
  socket.on('signal', function(sig) {
  	var room = sig.room;
  	var data = sig.data;
  	for (s in io.sockets.adapter.rooms[room].sockets) {
  		if (s != socket.id) {
  			console.log('sending to: '+s);
  			io.to(s).emit('signal', data);
  		}
  	}
  })

  socket.on('create or join', function (room) {
  	var roomArr = io.sockets.adapter.rooms[room];
  	var numClients = (roomArr===undefined)?0:roomArr.length;

  	console.log('rooms['+room+'] = '+numClients);
    log('Room ' + room + ' has ' + numClients + ' client(s)');
    log('Request to create or join room \'' + room +'\'');

    if (numClients === 0){
      socket.join(room);
      socket.emit('created', room);
    } else if (numClients === 1) {
      socket.join(room);
      io.sockets.in(room).emit('join', room);
    } else { // max two clients
      socket.emit('full', room);
    }
    // socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
    // socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

  });

});


console.log('Serving HTTP on port '+httpPort+', Socket.io on port '+socketPort);

//require('./router');