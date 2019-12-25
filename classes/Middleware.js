const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const isRegExp = require('lodash/isRegExp');

const isNot = require('../lib/isNot');
const setToMap = require('../lib/setToMap');

class Middleware {
  constructor(redbone) {
    this.redbone = redbone;

    this.plainHandlers = new Map();
    this.regexpHandlers = new Map();
    this.allHandlers = [];
  }

  getPlainHandlers(type) {
    return this.plainHandlers.get(type) || [];
  }

  getRegexpHandlers(type) {
    let handlers = [];
    this.regexpHandlers.forEach((regexpHandlers, regexp) => {
      handlers = regexp.test(type)
        ? handlers.concat(regexpHandlers)
        : handlers;
    });
    return handlers;
  }


  getHandlers(type) {
    let handlers = this.allHandlers;

    handlers = handlers.concat(this.getPlainHandlers(type));
    handlers = handlers.concat(this.getRegexpHandlers(type));

    return handlers;
  }

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

  dispatch(client, action) {
    const handlers = this.getHandlers(action.type);
    return this.run(handlers, client, action);
  }

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
