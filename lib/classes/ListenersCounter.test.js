/* global test expect */

const ListenersCounter = require('./ListenersCounter');
const Client = require('./Client');
const Redbone = require('./Redbone');
const EE = require('events');
class MyEE extends EE {}

function prepare() {
  const redbone = new Redbone();
  const client = new Client(1, redbone, {});
  const alc = new ListenersCounter(client);
  return { redbone, client, alc };
}

test('create with client', () => {
  const { alc, client } = prepare();
  expect(alc.client).toBe(client);
});

test('listen', () => {
  const { alc } = prepare();
  const model = new MyEE();
  const listener = () => {};
  alc.add(model, 'ping', listener);
  expect(alc.models.get(model)).toBeDefined();
  expect(alc.models.get(model)).toBeInstanceOf(Map);
  expect(alc.models.get(model).get('ping')).toBe(listener);
  expect(model.listenerCount('ping')).toBe(1);
});

test('remove listener', () => {
  const { alc } = prepare();
  const model = new MyEE();
  const listener = () => {};
  alc.add(model, 'ping', listener);
  expect(model.listenerCount('ping')).toBe(1);
  alc.add(model, 'pong', listener);
  expect(model.listenerCount('pong')).toBe(1);
  alc.remove(model, 'ping', listener);
  expect(alc.models.get(model).get('ping')).toBeUndefined();
  expect(model.listenerCount('ping')).toBe(0);
  alc.remove(model, 'pong', listener);
  expect(alc.models.get(model)).toBeUndefined();
  expect(model.listenerCount('pong')).toBe(0);
});

test('on disconnect remove all listeners', () => {
  const { alc, client } = prepare();
  const model = new MyEE();
  const listener = () => {};
  alc.add(model, 'ping', listener);
  alc.add(model, 'ping', listener);
  console.info('this warn is ok');
  expect(model.listenerCount('ping')).toBe(1);
  client.disconnect();
  expect(model.listenerCount('ping')).toBe(0);
  expect(alc.models.size).toBe(0);
});
