#!/usr/bin/env node

/**
 * Module dependencies.
 */

var debug = require('debug')('express-sample:server');
var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var _ = require('lodash');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

//attach socket.io
var io = require('socket.io')(server, { serveClient: false, path: '/sockets/rrza'});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// ----- routes -----

// root route: returns game page
app.get('/', function (req, res) {
  res.render('index', { title: 'GummiWars' });
});

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });
//
// // error handlers
//
// // development error handler
// // will print stacktrace
// if (app.get('env') === 'development') {
//   app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: err
//     });
//   });
// }
//
// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

var rooms = [];
var Room = function () {
  this.id = uuid.v4();
  this.playerIds = [];
};

// packs the room list and statistics onto the data message
function addRoomsToData(data) {
  // filter down to only rooms that can accept a new player
  var availableRooms = _.filter(rooms, function (room) {
    return room.playerIds.length < 4;
  });

  // if no rooms are available, create a new room
  if (availableRooms.length == 0) {
    var newRoom = new Room();
    rooms.push(newRoom);
    availableRooms.push(newRoom);
  }

  // convert available rooms to just room id and player count
  // and attach to data message
  data.rooms = _.map(availableRooms, function (room) {
    return {
      roomId: room.id,
      playerCount: room.playerIds.length
    };
  });

  // attach total number of rooms to data message
  data.totalRooms = rooms.length;

  // map-reduce to get total number of players in game
  // and attach to message
  var roomCounts = _.map(rooms, function (room) {
    return room.playerIds.length;
  });
  data.playersInRooms = _.reduce(roomCounts, function (sum, count) {
    return sum + count;
  });
}

// does the heavy lifting for leaving a room
function leaveRoom(roomToLeave, socket) {
  // check for null/undefined
  if (roomToLeave) {

    // remove the player from the room data
    roomToLeave.playerIds = _.filter(roomToLeave.playerIds, function (id) {
      return id != socket.id;
    });

    // if the room is now empty, remove it from the room list
    if (roomToLeave.playerIds.length == 0) {
      rooms = _.filter(rooms, function (room) {
        return room.id != roomToLeave.id;
      });
    }
    // otherwise, notify other players in the room of the disconnection
    else {
      var data = {};
      data.playerId = socket.id;
      socket.to(roomToLeave.id).emit('playerDisconnected', data);
    }

    // remove the player from the socket.io room
    socket.leave(roomToLeave.id);
  }
}

// ----- socket.io -----
io.on('connection', function (socket) {
// sends player their id and a list of rooms
  socket.on('playerConnect', function () {
    var data = {};
    data.playerId = socket.id;

    // add room info to message
    addRoomsToData(data);

    // send message to user
    socket.emit('connectionReply', data);
  });

// sends player an update room list
  socket.on('getRooms', function () {
    var data = {};

    // add room info to message
    addRoomsToData(data);

    // send message to user
    socket.emit('updatedRoomList', data);
  });

  // handle player disconnection:
  socket.on('disconnect', function () {
    // find the room being left
    var roomToLeave = _.find(rooms, function (room) {
      return _.some(room.playerIds, function (id) {
        // capture socket id in closure scope
        return id == socket.id;
      });
    });
    // handle the rest of the disconnection
    leaveRoom(roomToLeave, socket);
  });

// attempts to allow a player to join a game:
// if successful, the player id is added to the room and notified;
// if failed, the player is sent a refusal;
  socket.on('joinRoom', function (data) {
    // find the room being requested
    var room = _.find(rooms, {id: data.roomId});

    // verify that player can join room:
    // room must exist and have less than 4 players
    if (!room || room.playerIds.length >= 4) {
      // send refusal
      socket.emit('connectionRefused');
      return;
    }

    // register player with room
    room.playerIds.push(socket.id);
    socket.join(room.id);

    // send verification that room was joined to the player with room id
    socket.emit('roomJoined', {roomId: room.id});
  });

// handle a user leaving a room not by disconnection
  socket.on('leaveRoom', function (data) {
    // find the room being left
    var roomToLeave = _.find(rooms, {id: data.roomId});

    // handle the rest of the disconnection
    leaveRoom(roomToLeave, socket);
  });

// handles rebroadcast of gameplay messages to other players in the room
  socket.on('clientSend', function (data) {
    socket.to(data.roomId).emit('clientReceive', data);
  });

// handles rebroadcast of gameplay messages to other players in the room
  socket.on('localPlayerDied', function (data) {
    socket.to(data.roomId).emit('remotePlayerDied', data);
  });
});
