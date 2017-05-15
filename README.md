# redbone
Library for client → server → client redux dispatching

## Install
```
npm install --save redbone
```

## Using
### Server side
```js
//...
const redbone = require('redbone');
//...

//Watch to client action
redbone.watch('@@server/user/GET', function(socket, action, next) {
  if (!action.user_id) return next(new Error('User not found'));
  //Your logic here, getUser — just example
  getUser(action.user_id).then((user) => {
    if (!user) return next(new Error('User not found'));
    //dispatch action to client
    socket.dispatch({ '@@user/current/SET', user });
  }).catch(next);
});
//You can chain some of redbone methods
redbone.watch('@@server/user/SET', function(socket, action, next) {
  if (!action.user) return next(new Error('User is undefined'));
  setUser(action.user).then(() => socket.dispatch({ type: '@@system/SUCCESS_SAVE' )).catch(next);
}).catch((socket, err) => {
  socket.dispatch({ type: '@@system/SHOW_ERROR_MODAL', title: 'Server Error', err });
});

//io — your socket io server instance
redbone(io);
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
documentation comming soon
Look at server side example
