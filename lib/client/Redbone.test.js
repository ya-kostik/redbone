/* global test expect */

const Redbone = require('./Redbone');

test('create Redbone-client\'s instance', () => {
  const redbone = new Redbone();
  expect(redbone.types).toBeDefined();
});


test('dispatch actions', () => {
  const redbone = new Redbone();
  let counter = 0;
  redbone.dispatcher = (action) => {
    expect(action.type).toBe('PING');
    counter += 1;
  };
  redbone.dispatch({ type: 'PING' });
  redbone.dispatcher = (action) => {
    expect(action.type).toBe('@@server/PING');
    counter += 1;
  };
  redbone.dispatch({ type: '@@server/PING' });
  redbone.serverDispatcher = (action) => {
    expect(action.type).toBe('@@server/PONG');
    counter += 1;
  };
  redbone.dispatch({ type: '@@server/PONG' });
  expect(counter).toBe(3);
});

test('dispatch with types processing', (cb) => {
  const redbone = new Redbone();
  redbone.processTypes('client', {
    prefix: '@@hello/',
    types: [
      'Redbone 3.0'
    ]
  });
  redbone.dispatcher = (action) => {
    expect(action.type).toBe('@@hello/Redbone 3.0');
    expect(action.payload).toEqual({ part: 3 });
    cb();
  }
  redbone.dispatch('client', 'Redbone 3.0', { part: 3 });
});

test('dispatch without dispatcher should throws error', () => {
  const redbone = new Redbone();
  expect(() => {
    redbone.dispatch({ type: 'BOOM' });
  }).toThrow(new TypeError('dispatcher method is not implemented'));
});
