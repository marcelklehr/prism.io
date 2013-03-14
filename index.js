var socketio = require('socket.io')
  , Document = require('./lib/Document')
  , Connection = require('./lib/Connection')

// ROUTES

exports.listen = function(server) {
  if(server instanceof http.Server)
  if(server instanceof io.Manager?)
  io.of('warp').on('connection', function(socket){
    console.log('new connection: '+socket.id)
    var conn = new Connection(socket)
    conn.once('ready', function(data) {
      if(!docs[data.document]) docs[data.document] = new Document(initialDocument)
      docs[data.document].addConnection(conn)
      conn.emit('ready', data)
    })
  })
}

var initialDocument = '<p>A minimalist writing zone, where you can block out all distractions and get to what\'s important. The writing!</p><p>To get started, all you need to do is delete this text (seriously, just highlight it and hit delete), and fill the page with your own fantastic words.</p><p>You can use <b>bold</b>, <i>italics</i>,<b><i>both</i></b> and <a href="http://zenpen.io">urls</a> just by highlighting the text and selecting them from the tiny options box that appears above it.</p><blockquote>Quotes are easy to add too!</blockquote><p>And if you enjoy joined-up writing, just share this url with anyone in the world and you can write together.</p><p>Happy typing! &lt;3</p>'

var docs = {}


// S.IO

