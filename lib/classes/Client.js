const EventEmitter = require('events');

class Client extends EventEmitter {
  constructor(id, redbone) {
    super();
    this.id = id;
    this.redbone = redbone;
  }

  dispatch(name, type, payload, merge) {
    if (typeof name === 'object' && name !== null) {
      this.dispatcher(name);
      return this;
    }
    this.dispatcher(this.redbone.makeAction(name, type, payload, merge));
    return this;
  }
}

module.exports = Client;
