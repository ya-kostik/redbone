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

  add(model, name, listener, auto = true) {
    if (!isString(name)) throw new RedboneError('name should be a string');
    if (!isFunction(listener)) {
      throw new RedboneError('listener should be a function');
    }
    if (!model) throw new RedboneError('model is not defined');
    this._addToModel(model, name, listener);
    if (auto) {
      model.on(name, listener);
    }
  }

  _addToModel(name, listener, model) {
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
  }

  remove(model, name, listener, auto = true) {
    if (!isString(name)) throw new RedboneError('name should be a string');
    if (!model) throw new RedboneError('model is not defined');
    this._removeFromModel(model, name);
    if (auto) {
      if (!isFunction(listener)) {
        throw new RedboneError('listener should be a function');
      }
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
    queue.delete(name);
    if (!queue.size) this.listeners.delete(model);
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
