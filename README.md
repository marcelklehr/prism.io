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
  document: window.location.pathname
, element: $('.content') // Any contenteditable element or the body of an wysiwyg editor's iframe
})
```

## Todo
hah!, lots...

 * Make it more configurable / the guts more accessable and hackable
 * Wrap changesets in edits to dry up edit transformations
 * MESSAGE QUEUE! Once you start doing async stuff, you have multiple half-digested maessages -- bad thing. And a prefect race condition.
 * Authorization/Authentication
 * Investigate on webRTC's DataChannel (client-side peer-to-peer communication)
 * Otherwse make it scale without pain (for the admin, of course! This is gonna be an ordeal for the programmer...)

## Problems? Ideas? Inspiration?
Submit an [issue](http://github.com/marcelklehr/prism.io/issues). Really!

## License
MIT