const Middleware = require('./Middleware');
const Client = require('./Client');

const isNot = require('../lib/isNot');
const isActionOfType = require('../lib/isActionOfType');
const createAction = require('../lib/createAction');

/**
 * Handler type for a middleware or watcher
 * @typedef {(String|RegExp|null)} HandlerType
 */

/**
 * @typedef {Object} Action
 * @prop    {String} type
 * @prop    {Mixed}  [payload]
 */

/**
 * @class Redbone
 * Simple two way dispatcher
 */
class Redbone {
  constructor() {
    this.before = new Middleware(this);
    this.watchers = new Middleware(this);
    this.after = new Middleware(this);
  }

  /**
   * Watch for a type
   * @param  {HandlerType} type — the type of action to watch
   * @param  {Function}    watcher — is a watcher's handler
   * @return {Redbone}     this
   */
  watch(/* type, watcher */) {
    this.watchers.use(...arguments);
    // It is need for chaining
    return this;
  }

  /**
   * Set catcher for errors
   * @param  {Function} catcher
   * @return {Redbone}  this
   */
  catch(catcher) {
    isNot(catcher, 'function', 'catcher');
    this.catcher = catcher;

    return this;
  }

  /**
   * Use `before` middleware
   * @param  {HandlerType} type — the type of action
   * @param  {Function}    middleware — is a middleware's handler
   * @return {Redbone}     this
   */
  use(/* type, middleware */) {
    return this.before.use(...arguments);
  }

  /**
   * Bind redbone to client
   * @param  {Client}  client — is an instance of Client
   * @return {Redbone} this
   */
  bind(client) {
    if (!client.redbone) client.redbone = this;

    return this;
  }

  /**
   * Dispatch action to redbone's process chain
   * @param  {Client}  client — is an instance of Client
   * @param  {Action}  action — is an action to process
   * @return {[type]}        [description]
   */
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

  /**
   * Default catcher for errors
   * Just throws errors next
   * @param  {Error} err
   */
  catcher(err) {
    throw err;
  }
}

Redbone.prototype.is = isActionOfType;
Redbone.prototype.createAction = createAction;

Redbone.is = isActionOfType;
Redbone.createAction = createAction;
Redbone.Client = Client;
module.exports = Redbone;
