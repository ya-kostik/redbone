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
