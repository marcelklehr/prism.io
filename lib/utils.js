exports.randString = function randString() {
  var str = ''
  while (str.length < 9) {
    str += (Math.random()*100).toString(36)
  }
  return str
}