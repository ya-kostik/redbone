const isString = require('lodash/isString');

/**
 * Syntetic abstraction around native socket.io socket
 * @class Socket
 */
class Socket {
  /**
   * dispatch action to client
   * @param {Socket}        socket — socket with emit
   * @param {Object|String} action — action to dispatch
   */
  static dispatch(socket, action) {
    if (isString(action)) {
      action = { type: action }
    }
    socket.emit('dispatch', action);
  }

  constructor(socket) {
    this.nativeSocket = socket;
  }

  get id() {
    return this.nativeSocket.id;
  }

  get io() {
    return this.nativeSocket.io;
  }
  /**
   * dispatch action to client
   * @param {Object|String} action — action to dispatch
   */
  dispatch(action) {
    Socket.dispatch(this.nativeSocket, action);
  }
}

module.exports = Socket;
