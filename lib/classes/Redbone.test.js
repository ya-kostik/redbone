/* global test expect */
const Redbone = require('./Redbone');
const ConnectorMain = require('./Connector');

class Connector extends ConnectorMain {
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