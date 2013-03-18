
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var me = require('express-liquid');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  //app.use(express.favicon());
  //app.use(express.logger('dev'));
  //app.use(express.bodyParser());
  //app.use(express.methodOverride());
  //app.use(app.router);
  app.set('view engine', 'liquid');
  app.enable('view cache');
  app.engine('liquid', me());
});


var users = [
  { name: 'tobi', email: 'tobi@learnboost.com' },
  { name: 'loki', email: 'loki@learnboost.com' },
  { name: 'jane', email: 'jane@learnboost.com' }
];
app.use(function(req, res, next){
  var context = new me.tinyliquid.Context();
  context.setLocals('users', users);
  res.render('users', {context: context});
});



http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});