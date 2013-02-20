var cs = require('changesets')
  , Changeset = cs.text.Changeset

function Editor($editor) {
  this.$editor = $editor
  
  // Avoid the &nbsp; hell
  // Thanks go to http://www.w3.org/html/wg/drafts/html/master/editing.html#best-practices-for-in-page-editors
  $editor.css({'white-space':'pre-wrap'})
}
module.exports = Editor

Editor.prototype.getContent = function() {
  return this.$editor.html()
}

Editor.prototype.setContent = function(content) {
  this.$editor.html(content)
}


Editor.prototype.applyChangeset = function(changeset) {
  var content = this.getContent()
  var selection = window.getSelection()
    , range = selection.getRangeAt(0)

  // Insert some selection markers (dummy nodes) that will be used to remember the current selection
  var caret = new cs.text.Changeset(
    new cs.text.Insert(calcHtmlOffset(this.$editor[0], range.startContainer, range.startOffset), '<span id="selStart"/>', 0),
    new cs.text.Insert(calcHtmlOffset(this.$editor[0], range.endContainer, range.endOffset), '<span id="selEnd"/>', 0)
  )
  content = caret.apply(content)
  this.setContent(content) // apply selection markers
  changeset = changeset.transformAgainst(caret) // ...and shift the new changes accoringly
  content = changeset.apply(content)

  var offset = $('#selStart').offset()
    , offsetTop = offset.top - $('body').scrollTop()
    , offsetLeft = offset.left - $('body').scrollLeft()
  this.setContent(content) // apply changes              // TODO: TuRN AlL tHOsE wRaPppERs iNtO MEthOdS
  var newoffset = $('#selStart').offset()
    , newoffsetTop = newoffset.top - $('body').scrollTop()
    , newoffsetLeft = newoffset.left - $('body').scrollLeft()
  $('body').scrollTop($('body').scrollTop()+(newoffsetTop - offsetTop))
  $('body').scrollLeft($('body').scrollLeft()+(newoffsetLeft - offsetLeft))
  
  // Detect position of selection markers and delete them
  var start = findRangePointSuccesssor($('#selStart')[0], $('#selEnd')[0])
    , end = findRangePointSuccesssor($('#selEnd')[0], $('#selStart')[0])
  $('#selStart,#selEnd').remove()
  
  // restore selection after updating DOM
  range.setEnd(end.node, end.offset)
  range.setStart(start.node, start.offset)
  
  return this.getContent()
}

// Assumes node is empty and represents a range point (together with the offset 0)
// and tries to find an alternative range point description (node and offset)
// by examining the node's siblings while excluding excludingNode and the current node
function findRangePointSuccesssor(node, excludingNode) {
  var n = node, offset=0
  
  // look ahead for suitable siblings
  if(n.nextSibling) n = n.nextSibling
  while(n === excludingNode && n.nextSibling) n = n.nextSibling

  if(n === excludingNode || n === node) {
    n = node
    // look behind for suitable siblings
    if(n.previousSibling) n = n.previousSibling
    while(n.previousSibling === excludingNode && n.previousSibling) n = n.previousSibling
    // use parent if unsuccessful
    if(n === excludingNode || n === node) return {node: node.parentNode, offset: 0}
    
    // use the deepest node
    while(n.childNodes.length > 0) n = n.lastChild
    offset = n.textContent.length || n.innerHTML.length
  }else {
    // use the deepest node
    while(n.childNodes.length > 0) n = n.firstChild
  }
  return {node: n, offset: offset}
}

// Calculates the offset of a range point defined
// by [container:offset] within root.textContent
/*function calcTextOffset(root, container, offset) {
  var parNode, prevSib
    , n = container
  while ((parNode = n.parentNode) != root.parentElement) {
      if ((prevSib = n.previousSibling))
      {
        n = prevSib;
        var str = n.textContent;
        offset += str.length
      }
      else
      {
        n = parNode;
      }
  }
  return offset
}*/

// Calculates the offset of a range point defined
// by [container:offset] within root.innerHTML
function calcHtmlOffset(root, container, offset) {
  var parNode, prevSib
    , n = container
  if(n.outerHTML) offset += n.outerHTML.split('>')[0].length+1
  while ((parNode = n.parentNode) != root.parentElement) {
      if ((prevSib = n.previousSibling))
      {
        n = prevSib;
        var str = n.outerHTML || n.nodeValue;
        offset += str.length
      }
      else
      {
        n = parNode;
        
        if(parNode != root) {
          str = n.outerHTML.split('>')[0]+'>'
          // if the current element does not enclose the pointer node
          // we're free to count its closing tag
          if($(container).parents().filter(n).length == 0) str += n.nodeName+'</>'
          offset += str.length
        }
      }
  }
  return offset
}