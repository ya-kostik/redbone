const isString = require('lodash/isString');
const isFunction = require('lodash/isFunction');
const RedboneError = require('../Errors/RedboneError');

class SocketListenersCounter {
  constructor(aggregator) {
    this.listeners = new Map();
    this._autoClean = this._autoClean.bind(this);

    if (aggregator) {
      this._aggregator = aggregator;
      this._aggregator._disconnectSubscribe(this._autoClean);
    }
  }

  add(model, name, listener, options = { auto: true, bind: false }) {
    if (!isString(name)) throw new RedboneError('name should be a string');
    if (!isFunction(listener)) {
      throw new RedboneError('listener should be a function');
    }
    if (!model) throw new RedboneError('model is not defined');

    const { auto, bind } = options;
    // autobinding, for set context on listeners
    if (bind) {
      if (bind === true && this._aggregator) {
        listener = listener.bind(this._aggregator);
      } else {
        listener = listener.bind(bind);
      }
    }
    this._addToModel(model, name, listener);
    // autolistening
    if (auto) {
      model.on(name, listener);
    }
  }

  _addToModel(model, name, listener) {
    let queue;
    if (!this.listeners.has(model)) {
      queue = new Map();
      this.listeners.set(model, queue);
    } else {
      queue = this.listeners.get(model);
    }
    if (queue.has(name)) {
      throw new RedboneError('queue of model already has listener: ' + name);
    }
    queue.set(name, listener);
    return listener;
  }

  remove(model, name, auto = true) {
    if (!isString(name)) throw new RedboneError('name should be a string');
    if (!model) throw new RedboneError('model is not defined');
    const listener = this._removeFromModel(model, name);
    if (auto) {
      model.removeListener(name, listener);
    }
  }

  _removeFromModel(model, name) {
    if (!this.listeners.has(model)) {
      throw new RedboneError('model not found in listeners');
    }
    const queue = this.listeners.get(model);
    if (!queue.has(name)) {
      throw new RedboneError('name «' + name + '» not found in model listeners');
    }
    const listener = queue.get(name);
    queue.delete(name);
    if (!queue.size) this.listeners.delete(model);
    return listener;
  }

  _autoClean() {
    if (this.listeners.size === 0) return;
    this.listeners.forEach((queue, model) => {
      queue.forEach((listener, name) => {
        model.removeListener(name, listener);
      });
    });
  }
}

module.exports = SocketListenersCounter;
