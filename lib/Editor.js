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

  this.retainSelection(['selStart', 'selEnd'], function(caret) {
    this.retainScrollView('#selStart', function() {
      var content = this.getContent()
      changeset = changeset.transformAgainst(caret) // we need to accomodate the insertion of the selection markers
      content = changeset.apply(content)
      this.setContent(content) // apply changes
    }.bind(this))
  }.bind(this))
  
  return this.getContent()
}

/**
 * A wrapper for retaining the current scroll view relative to a specific element
 * whilst manipulating the DOM
 *
 * @param selector - the jQuery selector for the anchor element
 * @param main - A function
 */
Editor.prototype.retainScrollView = function(selector, main) {
  var offset = $(selector).offset()
  var offsetTop = offset.top - $('body').scrollTop()
    , offsetLeft = offset.left - $('body').scrollLeft()
  
  main()
  
  var newoffset = $(selector).offset()
  if(!newoffset) return
  var newoffsetTop = newoffset.top - $('body').scrollTop()
    , newoffsetLeft = newoffset.left - $('body').scrollLeft()
  $('body').scrollTop( $('body').scrollTop() + (newoffsetTop - offsetTop) )
  $('body').scrollLeft( $('body').scrollLeft() + (newoffsetLeft - offsetLeft) )
}

/**
 * A wrapper for retaining the current selection whilst manipulating the DOM
 * @param ids - An array in which the first element
 * is the string used as the id of the start marker and the second as the id of the end marker
 * @param main - A function that accepts one argument `function (caret)`, where `caret` is
 * a changeset containing the insertions of the selection markers (you can use that to transform you changesets against it)
 */
Editor.prototype.retainSelection = function(ids, main) {
  var content = this.getContent()
    , markerStart = ids[0]
    , markerEnd = ids[1]
  var selection = window.getSelection()
    , range = selection.getRangeAt(0)

  // Insert some selection markers (dummy nodes) that will be used to remember the current selection
  var caret = new cs.text.Changeset(
    new cs.text.Insert(calcHtmlOffset(this.$editor[0], range.startContainer, range.startOffset), '<span id="'+markerStart+'"/>', 0),
    new cs.text.Insert(calcHtmlOffset(this.$editor[0], range.endContainer, range.endOffset), '<span id="'+markerEnd+'"/>', 0)
  )
  
  // apply selection markers
  content = caret.apply(content)
  console.log(content)
  this.setContent(content)
  
  // function should transform changesets against `caret`
  main(caret)

  // Detect position of selection markers and delete them afterwards
  var start = findRangePointSuccesssor($('#'+markerStart)[0], $('#'+markerEnd)[0])
    , end = findRangePointSuccesssor($('#'+markerEnd)[0], $('#'+markerStart)[0])

  $('#'+markerStart+',#'+markerEnd).remove()
  
  // restore selection after updating DOM
  range.setEnd(end.node, end.offset)
  range.setStart(start.node, start.offset)
}


// Assumes `node` is empty and represents a range point (together with the offset 0)
// and tries to find an alternative range point description (a DOM node and an offset)
// by examining the node's siblings while excluding `excludingNode` and `node`
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
    , str
    , dummyEl = document.createElement('div')

  // Visit container first
  if(n.outerHTML) offset += n.outerHTML.split('>')[0].length+1
  if(n.textContent) {
    dummyEl.textContent = n.textContent.substr(0, offset)
    offset = dummyEl.innerHTML.length
  }

  while ((parNode = n.parentNode) != root.parentElement) {
      if ((prevSib) = n.previousSibling)
      {
        n = prevSib;
        
        if(n.outerHTML) {
          str = n.outerHTML
        }else if(n.textContent) {
          // fix entities (textContent isn't entityencoded)
          dummyEl.textContent = n.textContent
          str = dummyEl.innerHTML
        }
        offset += str.length
      }
      else
      {
        n = parNode;
        
        if(parNode != root) {
          str = n.outerHTML.split('>')[0]+'>'
          // if the current element does not enclose the pointer node
          // we're free to count its closing tag -- contents are omitted intentionally!
          if($(container).parents().filter(n).length == 0) str += n.nodeName+'</>'
          offset += str.length
        }
      }
  }
  return offset
}