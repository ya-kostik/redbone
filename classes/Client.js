const isString = require('lodash/isString');
const createAction = require('../lib/createAction');
const isNot = require('../lib/isNot');

/**
 * @class Client
 * Redbone Client class
 * @prop {Mixed} native — is a native client, for your convenience
 * @prop {Mixed} transport — is a transport for Redbone
 * @param {Object} [options = {}]
 * @param {Mixed}  [options.native = null]
 * @param {Mixed}  [options.tranport = null]
 */
class Client {
  constructor({ native = null, transport = null } = {}) {
    this.native = native;
    this.transport = transport;
    this.redbone = null;
  }

  /**
   * Dispatch action to client
   * @param  {Action} action
   * @return {Mixed} value depends on send method
   */
  dispatch(action, payload) {
    isString(action)
      ? action = createAction(action, payload)
      : isNot(action, 'valid action', 'action');

    return this.send(action);
  }

  /**
   * Send action by transport to client
   */
  send(/* action */) {
    throw new ReferenceError('send method is not implemented');
  }
}

module.exports = Client;
