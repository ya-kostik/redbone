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
const redbone = new Redbone();
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

For those who are attentive: `redbone.use` is just an alias for `redbone.before.use`.

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

For example TCP transport might look like this:
```js
const { Server } = require('net');
const Redbone = require('redbone');
// We will look it later
const Client = require('./Client');

const Types = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect'
}

class RedboneTransportTCP {
  constructor(options) {
    this.redbone = new Redbone();

    this.onConnection = this.onConnection.bind(this);
    this.onError = this.onError.bind(this);
    this.onRedboneError = this.onRedboneError.bind(this);

    this.server = new Server(options);
    // Add redbone's catcher
    this.redbone.catch(this.onRedboneError);
  }

  set server(server) {
    if (this._server) this._unsub(this._server);
    this._sub(server);
    this._server = server;
  }

  get server() {
    return this._server || null;
  }

  _sub(server) {
    server.on('connection', this.onConnection);
    server.on('error', this.onError);
  }

  _unsub(server) {
    server.off('connection', this.onConnection);
    server.off('error', this.onError);
  }

  listen(port) {
    if (!this._server) throw new ReferenceError('no server for listen')
    return new Promise((resolve, reject) => {
      this._server.listen(port, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  close() {
    if (!this._server) return;
    return new Promise((resolve, reject) => {
      this._server.close((err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }

  _processAction(client, data) {
    try {
      // process action every message
      const action = JSON.parse(data);
      this.redbone.dispatch(client, action);
    } catch (err) {
      this.onError(err);
    }
  }

  _changeSocketSub(socket, onData, onDisconnect, onError, on = true) {
    const method = on ? 'on' : 'off';
    socket[method]('data', onData);
    socket[method]('error', onError);
    socket[method]('close', onDisconnect);
  }

  _createClient(socket) {
    socket.setEncoding('utf8');
    // create client
    return new Client({
      transport: this,
      native: socket
    });
  }

  _createOnData(client) {
    return (data) => {
      this._processAction(client, data);
    };
  }

  _createOnDisconnect(client, onData) {
    const { DISCONNECT } = this.constructor.Types;

    const onDisconnect = () => {
      // dispatch disconnect action
      this.redbone.dispatch(client, { type: DISCONNECT });
      this._changeSocketSub(
        client.native, onData, onDisconnect, this.onError, false
      );
    }

    return onDisconnect;
  }

  _subClient(client) {
    const onData = this._createOnData(client);
    const onDisconnect = this._createOnDisconnect(client, onData);
    this._changeSocketSub(
      client.native, onData, onDisconnect, this.onError
    );
  }

  onConnection(socket) {
    const { CONNECTION } = this.constructor.Types;
    const client = this._createClient(socket);
    this._subClient(client);
    // dispatch connection action
    return this.redbone.dispatch(client, { type: CONNECTION });
  }

  onError(err) {
    console.error(err);
  }

  onRedboneError(err, client) {
    if (!err.statusCode) {
      throw err;
    }

    client.dispatch({
      type: 'error',
      code: err.statusCode || 500
    });
  }
}

RedboneTransportTCP.Types = Types;
module.exports = RedboneTransportTCP;
```

Redbone has several transports in different modules.

You can examine the examples in detail in a [separate repository](https://github.com/ya-kostik/redbone-examples).

## Clients
Redbone needs clients to get a way to send reaction from it to client.
Clients objects lives until connection is closed.

Every transport should implement own Client class, inherited from Redbone's Client class.

For example `TcpTransport`'s `Client` might look like this:
```js
const Redbone = require('../../');
const { write } = require('./lib/socket');

const PERMITTED_ERRORS = new Set([
  'EPIPE' // Send action after socket closed
]);

class Client extends Redbone.Client {
  send(action) {
    return this.write(action).
    catch((err) => {
      if (PERMITTED_ERRORS.has(err.code)) return;
      return this.transport.onError(err);
    });
  }

  write(action) {
    return new Promise((resolve, reject) => {
      const message = JSON.stringify(action);
      this.native.once('error', reject);
      return this.native.write(action, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }
}

module.exports = Client;
```

`send` calls every time, when `client.dispatch(action)` occurs.
