const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');

class ListenersCounter {
  constructor(client) {
    this.clean = this.clean.bind(this);
    
    this.client = client;
    this.models = new Map();
  }

  set client(client) {
    if (this._client) {
      this._client.removeListener('disconnect', this.clean);
    }
    this._client = client;
    client.once('disconnect', this.clean);
  }

  get client() {
    return this._client;
  }

  add(model, name, listener, auto = true, once = false) {
    if (!isFunction(listener)) throw new TypeError('listener is not a function');
    if (!isString(name) && name.length) {
      throw new TypeError('name should be non-empty string');
    }
    if (!(model && model.on && model.removeListener)) {
      throw new TypeError('model should be EventEmitter\'s instance');
    }
    let queue = this.models.get(model);
    if (!queue) {
      queue = new Map();
      this.models.set(model, queue);
    }
    let listened = queue.get(name);
    if (listened) {
      console.warn(`client ${this.client.id} already has lister for event ${name} of model`);
      return this;
    }
    queue.set(name, listener);
    if (auto) {
      if (once) {
        model.once(name, listener);
      } else {
        model.on(name, listener);
      }
    }
    return this;
  }

  remove(model, name, auto = true) {
    const queue = this.models.get(model);
    if (!queue) return this;
    const listener = queue.get(name);
    if (!listener) return this;
    queue.delete(name);
    if (queue.size === 0) {
      this.models.delete(model);
    }
    if (auto) {
      model.removeListener(name, listener);
    }
    return this;
  }

  clean() {
    for (const [model, queue] of this.models) {
      for (const [name, listener] of queue) {
        model.removeListener(name, listener);
      }
    }
    this.models = new Map();
  }
}

module.exports = ListenersCounter;
