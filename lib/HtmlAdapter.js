﻿var cs = require('changesets')
  , Changeset = cs.text.Changeset

function HtmlAdapter(editor) {
  this.editor = editor

  // Avoid the &nbsp; hell
  // Thanks go to http://www.w3.org/html/wg/drafts/html/master/editing.html#best-practices-for-in-page-editors
  editor.style['white-space'] = 'pre-wrap'
}
module.exports = HtmlAdapter

HtmlAdapter.prototype.getContent = function() {
  return this.editor.innerHTML
}

HtmlAdapter.prototype.setContent = function(content) {
  this.editor = replaceHtml(this.editor, content)
}


HtmlAdapter.prototype.applyChangeset = function(changeset) {
  var err
  this.retainSelection(['selStart', 'selEnd'], function(caret) {
    this.retainScrollView('selStart', function() {
      var content = this.getContent()
      try {
        changeset = changeset.transformAgainst(caret) // we need to accomodate the insertion of selection markers
        content = changeset.apply(content)
        this.setContent(content) // apply changes
      }catch(e) {
        err = e
      }
    }.bind(this))
  }.bind(this))
  if(err) throw err
  return this.getContent()
}

/**
 * A wrapper for retaining the current scroll view relative to a specific element
 * whilst manipulating the DOM
 *
 * @param elementId - the id of the anchor element
 * @param main - A function
 */
HtmlAdapter.prototype.retainScrollView = function(elementId, main) {
  var offset, newoffset, node

  offset = getOffset(document.getElementById(elementId))
  var offsetTop = offset.top - window.scrollY
    , offsetLeft = offset.left - window.scrollY

  main()

  if(!(node = document.getElementById(elementId))) return console.warn('Aborting retainScrollView, because anchor element is lost.')

  newoffset = getOffset(node)
  var newoffsetTop = newoffset.top - window.scrollY
    , newoffsetLeft = newoffset.left - window.scrollX

  var scrollY = newoffsetTop - offsetTop
    , scrollX = newoffsetLeft - offsetLeft

  window.scroll(window.scrollX+scrollX, window.scrollY+scrollY)
  // in case we need to scroll another container some day
  // use node.{scrollTop,scrollLeft} += scrollY/X
  // -- do note, that if you want to use scrollTop
  // the window level, you must use <body> in chrome  and <html>
  // in firefox...
}

function getOffset(node) {
  var box = {top: 0, left: 0}
  if ( typeof node.getBoundingClientRect != 'undefined' )
    box = node.getBoundingClientRect()

  return {
    top: box.top + window.pageYOffset - document.documentElement.clientTop,
    left: box.left + window.pageXOffset - document.documentElement.clientLeft
  }
}

/**
 * A wrapper for retaining the current selection whilst manipulating the DOM
 * @param ids - An array in which the first element
 * is the string used as the id of the start marker and the second as the id of the end marker
 * @param main - A function that accepts one argument `function (caret)`, where `caret` is
 * a changeset containing the insertions of the selection markers (you can use that to transform you changesets against it)
 */
HtmlAdapter.prototype.retainSelection = function(ids, main) {// quite time consuming
  var content = this.getContent()
    , markerStart = ids[0]
    , markerEnd = ids[1]
  var selection = window.getSelection()
    , range = selection.getRangeAt(0)

  // Insert some selection markers (dummy nodes) that will be used to remember the current selection
  var caret = new cs.text.Changeset(
    new cs.text.Insert(content.length, calcHtmlOffset(this.editor, range.startContainer, range.startOffset), '<span id="'+markerStart+'"></span>', 0),
    new cs.text.Insert(content.length, calcHtmlOffset(this.editor, range.endContainer, range.endOffset), '<span id="'+markerEnd+'"></span>', 0)
  )
  
  // apply selection markers
  content = caret.apply(content)
  //console.log(content)
  this.setContent(content)
  
  // function should transform changesets against `caret`
  main(caret)

  // Detect position of selection markers and delete them afterwards
  var start = findRangePointSuccesssor(document.querySelector('#'+markerStart), document.querySelector('#'+markerEnd))
    , end = findRangePointSuccesssor(document.querySelector('#'+markerEnd), document.querySelector('#'+markerStart))

  var startMarker = document.querySelector('#'+markerStart)
  var endMarker = document.querySelector('#'+markerEnd)
  startMarker.parentNode.removeChild( startMarker );
  endMarker.parentNode.removeChild( endMarker );
  
  // restore selection after updating DOM
  selection.removeAllRanges()
  var newRange = document.createRange() // simply overwriting the old range doesn't work in webkit!
  newRange.setEnd(end.node, end.offset)
  newRange.setStart(start.node, start.offset)
  selection.addRange(newRange)
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
          str = n.outerHTML? n.outerHTML.split('>')[0]+'>' : n.textContent
          // if the current element does not enclose the pointer node
          // we're free to count its closing tag -- contents are omitted intentionally!
          if(!n.contains(container) && n.outerHTML) str += n.nodeName+'</>'
          offset += str.length
        }
      }
  }
  return offset
}

// A faster way  to set innerHTML of an element
// http://blog.stevenlevithan.com/archives/faster-than-innerhtml
function replaceHtml(el, html) {
	var oldEl = typeof el === "string" ? document.getElementById(el) : el;
	/*@cc_on // Pure innerHTML is slightly faster in IE
		oldEl.innerHTML = html;
		return oldEl;
	@*/
	var newEl = oldEl.cloneNode(false);
	newEl.innerHTML = html;
	oldEl.parentNode.replaceChild(newEl, oldEl);
	/* Since we just removed the old element from the DOM, return a reference
	to the new element, which can be used to restore variable references. */
	return newEl;
};