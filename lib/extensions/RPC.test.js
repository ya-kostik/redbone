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
  toThrow(new TypeError('invalid name, it should be string with two dot notated values'));
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
  })
});
