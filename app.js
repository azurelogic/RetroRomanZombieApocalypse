/**
 * Module dependencies.
 */

var express = require('express.io')
//, routes = require('./routes')
  , path = require('path');

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

app.io.route('ready', function(req) {
  req.io.broadcast('new visitor')
})


app.get('/', function(req, res){
  res.render('index', { title: 'Express' });
});
//app.get('/', routes.index);

app.listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});
