const { isString, isNull, isPlainObject } = require('lodash');

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
    this.storage = {};
  }

  get id() {
    return this.nativeSocket.id;
  }

  get io() {
    return this.nativeSocket.io;
  }

  set(key, value = null) {
    if (isString(key)) {
      value = { [key]: value }
    } else if (isPlainObject(key)) {
      value = key;
    } else return;
    this.storage = Object.assign(this.storage, value);
  }

  get(key = null) {
    if (isNull(key)) return this.storage;
    return this.storage[key];
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
