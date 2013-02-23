var History = require('./History')
  , utils = require('./utils')
  , cs = require('changesets')
  , Changeset = cs.text.Changeset

// The Bridge between the connection and the editor
function CollabClient(editor, connection) {
  this.init = false
  this.shadowCopy = ''
  this.history = new History
  this.editor = editor
  this.connection = connection
  this.accessory = Math.round(Math.random()*10000)
  
  connection.on('edit', this.dispatchForeignEdit.bind(this))
  connection.on('ack', function(edit) {
    edit.parent = this.history.latest().id
    this.history.pushEdit(edit)
  }.bind(this))
  connection.on('init', function(content, initalEdit) {
    editor.setContent(content)
    this.shadowCopy = content
    this.history.reset()
    this.history.pushEdit(initalEdit)
    this.init = true
  }.bind(this))

  connection.on('connect', function() {
    if (this.history.latest()) return connection.sendReady(this.history.latest())
    connection.sendReady()
  }.bind(this))
  
  setInterval(this.dispatchLocalChange.bind(this), 200)
  connection.sendReady()
}
module.exports = CollabClient

CollabClient.prototype.dispatchForeignEdit = function(edit) {
  // Catch any possible changes that may have happened in the meantime
  this.dispatchLocalChange()
  
  //console.log('receiving edit', edit)
  if(this.history.remembers(edit.id)) return this.connection.sendAck(edit.id);
  if (!this.history.remembers(edit.parent)) {
    console.warn('Edit has unknown parent, drop it!') // Bad reaction, we should probably reset everything here..
    return;
  }
  
  
  var incomingCs = Changeset.unpack(edit.diff)
  console.log('incoming cs:', incomingCs.inspect())
  
  this.history.getAllAfter(edit.parent).forEach(function(oldEdit) {
    console.log('transforming against history:', incomingCs.inspect(), Changeset.unpack(oldEdit.diff).inspect())
    incomingCs = incomingCs.transformAgainst(Changeset.unpack(oldEdit.diff))
    edit.diff = incomingCs.pack()
    edit.parent = oldEdit.id // update ancestor
  })
  
  this.history.pushEdit(edit)

  // transform incoming against a possible send edit
  if(this.connection.pendingAck) incomingCs = incomingCs.transformAgainst(Changeset.unpack(this.connection.pendingAck.diff))
  
  // transform new against pending
  var changes = incomingCs.transformAgainst(new Changeset)
  this.connection.queue.getEvents('edit').forEach(function(pendingEdit) {
    var cs = Changeset.unpack(pendingEdit.diff)
    console.log('transforming new against pending:', cs.inspect(), changes.inspect(), '->', changes.transformAgainst(cs).inspect())

    // new against pending
    changes = changes.transformAgainst(cs)
  }.bind(this))
  
  // Transform unsent local edits against the new edit
  this.connection.queue.getEvents('edit').forEach(function(pendingEdit, i) {
    var cs = Changeset.unpack(pendingEdit.diff)
    console.log('transforming pending against incoming:', incomingCs.inspect(), cs.inspect(), '->', cs.transformAgainst(incomingCs).inspect())

    // pending against incoming
    pendingEdit.diff = cs.transformAgainst(incomingCs).pack()
    if(0 == i && !this.connection.pendingAck) pendingEdit.parent = edit.id
    incomingCs = incomingCs.transformAgainst(cs)
  }.bind(this))
  
  this.shadowCopy = this.editor.applyChangeset(changes)
  this.connection.sendAck(edit.id)
}

CollabClient.prototype.dispatchLocalChange = function() {
  if(!this.init) return
  var newcontent = this.editor.getContent()
  var change = cs.text.constructChangeset(this.shadowCopy, newcontent, this.accessory)
  if(change.length == 0) return

  this.shadowCopy = newcontent
  this.connection.sendEdit(this.createEdit(change))
}

CollabClient.prototype.createEdit = function(changeset) {
  var latestEdit, i=0;
  var pending = this.connection.queue.getEvents('edit')
  console.log(pending)
  if(pending.length) latestEdit = pending[pending.length-1]
  if(!latestEdit) latestEdit = this.connection.pendingAck
  if(!latestEdit) latestEdit = this.history.latest()
  return { id: utils.randString(), parent: latestEdit.id, diff: changeset.pack() }
}
