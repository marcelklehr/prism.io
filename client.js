var CollabClient = require('./lib/CollabClient')
  , Connection = require('./lib/Connection')
  , Editor = require('./lib/Editor')

// KICK ASS!
var socket = io.connect('http://localhost')
  , connection = new Connection(socket)
  , editor = new Editor($('.content'))
  , adapter = new CollabClient(editor, connection)