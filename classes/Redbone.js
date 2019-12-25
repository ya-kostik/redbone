const isNot = require('../lib/isNot');
const Middleware = require('./Middleware');

class Redbone {
  constructor(transport = null, options = {}) {
    this.transport = transport;
    this.options = options;

    this.before = new Middleware();
    this.watchers = new Middleware();
  }

  watch(type, watcher) {
    this.watchers.use(type, watcher);
  }

  async dispatch(client, action) {
    isNot(action, 'valid action', 'action');
    if (!client.redbone) client.redbone = this;

    return (await this.before.dispatch(client, action))
      && (await this.watchers.dispatch(client, action));
  }

  use(type, middleware) {
    this.before.use(type, middleware);
  }
}

module.exports = Redbone;
