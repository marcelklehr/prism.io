var Emitter = require('emitter')

function Queue () {
  Emitter(this)
}
Queue.prototype = []
Queue.prototype.constructor = Queue
module.exports = Queue

Queue.prototype.pushEvent = function() {
  this.push(arguments)
  this.emit('add')
}

Queue.prototype.getEvents = function(type) {
  return this
    .filter(function(ev) { return  ev[0] == type })
    .map(function(ev) { return ev[1] })
}