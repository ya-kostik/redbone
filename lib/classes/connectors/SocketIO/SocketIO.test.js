/* global test expect */

const SocketIO = require('./');
const io = require('socket.io');
const clientIO = require('socket.io-client');
const Redbone = require('../../Redbone');
const Client = require('./Client');

let ports = 2010;

test('create connector', (cb) => {
  const ioServer = io(ports + 1);
  const connector = new SocketIO(ioServer);
  expect(connector.io).toBe(ioServer);
  ioServer.close(cb);
});

test('add connector to the Redbone\'s instance', (cb) => {
  const port = ports + 2;
  const ioServer = io(port);
  const connector = new SocketIO(ioServer);
  let connect = null;
  expect(connector.io).toBe(ioServer);
  const redbone = new Redbone(connector);
  redbone.watch('PING', (client) => {
    client.dispatch({ type: 'PONG' });
  });
  redbone.watch(redbone.types.CONNECTION, (client) => {
    expect(client instanceof Client).toBe(true);
    connect.emit('dispatch', { type: 'PING' });
    connect.once('dispatch', (action) => {
      expect(action.type).toBe('PONG');
      connect.disconnect();
    });
  });
  redbone.watch(redbone.types.DISCONNECT, () => {
    ioServer.close(cb);
  });
  setTimeout(() => {
      connect = clientIO.connect('http://localhost:' + port);
  }, 4);
});
