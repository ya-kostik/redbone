const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const isObject = require('lodash/isObject');
const Connector = require('./Connector');
const processTypes = require('../services/processTypes');
const makeAction = require('../services/makeAction');
const isMiddleware = require('../services/isMiddleware');

/**
 * Redbone main class
 * @class Redbone
 * @prop {Array}    middlewares array of middlewares
 * @prop {Map}      watchers    watchers map; keys — type for watcher fn
 * @prop {Function} catcher     function to process errors
 * @prop {Object}   types       default redbone types for client lifecicle actions
 * @prop {Object}   extensions  extensions for redbone
 * @property {Object|null} connector  sets or gets Connector's instance
 */
class Redbone {
  constructor(connector) {
    this.middlewares = [];
    this.watchers = new Map();
    this.catcher = this.onError;
    this.types = {
      CONNECTION: '@@server/CONNECTION',
      DISCONNECT: '@@server/DISCONNECT',
      ERROR:      '@@server/ERROR'
    }
    this.extensions = {};

    this.onConnection = this.onConnection.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.onDispatch = this.onDispatch.bind(this);

    this.connector = connector;
  }

  get connector() {
    return this._connector || null;
  }

  set connector(connector) {
    if (!connector) {
      this._connector = null;
      return;
    }
    if (!(connector instanceof Connector)) {
      throw new TypeError('connector is not a Connector instance');
    }
    this.removeListenersFromConnector();
    this._connector = connector;
    this._connector.redbone = this;
    this.addListenersToTheConnector();
  }

  removeListenersFromConnector() {
    const connector = this.connector;
    if (!connector) return this;
    connector.removeListener('connection', this.onConnection);
    connector.removeListener('disconnect', this.onDisconnect);
    connector.removeListener('dispatch', this.onDispatch);
    return this;
  }

  addListenersToTheConnector() {
    const connector = this.connector;
    if (!connector) throw new TypeError('connector is not defined');
    connector.on('connection', this.onConnection);
    connector.on('disconnect', this.onDisconnect);
    connector.on('dispatch', this.onDispatch);
    return this;
  }

  onConnection(client) {
    this.run(client, { type: this.types.CONNECTION });
  }

  onDisconnect(client) {
    this.run(client, { type: this.types.DISCONNECT });
  }

  onDispatch(client, action) {
    this.run(client, action);
  }

  /**
   * use middleware
   * @param  {Function}  middleware middleware function
   * @return {Redbone}              this
   */
  use(middleware) {
    isMiddleware(middleware);
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * watch some type
   * @param  {String} type          action.type to watch
   * @param  {Function}  middleware middleware function; it will process when action.type dispatch to server
   * @return {Redbone}              this
   */
  watch(type, middleware) {
    isMiddleware(middleware);
    this.watchers.set(type, middleware);
    return this;
  }

  /**
   * set catcher function
   * @param  {Function}  middleware middleware function for error process
   * @return {Redbone}              this
   */
  catch(middleware) {
    isMiddleware(middleware);
    this.catcher = middleware;
    return this;
  }

  /**
   * add watchers by array
   * @param  {Array} watchers
   * @return {Redbone}        this
   */
  processWatchers(watchers) {
    if (!Array.isArray(watchers)) {
      throw new TypeError('watchers is not an array');
    }
    watchers.forEach((watcher) => {
      if (!(watcher.type && isString(watcher.type))) {
        throw new TypeError('watcher type is not defined');
      }
      if (!(watcher.action && isFunction(watcher.action))) {
        throw new TypeError('watcher action should be a function');
      }
      let type = watcher.type;
      if (watcher.name) {
        type = this.types[watcher.name][watcher.type];
      }
      this.watch(type, watcher.action);
    });
    return this;
  }

  /**
   * run client lifecicle with action
   * @param  {Client}  client   client of connector
   * @param  {Object}  action   to dispatch
   * @return {Promise<Redbone>} this
   */
  async run(client, action) {
    if (!(action && isString(action.type))) {
      this.catcher(
        client,
        action,
        new TypeError('action.type should be a string')
      );
    }
    try {
      for (const middleware of this.middlewares) {
        const result = await middleware(client, action);
        if (result === false) return;
      }
      await this.runWatchers(client, action);
    } catch (err) {
      return this.catcher(client, action, err);
    }
    return this;
  }

  /**
   * find and run watchers
   * @param  {Client}  client   client of connector
   * @param  {Object}  action   to dispatch
   * @return {Promise<Redbone>} this
   */
  async runWatchers(client, action) {
    const watcher = this.watchers.get(action.type);
    if (!watcher) return this;
    try {
      await watcher(client, action);
    } catch (err) {
      this.catcher(client, action, err);
    }
    return this;
  }

  /**
   * add extension to the Redbone's instance
   * @param  {Object} extension extension for redbone
   * @return {Redbone}          this
   */
  extension(extension) {
    if (!extension.name) throw new TypeError('extension name is not defined');
    extension.redbone = this;
    this.extensions[extension.name] = extension;
    if (isObject(extension.types)) {
      Object.assign(this.types, extension.types);
    }
    if (isFunction(extension.apply)) {
      extension.apply();
    }
    return this;
  }

  /**
   * read watchers from dirrectory
   * @param  {String}  dir path to dirrectory
   * @return {Promise<Redbone>} this
   */
  async readWatchers(dir) {
    const scandir = require('../services/scandir');
    const path = require('path');
    await scandir(dir, (file) => {
      const watchers = require(path.join(dir, file));
      this.processWatchers(watchers)
    });
    return this;
  }

  readWatchersSync(dir) {
    const scandir = require('../services/scandirSync');
    const path = require('path');
    scandir(dir, (file) => {
      const watchers = require(path.join(dir, file));
      this.processWatchers(watchers)
    });
    return this;
  }

  /**
   * generic code for readTypes and readTypesSync
   * @param  {String} file file name
   * @param  {String} name file name without extension
   * @return {[type]}      [description]
   */
  processTypesDir(dir, file, name, prefix) {
    const path = require('path');
    if (prefix) {
      name = `${prefix}/${name}`
    }
    let raw = require(path.join(dir, file));
    // create a copy of raw
    raw = Object.assign({}, raw);
    if (!raw.prefix) {
      raw.prefix = `@@${name}/`;
    }
    this.processTypes(name, raw);
  }

  /**
   * read types from dirrectory
   * @param  {String}  dir dirrectory with types
   * @return {Promise<Redbone>} this
   */
  async readTypes(dir, prefix = null) {
    const scandir = require('../services/scandir');
    await scandir(dir, (file, name) => {
      this.processTypesDir(dir, file, name, prefix);
    });
    return this;
  }

  readTypesSync(dir, prefix = null) {
    const scandir = require('../services/scandirSync');
    scandir(dir, (file, name) => {
      this.processTypesDir(dir, file, name, prefix);
    });
    return this;
  }

  onError(client, action, err) {
    if (err.constructor.name === 'HttpError') {
      return client.dispatch({
        type: this.types.ERROR,
        code: err.code,
        status: err.statusMessage,
        message: err.message
      });
    }
    client.dispatch({ type: this.types.ERROR, err });
  }
}

Redbone.prototype.processTypes = processTypes;
Redbone.prototype.makeAction = makeAction;
Redbone.prototype.action = makeAction;

module.exports = Redbone;
