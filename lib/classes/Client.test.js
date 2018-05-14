/* global test expect */

const Client = require('./Client');
const Redbone = require('./Redbone');

const currentType = 'Hello Redbone 3.0';
const redbone = new Redbone();
redbone.processTypes('client', {
  prefix: 'test',
  types: [currentType]
});

test('crete Client\'s instance', () => {
  const client = new Client(1, {});
  expect(client.id).toBe(1);
});

test('dispatch from Client\'s instance', () => {
  let called = 0;

  const client = new Client(1, redbone);
  client.dispatcher = (action) => {
    expect(typeof action.type === 'string').toBe(true);
    if (action.type === currentType) {
      called += 1;
      return;
    }
    expect(action.type).toBe(redbone.types.client[currentType]);
    called += 1;
  };
  client.dispatch({ type: currentType });
  client.dispatch('client', currentType, { value: 1 }, true);
  expect(called).toBe(2);
});

test('dispatch from Client\'s instance should throws error, if dispatcher is not implemented', () => {
  const client = new Client(1, redbone);
  expect(() => {
    client.dispatch({ action: 'TEST' });
  }).toThrow(new TypeError('dispatcher is not implemented'));
});
