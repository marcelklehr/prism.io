var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , Document = require('./lib/Document')
  , Connection = require('./lib/Connection')

// ROUTES

//app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.static(__dirname))
app.all('/', function(req, res){
  res.sendfile('index.html');
});
server.listen(80);

var doc = new Document('Hello World')


// S.IO

io.on('connection', function(socket){
  doc.addConnection(new Connection(socket))
})