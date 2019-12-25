const isNot = require('../lib/isNot');
const Middleware = require('./Middleware');

class Redbone {
  constructor(transport = null, options = {}) {
    this.transport = transport;
    this.options = options;

    this.before = new Middleware(this);
    this.watchers = new Middleware(this);
    this.after = new Middleware(this);
  }

  watch(type, watcher) {
    this.watchers.use(type, watcher);
    // It is need for chaining
    return this;
  }

  catch(catcher) {
    isNot(catcher, 'function', 'catcher');
    this.catcher = catcher;

    return this;
  }

  use(type, middleware) {
    this.before.use(type, middleware);
    // It is need for chaining
    return this;
  }

  bind(client) {
    if (!client.redbone) client.redbone = this;
  }

  async dispatch(client, action) {
    try {
      isNot(action, 'valid action', 'action');
      this.bind(client);
      return (await this.before.dispatch(client, action))
        && (await this.watchers.dispatch(client, action))
        && (await this.after.dispatch(client, action));
    } catch(err) {
      this.catcher(err, client, action, this);
    }
  }

  catcher(err) {
    throw err;
  }
}

module.exports = Redbone;
