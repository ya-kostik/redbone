# Redbone
Polymorphic library for two-way dispatching of actions

# Why
It all started with laziness.
Once, when I was writing an application on redux + web sockets, I thought, why do I need so many bindings and subscriptions for server events?
Why I can't forward an object from the server directly to `store.dispatch`?

The actions to me seemed like a pretty good container for data transfer,
and just one event for sending and receiving data makes it possible to flexibly control the flow of data between the server and the client.

After several iterations, I got Redbone - a small wrapper over socket.io,
which blurred the line between the backend and frontend of my applications.

Starting with version 3, the Socket.io is no longer need to the Redbone.
You can use any transport that you like: WSS, Socket.io, TCP, etc.
Also, Redbone no longer limits the choice of storage.
You can use Redux, MobX, Vuex, Backbone or any other storage in the frontend.

# Install
Via yarn
```sh
yarn add redbone
```

Via npm
```sh
npm install redbone
```

Additionaly, install `socket.io`, or other transport modules, if it requires.

# Core concepts
## Create Redbone's instance
```js
const Redbone = require('redbone');
const redbone = new Redbone(transport);
```

## Watchers
Watchers is a small functions, which handle action types.
You can add one or more watchers to the one [action type](https://redux.js.org/basics/actions).

```js
redbone.watch(type, function(client, action) {
  // do something with action
});
```

If you want to dispatch something back to the client, just call `dispatch` method of `client`'s instance.

### Let's look at an example below:
```js
redbone.watch('ping', function(client, action) {
  client.dispatch({ type: 'pong' });
});
```
First. We created a `ping` type watcher.

Every `action` like this
```js
{
  type: 'ping'
}
```
comes to the `action` object in the watcher's function.
Second. We call `dispatch` method of `client`'s instance, now action comes to the other side.

## Middlewares
If you need a middleware logic, use `use` method of Redbone's instance.
```js
redbone.use(function(client, action) {
  // some logic here
  // if you want to stop middlewares flow, just return false;
  // if you wath to continue, return true or undefined
});
```

Middlewares and watchers are async by default. You can write async functions for them.

## Typed middlewares
Middlewares can be used for a specific type:
```js
redbone.use(type, function(client, action) {
  // Something for type
});
```

## After middlewares
You can add middlewares after watchers:
```js
redbone.after.use(function(client, action) {
  // Middleware, after all
});

// Middlewares for some type
redbone.after.use(type, function(client, action) {
  // Middleware after type
});
```

For those who are attentive: `redbone.use` is just an alias for` redbone.before.use`.

## Catcher
In Redbone, you can manage the errors that occurred in your middlewares and watchers in one place.
To do this, simply add the error handler function:
```js
redbone.catch(function(err, client, action) {
  console.error(err);
  if (client) {
    client.dispatch({ type: 'error', payload: err });
  }
});
```
In example default `catcher` presented.

Please note that the client and the action will not always be available.
If the error occurred when the client is not yet,
or when it was not possible to receive the action,
they will not be transferred to the catcher.

## Transports
Initially, Redbone was created to work with socket.io as a transport,
and Redux as a state store on the frontend.

Now you can use different transports and storages.

Transport should be an EventEmitter children.
When transport emits `dispatch` event redbone starts process `client` and `action`.
For example TCP transport might look like this:
```js
const EventEmitter = require('events');
// We will look it closer later
const Client = require('./Client');

// Transport should be an EventEmitter child
class TcpTransport extends EventEmitter {
  // the constructor will be his own for each transport
  constructor(server) {
    super();
    // this field will be added when transport will be added to a Redbone's instance
    this.redbone = null;
    this.__server = null;

    this.onConnection = this.onConnection.bind(this);
    this.onError = this.onError.bind(this);
    this.server = server;
  }

  set server(server) {
    if (this.__server) this._unsub(this.__server);
    this._sub(server);
    this.__server = server;
  }

  get server() {
    return this.__server;
  }

  _sub(server) {
    server.on('connection', this.onConnection);
    server.on('error', this.onError);
  }

  _unsub(server) {
    server.removeListener('connection', this.onConnection);
    server.removeListener('error', this.onError);
  }

  _processAction(data, client) {
    try {
      const action = JSON.parse(data);
      // When transport has a client and an action
      // it should emit dispatch
      this.emit('dispatch', client, action);
    } catch (err) {
      this.emit('error', err, client);
    }
  }

  onConnection(socket) {
    // client is an instance of Client class.
    // Every platform shoud implement Client class, inherited from Redbone's Client,
    // we will look it closer later
    const client = new Client(null, socket, this);
    // every transport should emit connection event
    this.emit('connection', client);
    socket.setEncoding('utf8');
    socket.on('data', (data) => this._processAction(data, client));
    socket.on('error', (err) => {
      // every transport should emit error event, when error occurs
      this.emit('error', err, client);
    });
    socket.on('disconnect', () => {
      // every transport should emit disconnect event
      this.emit('disconnect', client);
    });
  }

  onError(err) {
    this.emit('error', err);
  }
}
```

Redbone has several transports out of the box.

## Clients
Redbone needs clients to get a way to send reaction from it to client.
Clients objects lives until connection is broken.

Every transport should implement own Client class, inherited from Redbone's Client class.

For example `TcpTransport`'s `Client` might look like this:
```js
const { Client: ClientMain } = require('redbone');

class Client extends ClientMain {
  // send is the only method the Сlient should implement
  send(action) {
    this.native.write(JSON.stringify(action));
  }
}
```

`send` calls every time, when `client.dispatch(action)` occurs.

Clients have many useful properties.
For example, customers are able to automatically generate actions.
