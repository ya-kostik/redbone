/* global test expect */
const Redbone = require('./Redbone');
const ConnectorMain = require('./Connector');
const Client = require('./Client');
const path = require('path');
const HttpError = require('../../Errors/HttpError');

class Connector extends ConnectorMain {
  constructor() {
    super(...arguments);
    this.clients = new Map();
  }

  get clientId() {
    if (!this._clientId) {
      this._clientId = 0;
    }
    this._clientId += 1;
    return this._clientId;
  }
  connect() {
    const client = new Client(this.clientId, this.redbone);
    this.clients.set(client.id, client);
    this.emit('connection', client);
  }
  disconnect(id) {
    const client = this.clients.get(id);
    this.emit('disconnect', client);
  }
  dispatch(id, action) {
    let client;
    if (id instanceof Client) client = id;
    else client = this.clients.get(id);
    this.emit('dispatch', client, action);
  }
}

const getRedboneWithTypes = (name = 'client', types = ['TEST']) => {
  const redbone = new Redbone();
  redbone.processTypes(name, {
    prefix: `@@${name}/`,
    types: types
  });
  return redbone;
}

test('Create redbone', () => {
  const connector = new Connector();
  const redbone = new Redbone(connector);
  expect(redbone.connector).toBe(connector);
  expect(() => {
    return new Redbone({});
  }).toThrow(new TypeError('connector is not a Connector instance'));
});

test('Create types', () => {
  const redbone = getRedboneWithTypes();
  expect(redbone.types.client.TEST).toBe('@@client/TEST');
});

test('Create action', () => {
  const redbone = getRedboneWithTypes();
  expect(
    redbone.makeAction('client', 'TEST', { hello: 'Redbone 3.0' })
  ).toEqual({
    type: '@@client/TEST',
    payload: { hello: 'Redbone 3.0' }
  });

  expect(
    redbone.makeAction('client', 'TEST', { hello: 'Redbone 3.0' }, true)
  ).toEqual({
    type: '@@client/TEST',
    hello: 'Redbone 3.0'
  });
});

test('Replace connector will unsubscribe/subscribe redbone events', () => {
  const events = ['connection', 'disconnect', 'dispatch'];
  const connector1 = new Connector();
  const connector2 = new Connector();
  const redbone = new Redbone(connector1);
  events.forEach((event) => {
    expect(connector1.listenerCount(event)).toBe(1);
  });
  redbone.connector = connector2;
  events.forEach((event) => {
    expect(connector1.listenerCount(event)).toBe(0);
    expect(connector2.listenerCount(event)).toBe(1);
  });
});

test('add listeners to a connector, without connector should throws error', () => {
  const redbone = new Redbone();
  expect(() => {
    redbone.addListenersToTheConnector();
  }).toThrow(new TypeError('connector is not defined'));
});

test('add middleware to the Redbone\'s instance', () => {
  const redbone = new Redbone();
  const middleware = () => {}
  redbone.use(middleware);
  expect(redbone.middlewares).toEqual([middleware]);
});

test('add watcher to the Redbone\'s instance', () => {
  const redbone = new Redbone();
  const middleware = () => {};
  redbone.watch('test', middleware);
  expect(redbone.watchers.get('test')).toBe(middleware);
});

test('add catcher to the Redbone\'s instance', () => {
  const redbone = new Redbone();
  const middleware = () => {};
  redbone.catch(middleware);
  expect(redbone.catcher).toBe(middleware);
});

test('add invalid middleware should throws error', () => {
  const redbone = new Redbone();
  const middleware = null;
  expect(() => {
    redbone.use(middleware);
  }).toThrow(new TypeError('middleware is not a function'));
});

test('add watchers from array of watchers', () => {
  const watchers = [{
    type: 'test',
    action: () => {}
  }, {
    type: 'another test',
    action: () => {}
  }];
  const redbone = new Redbone();
  redbone.processWatchers(watchers);
  expect(redbone.watchers.size).toBe(2);
});

test('add invalid watchers should throws error', () => {
  const redbone = new Redbone();
  expect(() => {
    redbone.processWatchers(null);
  }).toThrow(new TypeError('watchers is not an array'));
  expect(() => {
    redbone.processWatchers({ length: 1 });
  }).toThrow(new TypeError('watchers is not an array'));
  expect(() => {
    redbone.processWatchers([{ type: {} }]);
  }).toThrow(new TypeError('watcher type is not defined'));
  expect(() => {
    redbone.processWatchers([{ type: null }]);
  }).toThrow(new TypeError('watcher type is not defined'));
  expect(() => {
    redbone.processWatchers([{}]);
  }).toThrow(new TypeError('watcher type is not defined'));
  expect(() => {
    redbone.processWatchers([{ type: 'test' }]);
  }).toThrow(new TypeError('watcher action should be a function'));
  expect(() => {
    redbone.processWatchers([{ type: 'test', action: 'abc' }]);
  }).toThrow(new TypeError('watcher action should be a function'));
});

