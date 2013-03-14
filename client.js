var CollabClient = require('./lib/CollabClient')
  , Connection = require('./lib/Connection')
  , Editor = require('./lib/Editor')
  , Emitter = require('emitter')

// KICK ASS!
exports.connect = function(options) {
  var options =
  { element: options.element || null // compulsory
  , server: options.server || 'http://localhost'
  , document: options.document || null // compulsory
  }
  for(var prop in options) if (!options[prop]) throw new Error('"'+prop+'" option is not set')
  
  var socket = io.connect(options.server, { 'reconnection limit': 5000, 'max reconnection attempts': Infinity }).of('prism.io')
 
  var connection = new Connection(socket)
    , editor = new Editor(options.element)
  var client = new CollabClient(options.document, editor, connection)
  
  return connection
}