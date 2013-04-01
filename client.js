var CollabClient = require('./lib/CollabClient')
  , Connection = require('./lib/Connection')
  , Emitter = require('emitter')

exports.HtmlAdapter = require('./lib/HtmlAdapter')
exports.TextinputAdapter = require('./lib/TextinputAdapter')

// KICK ASS!
exports.connect = function(options) {
  var options =
  { editor: options.editor || null // compulsory
  , server: options.server || '//'+window.location.hostname+':'+window.location.port
  , document: options.document || null // compulsory
  }
  for(var prop in options) if (!options[prop]) throw new Error('"'+prop+'" option is not set')
  
  var socket = io.connect(options.server, { 'reconnection limit': 5000, 'max reconnection attempts': Infinity }).of('prism.io')
 
  var connection = new Connection(socket)
  var client = new CollabClient(options.document, options.editor, connection)
  
  return connection
}