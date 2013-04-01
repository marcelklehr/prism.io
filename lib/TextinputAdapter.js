var cs = require('changesets')
  , Changeset = cs.text.Changeset

function TextinputAdapter(textarea) {
  this.textarea = textarea

  // Avoid the &nbsp; hell
  // Thanks go to http://www.w3.org/html/wg/drafts/html/master/editing.html#best-practices-for-in-page-editors
  textarea.style['white-space'] = 'pre-wrap'
}
module.exports = TextinputAdapter

TextinputAdapter.prototype.getContent = function() {
  return this.textarea.value
}

TextinputAdapter.prototype.setContent = function(content) {
  this.textarea.value = content
}


TextinputAdapter.prototype.applyChangeset = function(changeset) {
  var err
  this.retainSelection(function() {
    var content = this.getContent()
    try {
      content = changeset.apply(content)
      this.setContent(content) // apply changes
    }catch(e) {
      err = e
    }
    return changeset
  }.bind(this))
  if(err) throw err
  return this.getContent()
}

/* *
 * A wrapper for retaining the current scroll view relative to a specific element
 * whilst manipulating the DOM
 *
 * @param selector - the jQuery selector for the anchor element
 * @param main - A function
 *
TextinputAdapter.prototype.retainScrollView = function(selector, main) {
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
}*/

/**
 * A wrapper for retaining the current selection whilst manipulating the DOM
 * @param main - A function that returns a changeset that was applied to the document
 */
TextinputAdapter.prototype.retainSelection = function(main) {
  var content = this.getContent()

  // Construct a changeset with the current selection start and end positions
  var caret = new cs.text.Changeset(
    new cs.text.Insert(content.length, this.textarea.selectionStart, '*', 0),
    new cs.text.Insert(content.length, this.textarea.selectionEnd, '|', 0)
  )
  
  // function should return a changeset
  var change = main()
  if(!change) throw new Error('Wrapped function should return applied changeset')


  caret = caret.transformAgainst(change)

  // restore selection after updating contents
  this.textarea.selectionStart = caret[0].pos
  this.textarea.selectionEnd = caret[1].pos
}