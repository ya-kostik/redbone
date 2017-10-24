const CONNECTION = '@@server/CONNECTION';
const DISCONNECT = '@@server/DISCONNECT';

module.exports = [
  {
    type: CONNECTION,
    action(socket) {
      if (global.__model__ && global.__event__ && global.__eventListener__) {
        socket.listenersCounter.add(
          global.__model__, global.__event__, global.__eventListener__
        );
      }
      if (global.__onConnection__) global.__onConnection__(socket);
    }
  },
  {
    type: DISCONNECT,
    action(socket) {
      if (global.__onDisconnect__) global.__onDisconnect__(socket);
    }
  }
];
