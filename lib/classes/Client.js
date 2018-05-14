const EventEmitter = require('events');

class Client extends EventEmitter {
  constructor(id, redbone, connector) {
    super();
    this.id = id;
    this.redbone = redbone;
    this.connector = connector || null;
  }

  dispatch(name, type, payload, merge) {
    if (typeof name === 'object' && name !== null) {
      this.dispatcher(name);
      return this;
    }
    this.dispatcher(this.redbone.makeAction(name, type, payload, merge));
    return this;
  }

  dispatcher() {
    throw new TypeError('dispatcher is not implemented');
  }
}

module.exports = Client;
