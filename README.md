# Redbone
Socket backend for your Redux application

## Install
```
npm install --save redbone
```

## Quick example
### Server side
```js
//...
const Redbone = require('redbone');

//io — your socket io server instance
const redbone = new Redbone(io);

//Watch to client action
redbone.watch('@@server/user/GET', async function(socket, action) {
  if (!action.user) throw new Error('User not found');
  //Your logic here, getUser — just example
  const user = await Model.getUser(action.user);
  if (!user) throw new Error('User not found');
  //dispatch action to client
  socket.dispatch({ '@@user/current/SET', user });
});

redbone.watch('@@server/user/SET', async function(socket, action) {
  if (!action.user) throw new Error('User is undefined');
  const user = await Model.setUser(action.user);
  socket.dispatch({ type: '@@system/SUCCESS_SAVE', user });
})

redbone.catch((socket, action, err) => {
  if (action.type === '@@server/user/GET') {
    if (err.message === 'User not found') {
      return socket.dispatch({
        type: '@@system/SHOW_ERROR_MODAL',
        title: 'User not found'
      });
    }
  }
  socket.dispatch({
    type: '@@system/SHOW_ERROR_MODAL',
    title: 'Server Error',
    err
  });
});

```

### Client side
After create your store, just add
```js
//io — your socket.io connection to server
io.on('dispatch', store.dispatch);
```
All `socket.dispatch(action)` at redbone watcher will perform action to client

Optionaly, you can add special middleware to redux for client → server dispatching
```js
import serverDispatchMiddleware from 'redbone/client/getServerDispatchMiddleware';
//...
//io — your socket.io connection to server
middlewares.unshift(serverDispatchMiddleware(io));
//...
const createStoreWithMiddlewares = compose(applyMiddleware(...middlewares))(createStore);
const store = createStoreWithMiddlewares(reducer);
```

`serverDispatchMiddleware` takes options as second parameter. If you want to pass server-side actions to store set `next` property as `true`.

If you want to filter actions, set array of types to `exclude` or `include` property:

```js
middlewares.unshift(serverDispatchMiddleware(io, {
  next: true,
  exclude: [TYPES.EXCLUDED_TYPE, TYPES.EXCLUDED_TYPE_TOO], // This types will ignored
  include: [TYPES.INCLUDED_TYPE] // This types will passed
}));
```

If you set `next` as `false`, filters **will not work**!

## Watchers

If you want process some of `action.type`, you can use `redbone.watch`:
```javascript
redbone.watch(TYPE, fn);
```
`TYPE` — is the `action.type`
`fn` — function to process this `TYPE`.
`fn` receive 2 params:
- `socket` — [syntetic Socket](https://github.com/ya-kostik/redbone/blob/v2.0.0/lib/classes/Socket.js) instance
- `action` from client with `{ type: TYPE }` schema.


For quick load folder with watchers you can use `readWatchers(dir)` or `readWatchersSync(dir)`:

**./watchers/user.js**
```javascript
// Easy errors process
const HttpError = require('redbone/Errors/HttpError');
const db = require('../db');
async load(socket, action) {
  if (!action.id) throw new HttpError(400, 'User is is not defined');
  const user = await db.User.findOne({ id: action.id });
  socket.dispatch({ type: '@@client/user/SETUP', user });
}

module.exports = [
  { type: "@@server/user/LOAD", action: load }
];
```
**./socket.js**
```javascript
// ...
// scan all watchers directory and set watchers
redbone.readWatchersSync(path.join(__dirname, './watchers/'));
// ...
```

Maybe you want use your custom logic for setup several watchers? Ok, just use [`processWatchers(watchers)` method](https://github.com/ya-kostik/redbone/blob/v2.0.0/lib/classes/Redbone.js#L114)

## Middlewares
Just use `use` method of Redbone instance =).
```javascript
redbone.use((socket, action) => {
  if (!action.token) throw new HttpError(403, 'Invalid token');
});
```

If you want stop middleware, just `return false` from it:
```javascript
redbone.use((socket, action) => {
  if (action.type === '@@server/CONSOLE_LOG') {
    console.info(action.log);
    // Stop middlewares and watchers process
    return false;
  }
});
```
