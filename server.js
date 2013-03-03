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
app.all('*', function(req, res){
  res.sendfile('index.html');
});
server.listen(9009);

var initialDocument = '<p>A minimalist writing zone, where you can block out all distractions and get to what\'s important. The writing!</p><p>As if that\'s not enough, you can easily share this zone with anyone and write together. In real-time.</p><p>To get started, all you need to do is delete this text (seriously, just highlight it and hit delete), and fill the page with your own fantastic words.</p><p>You can use <b>bold</b>, <i>italics</i>,<b><i>both</i></b> and <a href="http://zenpen.io">urls</a> just by highlighting the text and selecting them from the tiny options box that appears above it.</p><blockquote>Quotes are easy to add too!</blockquote><p>Zenpen is what you see, by Tim Holman<br>Warp is what you feel, by Marcel Klehr</p><p>Happy editing! &lt;3</p>'

var docs = {}


// S.IO

io.of('warp').on('connection', function(socket){
  console.log('new connection: '+socket.id)
  var conn = new Connection(socket)
  conn.once('ready', function(data) {
    if(!docs[data.document]) docs[data.document] = new Document(initialDocument)
    docs[data.document].addConnection(conn)
    conn.emit('ready', data)
  })
})