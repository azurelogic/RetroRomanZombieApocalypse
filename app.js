/**
 * Module dependencies.
 */

var express = require('express.io')
//, routes = require('./routes')
  , path = require('path')
  , uuid = require('node-uuid');

var app = express().http().io();

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.set('view engine', 'jade');
//session support if needed
//app.use(express.cookieParser('your secret here'));
  app.use(require('less-middleware')({ src:__dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

app.io.route('getId', function(req){
  var id = uuid.v4();
  console.log(id)
  req.io.emit('setId', { id: id });
})

app.io.route('joinRoom', function(req) {
  req.io.join(req.data.room);
  req.io.room(req.data.room).broadcast('hasJoinedRoom', req.data);
})

app.io.route('iMove', function(req) {
  console.log("things are happening");
  req.io.broadcast('youMove', req.data);
})


app.get('/', function(req, res){
  res.render('index', { title: 'Express' });
});
//app.get('/', routes.index);

app.listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});
