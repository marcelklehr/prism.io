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
  if(~this.connections.indexOf(connection)) return

  this.connections.push(connection)

  connection.on('edit', function(edit) {
    this.pending.push({conn: connection, edit: edit})
    this.pending.emit('add')
  }.bind(this))

  connection.on('ready', function(data) {
    if(data.latest && this.history.remembers(data.latest)) {
      // this is a reconnect
      console.log('READY: Sending missed edits after', data.latest)
      this.history.getAllAfter(data.latest).forEach(function(edit) {
        connection.sendEdit(edit)
      })
      return
    }
    connection.sendInitalContent(this.content, this.history.latest())
  }.bind(this))
  
  connection.once('disconnect', function() {
    this.connections.splice(this.connections.indexOf(connection), 1)
    connection.destroy()
  }.bind(this))
}

Document.prototype.dispatchEdit = function(oriConnection, edit) {
  console.log('receiving edit', edit)

  if(this.history.remembers(edit.id)) return oriConnection.sendAck(edit.id);// sends ack directly to avoid locking ourselves in!
  if (!this.history.remembers(edit.parent)) {
    console.warn('Edit has unknown parent, drop it!') // Bad reaction, we should tell the client to undo or sumthin..
    return;
  }
  
  var change = Changeset.unpack(edit.diff)
  console.log('change:', change.inspect())
  
  // Transform against all edits that have happened in the meantime
  
  /*if(oriConnection.sent && (!~this.history.getAllAfter(edit.parent).indexOf(oriConnection.sent) && edit.parent != oriConnection.sent.id)) {
    // Only transfrom, if it's not one of this edit's ancestors
    console.log('transforming incoming against sent edit:', Changeset.unpack(oriConnection.sent.diff).inspect(), change.inspect(), '->', change.transformAgainst(Changeset.unpack(oriConnection.sent.diff)).inspect())
    change = change.transformAgainst(Changeset.unpack(oriConnection.sent.diff))
    edit.parent = oriConnection.sent.id
  }
  
  oriConnection.queue.getEvents('edit').forEach(function(newEdit) {
    // Only transfrom, if it's not one of this edit's ancestors
    if(~this.history.getAllAfter(edit.parent).indexOf(oriConnection.sent) || edit.parent == newEdit.id) return
    
    console.log('transforming incoming against unsent edits:', Changeset.unpack(newEdit.diff).inspect(), change.inspect(), '->', change.transformAgainst(Changeset.unpack(newEdit.diff)).inspect())
    change = change.transformAgainst(Changeset.unpack(newEdit.diff))
    edit.parent = newEdit.id // update ancestor
  }.bind(this))*/
  
  // ISN'T THE ABOVE ACTUALLY THE SAME AS BELOW?
  
  // Transform against possibly missed edits from history
  this.history.getAllAfter(edit.parent).forEach(function(oldEdit) {
    var historicalCs = Changeset.unpack(oldEdit.diff)
    console.log('transforming against history:', historicalCs.inspect(), change.inspect(), change.transformAgainst(historicalCs))
    change = change.transformAgainst(historicalCs)
    edit.parent = oldEdit.id // update ancestor
  })

  try {
    this.content = change.apply(this.content)
  }catch(e) {
    console.warn('Applying edit "'+edit.id+'" failed:', e)
    // Mh. we better tell them...
    // oriConnection.destroy()
    return
  }
  console.log(this.content)
  edit.diff = change.pack()
  this.history.pushEdit(edit)
  oriConnection.sendAck(edit.id);
  this.connections.filter(function(c) {return c != oriConnection}).forEach(function(conn) {
    conn.sendEdit(edit)
  })
}