test('process watchers with name', () => {
  const redbone = getRedboneWithTypes();
  const action = () => {};
  redbone.processWatchers([{
    name: 'client',
    type: 'TEST',
    action
  }]);
  expect(redbone.watchers.get(redbone.types.client.TEST)).toBe(action);
});

function expectTypes(expect, redbone) {
  expect(redbone.types.client.TEST).toBe('@@client/TEST');
  expect(redbone.types.client['HAPPY TEST']).toBe('@@client/HAPPY TEST');
  expect(redbone.types.personal.MOVE).toBe('@@list/MOVE');
}

test('load action from filesystem async', async () => {
  const redbone = new Redbone();
  await redbone.readTypes(path.join(__dirname, '../../test/mocks/types/'));
  expectTypes(expect, redbone);
});

test('load action from filesystem sync', () => {
  const redbone = new Redbone();
  redbone.readTypesSync(path.join(__dirname, '../../test/mocks/types/'));
  expectTypes(expect, redbone);
});

test('load action from filesystem async with prefix', async () => {
  const redbone = new Redbone();
  await redbone.readTypes(path.join(__dirname, '../../test/mocks/types/'), 'server');
  expect(redbone.types['server/client'].TEST).toBe('@@server/client/TEST');
});

test('load watchers async', async () => {
  const redbone = getRedboneWithTypes();
  await redbone.readWatchers(path.join(__dirname, '../../test/mocks/watchers/'));
  expect(redbone.watchers.get('@@client/TEST')).toBeDefined();
  expect(redbone.watchers.get('@@personal/TEST')).toBeDefined();
});

test('load watchers sync', async () => {
  const redbone = getRedboneWithTypes();
  redbone.readWatchersSync(path.join(__dirname, '../../test/mocks/watchers/'));
  expect(redbone.watchers.get('@@client/TEST')).toBeDefined();
  expect(redbone.watchers.get('@@personal/TEST')).toBeDefined();
});

test('connect and disconnect from connector', (cb) => {
  const redbone = new Redbone(new Connector());
  let called = 0;
  redbone.use(() => {
    called += 1;
  });
  redbone.watch(redbone.types.CONNECTION, (client, action) => {
    expect(action.type).toBe(redbone.types.CONNECTION);
    called += 1;
    redbone.connector.disconnect(client.id);
  });
  redbone.watch(redbone.types.DISCONNECT, (client, action) => {
    expect(action.type).toBe(redbone.types.DISCONNECT);
    called += 1;
    expect(called).toBe(4);
    cb();
  });
  redbone.connector.connect();
});

test('dispatch from client to redbone', (cb) => {
  const redbone = new Redbone(new Connector());
  let testClient = null;
  redbone.use((client, action) => {
    if (action.type === client.redbone.types.CONNECTION) {
      testClient = client;
      return;
    }
    if (action.type === 'HELLO') {
      redbone.connector.disconnect(client.id);
    }
    if (action.type === redbone.types.DISCONNECT) {
      cb();
      return false;
    }
  });
  redbone.watch(redbone.types.CONNECTION, () => {
    redbone.connector.dispatch(testClient, {
      type: 'HELLO'
    });
  });
  redbone.watch(redbone.types.DISCONNECT, () => {
    cb(new Error('Invalid disconnect'));
  });
  redbone.connector.connect();
});

test('invalid actions in redbone should be catcher by catcher', (cb) => {
  const redbone = new Redbone(new Connector());
  let counter = 0;
  redbone.use((client, action) => {
    if (action.type === client.redbone.types.CONNECTION) {
      redbone.connector.dispatch(client, {});
      throw new Error('Just error');
    }
    if (action.type === client.redbone.types.DISCONNECT) {
      expect(counter).toBe(3);
      cb();
      return false;
    }
  });
  redbone.catch((client, action, err) => {
    switch (counter) {
      case 0:
        expect(err).toEqual(new TypeError('action.type should be a string'));
        break;
      case 1:
        expect(err).toEqual(new Error('Just error'));
        break;
      case 2:
        expect(err).toEqual(new Error('Just another error'));
        break;
    }
    counter += 1;
    if (counter === 2) {
      redbone.connector.dispatch(client, {
        type: 'TEST'
      });
    } else if (counter === 3) {
      redbone.connector.disconnect(client.id);
    }
  });
  redbone.watch('TEST', () => {
    throw new Error('Just another error');
  });
  redbone.connector.connect();
});

test('default redbone error handler', (cb) => {
  const redbone = new Redbone(new Connector());
  let counter = 0;
  redbone.use((client, action) => {
    if (action.type === redbone.types.CONNECTION) {
      client.dispatcher = (action) => {
        if (counter === 0) {
          expect(action.type).toBe(redbone.types.ERROR);
          counter += 1;
          redbone.connector.disconnect(client.id);
          return false;
        } else if (counter === 1) {
          expect(action.type).toBe(redbone.types.ERROR);
          cb();
        }
      }
      throw new Error('Hi! I am error!');
    } else if (action.type === redbone.types.DISCONNECT) {
      // It is very strange, what new of HttpError in Jest, creates Error;
      const err = new HttpError(403, 'Invalid disconnect');
      throw err;
    }
  });
  redbone.connector.connect();
});
