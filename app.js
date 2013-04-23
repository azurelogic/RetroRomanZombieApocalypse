// module dependencies
var express = require('express.io')
//, routes = require('./routes')
  , path = require('path')
  , uuid = require('node-uuid');

var app = express().http().io();

// configuration
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


// real-time routes
app.io.route('disconnect', function(){

})

app.io.route('getId', function(req){
  var data = {};
  data.playerId = uuid.v4();
  console.log(data.playerId);
  req.io.emit('setId', data);
})

app.io.route('joinRoom', function(req) {
  req.io.join(req.data.room);
  req.io.room(req.data.room).broadcast('hasJoinedRoom', req.data);
})

app.io.route('iMove', function(req) {
  var asdf = Date.now();
  console.log("Received from id: " + req.data.playerId + " at " + asdf);
  req.io.room(req.data.room).broadcast('youMove', req.data);
})



// path routes
app.get('/', function(req, res){
  res.render('index', { title: 'Express' });
});
//app.get('/', routes.index);



// start the server
app.listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});
