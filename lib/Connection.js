var Emitter = require('emitter')

function Connection (socket) {
  Emitter(this)

  this.socket = socket
  this.pendingEdits = []
  this.sentEdits = []
  Emitter(this.pendingEdits)
  this.pendingAck = false
  
  function sendPending() {
    if(this.pendingAck) return
    if(!this.pendingEdits.length) return
    
    var edit = this.pendingEdits.shift()
    socket.emit('edit', edit)
    console.log('sending edit:', edit)

    this.pendingAck = edit
  }
  this.pendingEdits.on('add', sendPending.bind(this))
  this.on('ack', sendPending.bind(this))
  setInterval(sendPending.bind(this), 2000)
  
  
  socket.on('init', this.receiveInitialContent.bind(this))
  socket.on('ready', this.receiveReady.bind(this))
  socket.on('edit', this.receiveEdit.bind(this))
  socket.on('ack', this.receiveAck.bind(this))
}
module.exports = Connection

Connection.prototype.sendInitalContent = function(currentContent, latestEdit) {
  this.socket.emit('init', currentContent, latestEdit)
}

Connection.prototype.sendReady = function() {
  this.socket.emit('ready')
}


Connection.prototype.sendEdit = function(edit) {
  if('undefined' != typeof process) {
    return this.socket.emit('edit', edit)
  }
  this.pendingEdits.push(edit)
  this.pendingEdits.emit('add')
}

Connection.prototype.sendAck = function(editId) {
  this.socket.emit('ack', editId)
}

Connection.prototype.receiveInitialContent = function(content, latestEdit) {
  this.emit('init', content, latestEdit)
}

Connection.prototype.receiveReady = function() {
  this.emit('ready')
}

Connection.prototype.receiveEdit = function(edit) {
  this.emit('edit', edit)
}

Connection.prototype.receiveAck = function(editId) {
  var edit = this.pendingAck
  this.pendingAck = false
  if(edit.id != editId)
    return console.warn('Got an ACK for an edit i didn\'t send.. Strange! --', editId)
  
  this.emit('ack', edit)
}