var History = require('./History')
  , utils = require('./utils')
  , cs = require('changesets')
  , Changeset = cs.text.Changeset

// The Bridge between the connection and the editor
function CollabClient(document, editorAdapter, connection) {
  this.init = false
  this.shadowCopy = ''
  this.history = new History
  this.document = document
  this.editor = editorAdapter
  this.connection = connection
  this.accessory = Math.round(Math.random()*10000)
  
  connection.on('edit', this.dispatchForeignEdit.bind(this))

  connection.on('ack', function(edit) {
    edit.parent = this.history.latest().id
    this.history.pushEdit(edit)
  }.bind(this))

  connection.on('init', function(content, initalEdit) {
    this.editor.setContent(content)
    this.shadowCopy = content
    this.history.reset()
    this.history.pushEdit(initalEdit)
    this.connection.resetBuffer()
    this.init = true
  }.bind(this))

  connection.on('connect', function() {
    console.log('!connect')
    var latest = this.history.latest()? this.history.latest().id : null
    connection.sendReady({document: document, latest: latest})
  }.bind(this))

  /*connection.on('reconnect', function() {
    console.log('!reconnect')
    var latest = this.history.latest()? this.history.latest().id : null
    connection.sendReady({document: document, latest: latest})
  }.bind(this))*/
  
  //connection.sendReady({document: document})
  
  setInterval(this.dispatchLocalChange.bind(this), 200)
}
module.exports = CollabClient

CollabClient.prototype.dispatchForeignEdit = function(edit) {// quite time consuming
  // Catch any potential changes that may have happened in the meantime
  this.dispatchLocalChange()

  console.log('receiving edit', edit)
  //console.log('history', this.history.history)
  //console.log('pending', this.connection.queue.slice())

  if(this.history.remembers(edit.id)) return this.connection.sendAck(edit.id);
  if (!this.history.remembers(edit.parent)) {
    // At this point, we're lost. Reset everything now..
    console.warn('Edit has unknown parent, drop it and reset everything!')
    this.connection.sendReady({document: this.document})
    return;
  }
  
  
  var incomingCs = Changeset.unpack(edit.diff)
  console.log('incoming cs:', incomingCs.inspect())

  /* WE DON'T NEED TO TRANSFROM AGAINST HISTORY,
     CAUSE THE SERVER GOT US COVERED
  console.log('missed edits:', this.history.getAllAfter(edit.parent))
  // transform incoming against history
  this.history.getAllAfter(edit.parent).forEach(function(historicalEdit, i) {
    var historicalCs = Changeset.unpack(historicalEdit.diff)
    console.log('transforming pending against history:', incomingCs.inspect(), historicalCs.inspect(), '->', incomingCs.transformAgainst(historicalCs).inspect())

    incomingCs = incomingCs.transformAgainst(historicalCs)
    edit.diff = incomingCs.pack()
    edit.parent = historicalEdit.id
  }.bind(this))
  */

  this.history.pushEdit(edit)

  // transform incoming against a possible sent edit that's awaiting an ack
  if(this.connection.sent) {
    var sentCs = Changeset.unpack(this.connection.sent.diff)
    console.log('transform new against sent: ', sentCs.inspect(), incomingCs.inspect(), '->', incomingCs.transformAgainst(sentCs).inspect())
    incomingCs = incomingCs.transformAgainst(sentCs)
  }

  var incomingClone = incomingCs.transformAgainst(new Changeset)// clone the changeset for use in transforming pending against incoming

  // transform new against pending
  this.connection.queue.getEvents('edit').forEach(function(pendingEdit) {
    var pendingCs = Changeset.unpack(pendingEdit.diff)
    console.log('transforming new against pending:', pendingCs.inspect(), incomingCs.inspect(), '->', incomingCs.transformAgainst(pendingCs).inspect())

    incomingCs = incomingCs.transformAgainst(pendingCs)
  }.bind(this))

  // Transform unsent local edits against the new edit
  this.connection.queue.getEvents('edit').forEach(function(pendingEdit, i) {
    var pendingCs = Changeset.unpack(pendingEdit.diff)
    console.log('transforming pending against incoming:', incomingClone.inspect(), pendingCs.inspect(), '->', pendingCs.transformAgainst(incomingClone).inspect())

    pendingEdit.diff = pendingCs.transformAgainst(incomingClone).pack()
    if(0 == i && !this.connection.awaitingAck) pendingEdit.parent = edit.id
    incomingClone = incomingClone.transformAgainst(pendingCs)
  }.bind(this))

  try {
    this.shadowCopy = this.editor.applyChangeset(incomingCs)
  }catch(e) {
    this.connection.destroy()
    throw e
    // better tell the user here... like emitting an error event or sth
  }
  this.connection.sendAck(edit.id) // sends ack directly to avoid locking ourself in
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
  var latestEdit, i=0
    , pending = this.connection.queue.getEvents('edit');
  if(pending.length) latestEdit = pending[pending.length-1] 
  if(!latestEdit) latestEdit = this.connection.sent
  if(!latestEdit) latestEdit = this.history.latest()
  return { id: utils.randString(), parent: latestEdit.id, diff: changeset.pack() }
}
