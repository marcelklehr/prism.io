var Emitter = require('emitter')
  , Queue = require('./Queue')

function Connection (socket) {
  this.socket = socket
  this.queue = new Queue
  this.awaitingAck = false
  this.sent = false
  
  function sendPending() {
    if(this.awaitingAck) return
    if(!this.queue.length) return
    
    var ev = this.queue.shift()
    socket.emit.apply(socket, ev)
    
    if('edit' == ev[0]) {
      console.log('sending edit:', ev[1])
      this.sent = ev[1]
      this.awaitingAck = true
      
      setTimeout(function() {
        if(!this.awaitingAck) return
        this.queue.unshift(['edit', this.sent])
        this.awaitingAck = false
        console.log('resetting awaitingAck')
        sendPending.bind(this)
      }.bind(this), 5000)
    }
    if('ack' == ev[0]) console.log('sending ack:', ev[1])
  }
  this.queue.on('add', sendPending.bind(this))
  this.on('ack', sendPending.bind(this))
  this.interval = setInterval(sendPending.bind(this), 2000)
  
  
  socket.on('init', this.receiveInitialContent.bind(this))
  socket.on('ready', this.receiveReady.bind(this))
  socket.on('edit', this.receiveEdit.bind(this))
  socket.on('ack', this.receiveAck.bind(this))
  
  socket.on('connect', function() {
    this.emit('connect')
  }.bind(this))

  socket.on('disconnect', function() {
    this.emit('disconnect')
  }.bind(this))

}
module.exports = Connection
Emitter(Connection.prototype)

Connection.prototype.destroy = function() {
  clearInterval(this.interval)
  this.sent = this.awaitingAck = false
  this.socket.disconnect()
}

Connection.prototype.sendInitalContent = function(currentContent, latestEdit) {
  this.queue.pushEvent('init', currentContent, latestEdit)
}

Connection.prototype.sendReady = function(data) {
  this.socket.emit('ready', data)
}

Connection.prototype.sendEdit = function(edit) {
  this.queue.pushEvent('edit', edit)
}

Connection.prototype.sendAck = function(editId) {
  this.socket.emit('ack', editId) // unify things by just always using the socket directly here..
}

Connection.prototype.receiveInitialContent = function(content, latestEdit) {
  this.emit('init', content, latestEdit)
}

Connection.prototype.receiveReady = function(data) {
  // unnecessary: this.socket.join(data.document)
  this.emit('ready', data)
}

Connection.prototype.receiveEdit = function(edit) {
  if(edit.id == this.sent.id) this.receiveAck(edit.id) // If we get our sent edit back, that's as good as an ack..
  this.emit('edit', edit)
}

Connection.prototype.receiveAck = function(editId) {
  var edit = this.sent
  console.log('receiving ack for', editId)
  if(edit.id != editId)
    return console.warn('Got an ACK for an edit i didn\'t send.. Strange! --', editId, 'sent is ', edit)
  this.awaitingAck = false
  this.sent = false
  
  // in case the edit is still in queue for being resend
  if(this.queue[0] && this.queue[0][1] == edit) this.queue.shift()
  
  this.emit('ack', edit)
}