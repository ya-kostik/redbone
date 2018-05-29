# Redbone
Backend for your application. Inspired by Redux.
But you can use it with Vuex, or any Flux library.

You can use it with any transport you want, but by default Redbone has only socket.io support.

## Install

### npm
```
npm install redbone
```

### yarn
```
yarn add redbone
```

## Quick start with socket.io

### Server side
```js
//... io — is a socket.io server instance
const Redbone = require('redbone');
const SocketIOConnector = Redbone.connectors.SocketIO;

const connector = new SocketIOConnector(io);
const redbone = new Redbone(connector);

//Watch to client action
redbone.watch('@@server/user/GET', async function(client, action) {
  if (!action.user) throw new Error('User not found');
  //Your logic here, getUser — just example
  const user = await Model.getUser(action.user);
  if (!user) throw new Error('User not found');
  //dispatch action to client
  client.dispatch({ '@@user/current/SET', user });
});

redbone.watch('@@server/user/SET', async function(client, action) {
  if (!action.user) throw new Error('User is undefined');
  const user = await Model.setUser(action.user);
  client.dispatch({ type: '@@system/SUCCESS_SAVE', user });
})

redbone.catch((client, action, err) => {
  if (action.type === '@@server/user/GET') {
    if (err.message === 'User not found') {
      return client.dispatch({
        type: '@@system/SHOW_ERROR_MODAL',
        title: 'User not found'
      });
    }
  }
  client.dispatch({
    type: '@@system/SHOW_ERROR_MODAL',
    title: 'Server Error',
    err
  });
});

```

### Client side with Redux
After create your store, just add
```js
// io — your socket.io connection to server
// dispatch — your choisen event name, default is “dispatch”
// you can change it on the server side
// new SocketIOConnector(io, inEvent, outEvent)
// inEvent — event for input events — defaults is “dispatch”
// outEvent — event for output events — events for client  — defaults is inEvent value
io.on('dispatch', store.dispatch);
```
All `client.dispatch(action)` at redbone watcher will perform action to client

## Watchers

If you want process some of `action.type`, you can use `redbone.watch`:
```javascript
redbone.watch(TYPE, fn);
```
`TYPE` — is the `action.type`
`fn` — function to process this `TYPE`.
`fn` receive 2 params:
- `client` is a connection to client side, creates by connector
- `action` from client with `{ type: TYPE }` schema.


For quick load folder with watchers you can use `readWatchers(dir)` or `readWatchersSync(dir)`:

**./watchers/user.js**
```javascript
// Easy errors process
const HttpError = require('redbone/Errors/HttpError');
const db = require('../db');
async load(client, action) {
  if (!action.id) throw new HttpError(400, 'User is is not defined');
  const user = await db.User.findOne({ id: action.id });
  client.dispatch({ type: '@@client/user/SETUP', user });
}

module.exports = [
  { type: "@@server/user/LOAD", action: load }
];
```
**./socket.js**
```js
// ...
// scan all watchers directory and set watchers
redbone.readWatchersSync(path.join(__dirname, './watchers/'));
// ...
```

Maybe you want use your custom logic for setup several watchers? Ok, just use `processWatchers(watchers)` method

## Middlewares
Just use `use` method of Redbone instance =).
```js
redbone.use((client, action) => {
  if (!action.token) throw new HttpError(403, 'Invalid token');
});
```

If you want stop middleware, just `return false` from it:
```js
redbone.use((client, action) => {
  if (action.type === '@@server/CONSOLE_LOG') {
    console.info(action.log);
    // Stop middlewares and watchers
    return false;
  }
});
```

You want to throw Error? Just do it:
```js
const HttpError = require('redbone/Errors/HttpError');
redbone.use((client, action) => {
  if (!action.token) throw new HttpError(403, 'Your token is Invalid');
});
```
Errors from middlewares and watchers will be caught by a special function, which you can set as follows:
```js
redbone.catch((client, action, err) => {
  // ...your error logic here
});
```

## RRPC

RRPC — is Redbone's Remote Procedure Call

You can call any method of any object you want directly from a client.

### Add RPC to the Redbone on the server side

```js
// ...
const Redbone = require('redbone');
const RPC = Redbone.extensions.RPC;

const redbone = new Redbone(connector);
const rpc = new RPC();

redbone.extension(rpc);

// add mongoose models to the rpc
rpc.setLib('mongoose', mongoose.models);
```

### Call from client side with socket.io and default input event
```js
io.emit('dispatch', {
  type: '@@server/rpc/CALL',
  lib: 'mongoose',
  module: 'User',
  method: 'getUserAvararLink',
  arguments: userToken,
  backType: '@@client/user/SET_USER_PROFILE'
});
/**
 * Output example
 * {
 *   type: '@@client/user/SET_USER_PROFILE',
 *   payload: {
 *     avatar: 'http://example.com/user/134/avatar.jpg'
 *   }
 * }
 */
```
- `lib` — library in RPC
- `module` — field in library
- `method` — method of field
- `arguments` — the first argument of method
- `flat` — Boolean, if it is true, and arguments is an array, arguments will be send to method with spread operator (`...arguments`)
- `merge` — Boolean, if if is true, and the method of module return object — will assign result into the root of action, instead of payload field
- `backType` — type for back action, default is “`@@client/rpc/RETURN`”

### Publish/Subscribe

Some of your modules can be an instance of `EventEmitter`.
If you want to subscribe to some events, you can do it with following action:
```js
io.emit('dispatch', {
  type: '@@server/rpc/SUB',
  lib: 'mongoose',
  module: 'User',
  event: 'change_id-1',
  payload: userToken,
  backType: '@@client/user/SET_USER_PROFILE'
});
```

Now all `change_id-1` events will be dispatched to the client side with `backType`

If you want to unsubscribe, just use `@@server/rpc/UNSUB` type with `lib`, `module`, `event` fields.

All your listeners will be removed automaticaly, when client connection lost.

## Other documentation, and grammar fixes comming soon
