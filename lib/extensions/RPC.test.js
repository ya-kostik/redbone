/* global test expect */

const RPC = require('./RPC');
const Redbone = require('../classes/Redbone');

test('create rpc', () => {
  const rpc = new RPC();
  expect(rpc.libs).toBeDefined();
});

test('set, get, remove, replace rpc libs', () => {
  const rpc = new RPC();
  const lib = { a: {} };
  const lib2 = { b: {} };
  const lib3 = { c: {} };
  rpc.setLib('test', lib);
  expect(rpc.getLib('test')).toBe(lib);
  expect(rpc.getModule('test.a')).toBe(lib.a);
  rpc.setLib('test', lib2);
  expect(rpc.getLib('test')).toBe(lib2);
  rpc.setLib('test2', lib3);
  expect(rpc.getLib('test2')).toBe(lib3);
  rpc.removeLib('test2');
  expect(rpc.getLib('test2')).toBe(null);
  rpc.setLib(lib);
  expect(rpc.getLib('main')).toBe(lib);
  expect(rpc.getModule('pick.me')).toBe(null);
  expect(rpc.getModule('test.me')).toBe(null);
  // set invalid lib
  expect(() => rpc.setLib('main', null)).toThrow(new TypeError('lib is not an object'));
  expect(() => rpc.setLib(null, null)).toThrow(new TypeError('name is not a string'));
  expect(() => rpc.setLib('', null)).toThrow(new TypeError('name is empty'));
  expect(() => rpc.getModule('main.a.b.c')).
  toThrow(new TypeError('invalid name of module, it should be string with two dot notated values'));
  // get module returns main module
  expect(rpc.getLib()).toBe(lib);
  expect(rpc.getModule('a')).toBe(lib.a);
});

test('add module to the lib', () => {
  const rpc = new RPC();
  const lib = {};
  rpc.setLib(lib);
  const module = {};
  const module2 = {};
  rpc.setModule('a', module);
  expect(rpc.getModule('main.a')).toBe(module);
  rpc.setModule('b.a', module2);
  expect(rpc.getModule('b.a')).toBe(module2);
  expect(() => {
    rpc.setModule('c', null);
  }).toThrow(new TypeError('module is not an object'));
});

test('add rpc to redbone', () => {
  const redbone = new Redbone();
  const rpc = new RPC();
  redbone.extension(rpc);
  expect(redbone.extensions.rpc).toBe(rpc);
  expect(rpc.redbone).toBe(redbone);
  expect(redbone.makeAction('server/rpc', 'CALL', false)).toEqual({
    type: rpc.types['server/rpc'].CALL,
    payload: false
  });
});

test('dispatch call to rpc', (cb) => {
  const echoMessage = 'echo';
  let counter = 0;
  const module = {
    done(echo) {
      expect(echo).toBe(echoMessage);
      if (counter === 1) {
        return { echo };
      }
      return echoMessage + '.' + echoMessage;
    }
  }
  const rpc = new RPC();
  rpc.setModule('hello', module);
  const redbone = new Redbone();
  redbone.extension(rpc);
  const client = {
    dispatch(action) {
      counter += 1;
      if (counter === 1) {
        expect(action.payload).toBe(echoMessage + '.' + echoMessage);
        // step 2
        redbone.onDispatch(client, {
          type: rpc.types['server/rpc'].CALL,
          module: 'hello',
          method: 'done',
          arguments: echoMessage,
          merge: true
        });
      }
      if (counter === 2) {
        expect(action.echo).toBe(echoMessage);
        // step 3
        redbone.onDispatch(client, {
          type: rpc.types['server/rpc'].CALL,
          module: 'hello',
          method: 'done',
          arguments: echoMessage,
          backType: 'TEST'
        });
      }
      if (counter === 3) {
        expect(action.type).toBe('TEST');
      }
      if (counter === 3) cb();
    }
  }
  // step 1
  redbone.onDispatch(client, {
    type: rpc.types['server/rpc'].CALL,
    module: 'hello',
    method: 'done',
    arguments: [echoMessage],
    flat: true
  });
});

test('adding middlewares', (cb) => {
  let steps = 0;
  const path = [
    'all middleware',
    'lib middleware',
    'module 1 middleware',
    'module 2 middleware',
    'module\'s 1 ping method middleware'
  ];
  const toBe = {
    [path[0]]: 3,
    [path[1]]: 2,
    [path[2]]: 2,
    [path[3]]: 1,
    [path[4]]: 2
  }
  const counter = {};
  const rpc = new RPC();
  const redbone = new Redbone();
  redbone.extension(rpc);
  rpc.use(() => {
    // all middleware
    if (!counter[path[0]]) counter[path[0]] = 0;
    counter[path[0]] += 1;
  });
  rpc.use('main', () => {
    // main lib middleware
    if (!counter[path[1]]) counter[path[1]] = 0;
    counter[path[1]] += 1;
  });
  rpc.use('main.module1', () => {
    if (!counter[path[2]]) counter[path[2]] = 0;
    counter[path[2]] += 1;
  });
  rpc.use('add.module2', () => {
    if (!counter[path[3]]) counter[path[3]] = 0;
    counter[path[3]] += 1;
  });
  rpc.use('main.module1.ping', () => {
    if (!counter[path[4]]) counter[path[4]] = 0;
    counter[path[4]] += 1;
  });
  expect(rpc.middlewares.length).toBe(1);
  expect(rpc.libsMiddlewares.main).toBeDefined();
  expect(rpc.libsMiddlewares.main.length).toBe(1);
  expect(rpc.modulesMiddlewares['main.module1']).toBeDefined();
  expect(rpc.modulesMiddlewares['main.module1'].length).toBe(1);
  expect(rpc.modulesMiddlewares['add.module2']).toBeDefined();
  expect(rpc.modulesMiddlewares['add.module2'].length).toBe(1);
  rpc.setModule('module1', { ping() { return 'pong' } });
  rpc.setModule('add.module2', { pinging() { return 'ponging' } });
  const client = {
    dispatch() {
      steps += 1;
      if (steps === 1) {
        // stage 2
        redbone.onDispatch(client, {
          type: rpc.types['server/rpc'].CALL,
          module: 'module1',
          method: 'ping'
        });
        return;
      } else if (steps === 2) {
        // stage 3
        redbone.onDispatch(client, {
          type: rpc.types['server/rpc'].CALL,
          lib: 'add',
          module: 'module2',
          method: 'pinging'
        });
        return;
      }
      expect(toBe).toEqual(counter);
      cb();
    }
  };
  // stage 1
  redbone.onDispatch(client, {
    type: rpc.types['server/rpc'].CALL,
    module: 'module1',
    method: 'ping'
  });
});
