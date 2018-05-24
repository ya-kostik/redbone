const EventEmitter = require('events');
const ListenersCounter = require('./ListenersCounter');

/**
 * Client of Redbone
 * @extends EventEmitter
 * @prop {String} id — id of client
 * @prop {Redbone} redbone
 * @prop {Connector} connector
 * @prop {Object} payload — use it to store data for client
 */
class Client extends EventEmitter {
  constructor(id, redbone, connector) {
    super();
    this.id = id;
    this.redbone = redbone;
    this.connector = connector || null;
    this.payload = {};
    this.listenersCounter = new ListenersCounter(this);
  }

  /**
   * dispatch event to client
   * @param  {String}  name    name of action
   * @param  {String}  type    type of action
   * @param  {Mixed}   payload payload of action
   * @param  {Boolean} merge   merge payload into root
   * @return {Client}          this
   */
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

  connection() {
    this.emit('connection', this);
  }

  disconnect() {
    this.emit('disconnect', this);
  }
}

module.exports = Client;
