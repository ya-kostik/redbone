# redbone
Library for client->server->client redux dispatching

##Install
```
npm install --save redbone
```

##Using
###Server side
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
    socket.dispatch({ '@@user/current/SET', user });
  }).catch(next);
  //You can chain all redbone methods
}).watch('@@server/user/SET', function(socket, action, next) {
  if (!action.user) return next(new Error('User is undefined'));
  setUser(action.user).then(() => socket.dispatch({ type: '@@system/SUCCESS_SAVE' )).catch(next);
}).catch((socket, err) => {
  socket.dispatch({ type: '@@system/SHOW_ERROR_MODAL', title: 'Server Error', err });
});
redbone(io);
```
