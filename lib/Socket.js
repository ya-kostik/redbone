const isString = require('lodash/isString');
const isPlainObject = require('lodash/isPlainObject');
const isNull = require('lodash/isNull');

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
  static dispatch(socket, action, eventOut) {
    if (isString(action)) {
      action = { type: action }
    }
    if (!eventOut) eventOut = 'dispatch';
    socket.emit(eventOut, action);
  }

  constructor(socket, redbone) {
    this.nativeSocket = socket;
    this.storage = {};
    this.redbone = redbone;
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
    Socket.dispatch(this.nativeSocket, action, this.redbone.eventOut);
  }
}

module.exports = Socket;
