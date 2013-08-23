// module dependencies
var express = require('express.io')
  , path = require('path')
  , uuid = require('node-uuid')
  , _ = require('lodash');

// setup server object
var app = express().http().io();

// configuration
app.configure(function () {
  app.set('port', 3000);
  app.set('view engine', 'jade');
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

// ----- real-time routes -----

// sends player their id
app.io.route('playerConnect', function (req) {
  var data = {};
  data.playerId = req.socket.id;

  // send message to user
  req.io.emit('connectionReply', data);
});

//the player id is added to the room and notified;
app.io.route('joinRoom', function (req) {
  // register player with room
  req.io.join(req.data.roomId);

  // send verification that room was joined to the player with room id
  req.io.emit('roomJoined', {roomId: req.data.roomId});

  // handle player disconnection:
  // requires socket id to be captured in closure scope for later use
  req.socket.on('disconnect', function () {
    // notify other players in the room of the disconnection
    var data = {};
    data.playerId = req.socket.id;
    req.io.room(req.data.roomId).broadcast('playerDisconnected', data);
    
    // remove the player from the socket.io room
    req.io.leave(req.data.roomId);
  });
});

// handle a user leaving a room not by disconnection
app.io.route('leaveRoom', function (req) {
  // notify other players in the room of the disconnection
  var data = {};
  data.playerId = req.socket.id;
  req.io.room(req.data.roomId).broadcast('playerDisconnected', data);
  
  // remove the player from the socket.io room
  req.io.leave(req.data.roomId);
});

// handles rebroadcast of gameplay messages to other players in the room
app.io.route('clientSend', function (req) {
  req.io.room(req.data.roomId).broadcast('clientReceive', req.data);
});

// ----- path routes -----

// root route: returns game page
app.get('/', function (req, res) {
  res.render('index', { title: 'Retro Roman Zombie Apocalypse' });
});

// start the server
app.listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});