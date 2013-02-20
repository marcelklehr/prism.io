var utils = require('./utils')
  , History = require('./History')
  , Emitter = require('emitter')
  , cs = require('changesets')
  , Changeset = cs.text.Changeset
  
function Document(initalContent) {
  this.history = new History
  this.connections = []
  this.pending = []
  Emitter(this.pending)
  
  this.pending.on('add', function() {
    while(this.pending.length) {
      var edit = this.pending.shift()
      this.dispatchEdit(edit.conn, edit.edit)
    }
  }.bind(this))
  
  this.content = initalContent
  var initialEdit = { id: utils.randString(), diff: cs.text.constructChangeset('', initalContent).pack() } // better use a real edit...
  this.history.pushEdit(initialEdit)
}
module.exports = Document

Document.prototype.addConnection = function(connection) {
  this.connections.push(connection)
  connection.on('edit', function(edit) {
    this.pending.push({conn: connection, edit: edit})
    this.pending.emit('add')
  }.bind(this))
  connection.on('ready', function() {
    connection.sendInitalContent(this.content, this.history.latest())
  }.bind(this))
}

Document.prototype.dispatchEdit = function(oriConnection, edit) {
  console.log('receiving edit', edit)
  if(this.history.remembers(edit.id)) return oriConnection.sendAck(edit.id);
  if (!this.history.remembers(edit.parent)) {
    console.warn('Edit has unknown parent, drop it!') // Bad reaction, we should tell the client to undo or sumthin..
    return;
  }
  
  var change = Changeset.unpack(edit.diff)
  
  // Transform against all edits that have happened in the meantime
  this.history.getAllAfter(edit.parent).forEach(function(oldEdit) {
    console.log('transforming against history:', change.inspect(), Changeset.unpack(oldEdit.diff).inspect())
    change = change.transformAgainst(Changeset.unpack(oldEdit.diff))
    edit.parent = oldEdit.id // update ancestor
  })
  try {
    this.content = change.apply(this.content)
  }catch(e) {
    console.warn('Applying edit "'+edit.id+'" failed:', e)
    // Mh. we better tell them...
    return
  }
  console.log(this.content)
  edit.diff = change.pack()
  this.history.pushEdit(edit)
  oriConnection.sendAck(edit.id)
  this.connections.filter(function(c) {return c != oriConnection}).forEach(function(conn) {
    conn.sendEdit(edit)
  })
}