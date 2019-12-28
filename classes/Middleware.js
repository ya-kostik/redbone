const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const isRegExp = require('lodash/isRegExp');

const isNot = require('../lib/isNot');
const setToMap = require('../lib/setToMap');

/**
 * Middleware processor for Redbone class
 * @class Middleware
 */
class Middleware {
  constructor(redbone) {
    this.redbone = redbone;

    this.allHandlers = [];
    this.plainHandlers = new Map();
    this.regexpHandlers = new Map();
  }

  /**
   * Get plain handlers by type
   * @param  {String} type — type of action
   * @return {Array}
   */
  getPlainHandlers(type) {
    return this.plainHandlers.get(type) || [];
  }

  /**
   * Get regexp handlers by type
   * @param  {String} type — type of action
   * @return {Array}
   */
  getRegexpHandlers(type) {
    let handlers = [];
    this.regexpHandlers.forEach((regexpHandlers, regexp) => {
      handlers = regexp.test(type)
        ? handlers.concat(regexpHandlers)
        : handlers;
    });
    return handlers;
  }

  /**
   * Get handlers by type
   * @param  {String} type — type of action
   * @return {Array}
   */
  getHandlers(type) {
    let handlers = this.allHandlers;

    handlers = handlers.concat(this.getPlainHandlers(type));
    handlers = handlers.concat(this.getRegexpHandlers(type));

    return handlers;
  }

  /**
   * Use handler
   * @param  {String} type — type of action
   * @param  {Function} handler
   * @return {Redbone} parent Redbone's instance, it is need for chaining
   */
  use(type, handler) {
    if (isFunction(type)) {
      handler = type;
      type = null;
    }

    isNot(handler, 'function', 'handler');

    if (type === null) {
      return this.allHandlers.push(handler);
    }

    isNot(type, 'string or regexp', 'type');

    if (isString(type)) {
      setToMap(type, handler, this.plainHandlers);
    } else if (isRegExp(type)) {
      setToMap(type, handler, this.regexpHandlers);
    }

    // It is need for chaining
    return this.redbone;
  }

  /**
   * Process action
   * @param  {Client} client
   * @param  {Action} action
   * @return {Promise}
   */
  dispatch(client, action) {
    const handlers = this.getHandlers(action.type);
    return this.run(handlers, client, action);
  }

  /**
   * Run handlers for action
   * @param  {Array<Function>} handlers
   * @param  {Client} client
   * @param  {Action} action
   * @return {Promise<Boolean>}
   */
  async run(handlers, client, action) {
    for (const handler of handlers) {
      const result = await handler(client, action, this.redbone);
      if (result === false) return false;
    }

    return true;
  }
}

// Aliases
Middleware.prototype.get = Middleware.prototype.getHandlers;

module.exports = Middleware;
