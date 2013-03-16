# prism.io
Share and edit documents in real-time.

`npm install prism.io` and `component install marcelklehr/prism.io` (I intend to add a plain, browserified version)

## Server

```js
var server = require('http').createServer(app)
  , prism = require('prism.io')(server)

server.listen(80)
```

## Client

```js
var prism = require('prism.io')

prism.connect({
  document: window.location.pathname // or something else
, editor: new prism.HtmlAdapter(document.querySelector('.content')) // Any contenteditable element or the body of an wysiwyg editor's iframe
})
```

## prism.connect(options)
Possible options are:

 * `editor`: An editor adapter
 * `server`: The server address. Default: `'http://localhost'`
 * `document`: A string containing the identifier of the document to access

# Adapters

## Class: prism.HtmlAdapter(element)
Takes any block and inline html element except for inputs.

## Class: prism.TextinputAdapter(element)
Takes an input element like a `<textarea>` or an `<input type="text">`.

## Todo
hah!, lots...

 * Wrap changesets in edits to dry up edit transformations
 * MESSAGE QUEUE! Once you start doing async stuff, you have multiple half-digested maessages -- bad thing. And a prefect race condition.
 * Authorization/Authentication
 * Investigate on webRTC's DataChannel (client-side peer-to-peer communication)
 * Otherwse make it scale without pain (for the admin, of course! This is gonna be an ordeal for the programmer...)

## Problems? Ideas? Inspiration?
Submit an [issue](http://github.com/marcelklehr/prism.io/issues). Really!

## License
MIT