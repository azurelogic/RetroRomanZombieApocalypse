// module dependencies
var express = require('express.io')
//, routes = require('./routes')
  , path = require('path')
  , uuid = require('node-uuid')
  , _ = require('lodash');

var app = express().http().io();

// configuration
app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.set('view engine', 'jade');
//session support if needed
//app.use(express.cookieParser('your secret here'));
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

var rooms = [];

var Room = function () {
  this.id = uuid.v4();
  this.playerIds = [];
};

var User = function (options) {
  this.id = options.id;
};

// real-time routes
app.io.route('playerConnect', function (req) {
  var data = {};
  data.playerId = req.socket.id;
  console.log(data.playerId);

  AddRoomsToData(data);

  req.io.emit('connectionReply', data);

  req.socket.on('disconnect', function () {
    console.log('disconnect works: ' + req.socket.id);

    var roomToLeave = _.find(rooms, function (room) {
      return _.any(room.playerIds, function (id) {
        return id == req.socket.id;
      });
    });
    LeaveRoom(roomToLeave, req);
  });
});

app.io.route('getRooms', function (req) {
  var data = {};
  AddRoomsToData(data);

  req.io.emit('updatedRoomList', data);
});

function AddRoomsToData(data) {
  var availableRooms = _.filter(rooms, function (room) {
    if (room.playerIds.length < 4)
      return true;
    return false;
  })

  if (availableRooms.length == 0) {
    var newRoom = new Room();
    rooms.push(newRoom);
    availableRooms.push(newRoom);
  }

  data.rooms = _.map(availableRooms, function (room) {
    return {
      roomId: room.id,
      playerCount: room.playerIds.length
    };
  });

  data.totalRooms = rooms.length;

  var roomCounts = _.map(rooms, function(room) {
    return room.playerIds.length;
  });

  data.playersInRooms = _.reduce(roomCounts, function (sum, count) {
    return sum + count;
  });
}

app.io.route('joinRoom', function (req) {
  console.log('trying to join room: ' + req.data.roomId)

  var room = _.find(rooms, {id: req.data.roomId});

  //verify that player can join room
  if (!room || room.playerIds.length >= 4)
  {
    req.io.emit('connectionRefused');
    return;
  }

  //register player with room
  room.playerIds.push(req.socket.id);
  req.io.join(room.id);

  req.io.emit('roomJoined', {roomId: room.id});
});

app.io.route('leaveRoom', function (req) {
  console.log('leave room works: ' + req.socket.id);

  var roomToLeave = _.find(rooms, {id: req.data.roomId});
  LeaveRoom(roomToLeave, req);
});

function LeaveRoom(roomToLeave, req) {
  if (roomToLeave) {
    roomToLeave.playerIds = _.filter(roomToLeave.playerIds, function (id) {
      return id != req.socket.id;
    });
    var data = {};
    data.playerId = req.socket.id;

    if (roomToLeave.playerIds.length == 0)
    {
      _.filter(rooms, function (room) {
        return room.id != roomToLeave.id;
      });
    }
    else
      req.io.room(roomToLeave.id).broadcast('playerDisconnected', data);

    req.io.leave(roomToLeave.id);
  }
}

app.io.route('clientSend', function (req) {
  console.log("Received from id: " + req.data.playerId + " on room " + req.data.roomId);
  req.io.room(req.data.roomId).broadcast('clientReceive', req.data);
});

// path routes
app.get('/', function (req, res) {
  res.render('index', { title: 'Retro Colosseum Zombie Apocalypse' });
});
//app.get('/', routes.index);

// start the server
app.listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});