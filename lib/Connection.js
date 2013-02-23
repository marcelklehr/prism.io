var Emitter = require('emitter')
  , Queue = require('./Queue')

function Connection (socket) {
  this.socket = socket
  this.queue = new Queue
  this.pendingAck = false
  
  function sendPending() {
    if(this.pendingAck) return
    if(!this.queue.length) return
    
    var ev = this.queue.shift()
    socket.emit.apply(socket, ev)
    
    if('edit' == ev[0]) {
      console.log('sending edit:', ev[1])
      this.pendingAck = ev[1]
    }
    if('ack' == ev[0]) console.log('sending ack:', ev[1])
  }
  this.queue.on('add', sendPending.bind(this))
  this.on('ack', sendPending.bind(this))
  setInterval(sendPending.bind(this), 2000)
  
  
  socket.on('init', this.receiveInitialContent.bind(this))
  socket.on('ready', this.receiveReady.bind(this))
  socket.on('edit', this.receiveEdit.bind(this))
  socket.on('ack', this.receiveAck.bind(this))
}
module.exports = Connection
Emitter(Connection.prototype)

Connection.prototype.sendInitalContent = function(currentContent, latestEdit) {
  this.queue.pushEvent('init', currentContent, latestEdit)
}

Connection.prototype.sendReady = function() {
  this.queue.pushEvent('ready')
}

Connection.prototype.sendEdit = function(edit) {
  this.queue.pushEvent('edit', edit)
}

Connection.prototype.sendAck = function(editId) {
  this.queue.pushEvent('ack', editId)
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