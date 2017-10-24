const isString = require('lodash/isString');
const isPlainObject = require('lodash/isPlainObject');
const isNull = require('lodash/isNull');
const isFunction = require('lodash/isFunction');
const SocketListenersCounter = require('./SocketListenersCounter');

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

  constructor(socket, redbone) {
    this.redbone = redbone;
    this.nativeSocket = socket;
    this.storage = {};
    this.listenersCounter = new SocketListenersCounter(this);
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
    return this;
  }

  /**
   * Subscribe to disconnect event
   * Use for automatic listeners counting
   * look at SocketListenersCounter
   * @param  {Function} cb function to once call
   * @return {Socket}      this
   */
  _disconnectSubscribe(cb) {
    if (!isFunction(cb)) {
      throw new TypeError('Subscribe cb should be a function');
    }
    this.nativeSocket.once('disconnect', cb);
    return this;
  }

  /**
   * Unsubscribe to disconnect event
   * Use for automatic listeners counting
   * look at SocketListenersCounter
   * @param  {Function} cb function to once call
   * @return {Socket}      this
   */
  _disconnectUnsubscribe(cb) {
    if (!isFunction(cb)) {
      throw new TypeError('Subscribe cb should be a function');
    }
    this.nativeSocket.removeListener('disconnect', cb);
    return this;
  }

  sub(model, event, type, merge = false) {
    this.listenersCounter.add(model, event, this.pub(type, merge))
  }

  pub(type, merge = false) {
    return (data) => {
      const action = { type };
      if (merge) Object.assign(action, data);
      else action.payload = data;
      this.dispatch(action)
    }
  }
}

module.exports = Socket;
