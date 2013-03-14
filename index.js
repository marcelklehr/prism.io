var socketio = require('socket.io')
  , http = require('http')
  , Document = require('./lib/Document')
  , Connection = require('./lib/Connection')
  
module.exports = function(server, opts) {
  var server, io, opts = opts || {}

  // set options
  var options = {
    initialContent: opts.initialContent || ''
  }
  for(var prop in options) if ('undefined' == typeof options[prop]) throw new Error('"'+prop+'" option is not set')

  // We got a socket.io instance
  if(server instanceof socketio.Manager) {
    io = server
    server = io.server
  }
  
  // we already got a pure http server
  else if(server instanceof http.Server) {
    io = socketio.listen(server)
  }

  var docs = {}
  io.of('prism.io').on('connection', function(socket){
    console.log('new connection: '+socket.id)
    var conn = new Connection(socket)
    conn.once('ready', function(data) {
      if(!docs[data.document]) docs[data.document] = new Document(options.initialContent)
      docs[data.document].addConnection(conn)
      conn.emit('ready', data)
    })
  })
}