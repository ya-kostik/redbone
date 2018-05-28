const isObject = require('lodash/isObject');
const isFunction = require('lodash/isFunction');
const TYPES = require('./RPC.TYPES');
const HttpError = require('../../Errors/HttpError');
const isMiddleware = require('../services/isMiddleware');

/**
 * Redbone's Remote procedure call
 * @class RPC
 * @prop {Redbone|null} redbone — redbone's instance. Will be null before redbone.extension(rpc)
 * @prop {Object} libs — hash of all libs
 */
class RPC {
  constructor() {
    this.libs = {};
    this.middlewares = [];
    this.libsMiddlewares = {};
    this.modulesMiddlewares = {};
    this.methodsMiddlewares = {};
    this.eventsMiddlewares = {};
    this.redbone = null;
    this.types = {
      'server/rpc': TYPES.server,
      'client/rpc': TYPES.client
    }
    this._callWatcher = this._callWatcher.bind(this);
    this._subWatcher = this._subWatcher.bind(this);
    this._unsubWatcher = this._unsubWatcher.bind(this);
  }

  /**
   * check, is name correct?
   * @param  {String} name your name
   * @return {RPC}         this
   */
  checkName(name) {
    if (typeof name !== 'string') {
      throw new TypeError('name is not a string');
    }
    if (!name.length) {
      throw new TypeError('name is empty');
    }
    return this;
  }

  /**
   * check, is module name correct?
   * @param  {String} name lib.module name
   * @return {Array}       name splited by dot
   */
  checkModuleName(name) {
    const split = name.split('.');
    if (split.length !== 2) {
      if (split.length !== 1) {
        throw new TypeError('invalid name of module, it should be string with two dot notated values');
      }
      split.unshift('main');
    }
    return split;
  }

  /**
   * set lib for RPC
   * @param {String} [name='main'] of lib
   * @param {Object} lib  hash of modules to call
   * @return {RPC}        this
   */
  setLib(name, lib) {
    if (isObject(name)) {
      lib = name;
      name = 'main'
    }
    this.checkName(name);
    if (!isObject(lib)) throw new TypeError('lib is not an object');
    this.libs[name] = lib;
    return this;
  }

  /**
   * returns lib by name
   * @param  {String} [name='main'] of lib
   * @return {Object}          lib
   */
  getLib(name = 'main') {
    return this.libs[name] || null;
  }

  /**
   * returns module by "lib.module" name
   * @param  {String} name lib.module name
   * @return {Object|null} module
   */
  getModule(name) {
    this.checkName(name);
    const split = this.checkModuleName(name);
    const lib = this.getLib(split[0]);
    if (!lib) return null;
    const module = lib[split[1]];
    if (!isObject(module)) return null;
    return module;
  }

  /**
   * remove lib from RPC
   * @param  {String} name of lib
   * @return {RPC}         this
   */
  removeLib(name) {
    delete this.checkName(name).libs[name];
    return this;
  }

  /**
   * set module by doted name
   * if lib does not exists, create it
   * @param {String} name lib.module name
   * @param {Object} module to add
   */
  setModule(name, module) {
    this.checkName(name);
    const split = this.checkModuleName(name);
    if (!isObject(module)) throw new TypeError('module is not an object');
    let lib = this.libs[split[0]];
    if (!lib) {
      lib = {};
      this.libs[split[0]] = lib;
    }
    this.libs[split[0]][split[1]] = module;
  }

  /**
   * get middlewares by name and type
   * @param  {String} name          of lib or lib.module
   * @param  {String} [type='libs'] type of middlewares
   * @return {Array}                middlewares
   */
  _getMiddlewares(name, type = 'libs') {
    const place = this[`${type}Middlewares`];
    let middlewares = place[name];
    if (!middlewares) {
      middlewares = [];
      place[name] = middlewares;
    }
    return middlewares;
  }

  /**
   * use middleware;
   * you can rpc.use(middleware) to add middleware for all libs,
   * rpc(lib, middleware) to add middleware for a specific lib by name,
   * rpc(module, middleware) to add middleware for a specific module,
   * by name with dot notation (lib.module)
   * @param  {String} name       of lib or name.lib
   * @param  {Function} middleware
   * @return {RPC}               this
   */
  use(name, middleware) {
    if (!middleware) {
      middleware = name;
      name = null;
    }
    isMiddleware(middleware);
    if (!name) {
      this.middlewares.push(middleware);
      return this;
    }
    this.checkName(name);
    const split = name.split('.');
    let middlewares;
    if (split.length === 1) {
      middlewares = this._getMiddlewares(name);
    } else if (split.length === 2) {
      this.checkModuleName(name);
      middlewares = this._getMiddlewares(name, 'modules');
    } else if (split.length === 3) {
      this.checkModuleName(`${split[0]}.${split[1]}`);
      if (split[2] === '') throw new TypeError('name of method is invalid');
      middlewares = this._getMiddlewares(name, 'methods');
    } else {
      throw new TypeError('name is invalid');
    }
    middlewares.push(middleware);
    return this;
  }

  /**
   * check action. Is it valid?
   * @param  {Object} action to validate
   * @return {RPC} this
   */
  checkCallAction(action) {
    if (!action.module) {
      throw new HttpError(400, 'Module is not defined');
    }
    if (!action.method) {
      throw new HttpError(400, 'Method is not defined');
    }
    if (action.event) {
      throw new HttpError(400, 'Event can\'t be set in CALL type');
    }
    return this;
  }

  /**
   * create doted path from action params
   * @param  {Object} action
   * @return {String|Array}
   */
  makePathFromAction(action, isArray = false, addMethod = false) {
    if (isArray) {
      let path = [];
      if (action.lib) path[0] = action.lib + '';
      else path[0] = 'main';
      path[1] = action.module + '';
      if (addMethod) {
        if (action.method) path[2] = action.method + '';
        else if (action.event) path[2] = action.event + '';
      }
      return path;
    }
    let path = '';
    if (action.lib) path += action.lib + '.';
    path += action.module;
    if (addMethod) {
      if (action.method) path += '.' + action.method;
      else if (action.event) path += '.' + action.event;
    }
    return path;
  }

  /**
   * call all midllewares for a specific action
   * @param  {Client}  client
   * @param  {Object}  action
   * @param  {Array}   positions names of middlewares to call
   * @return {Promise}
   */
  async _callMiddlewares(client, action, positions = ['all', 'lib', 'module', 'method']) {
    const [lib, module, method] = this.makePathFromAction(action, true, true);
    const names = { lib, module, method };
    let name = '';
    for (const position of positions) {
      let middlewares;
      if (position === 'all') {
        middlewares = this.middlewares;
      } else {
        if (name.length) name += '.';
        if (position !== 'event') name += names[position];
        else name += names.method;
        middlewares = this[`${position}sMiddlewares`][name];
      }
      if (middlewares && middlewares.length) {
        for (const middleware of middlewares) {
          if ((await middleware(client, action)) === false) return false;
        }
      }
    }
    return true;
  }

  /**
   * Process action before making things with it
   * @param  {Client}  client    client of redbone connection
   * @param  {Object}  action    action
   * @param  {Array}  positions  names of middlewares to call
   * @return {Promise}
   */
  async _processActionBefore(client, action, positions) {
    const path = this.makePathFromAction(action);
    const resultFromMiddlewares = await this._callMiddlewares(client, action, positions);
    if (resultFromMiddlewares === false) return;
    const module = this.getModule(path);
    if (!module) throw new HttpError(404, 'Module not found');
    return { module, path };
  }

  makeOutAction(result, inAction, type) {
    if (!type) type = this.types['client/rpc'].RETURN;
    const out = {};
    if (inAction.merge && isObject(result)) {
      Object.assign(out, result);
    } else {
      out.payload = result;
    }
    if (inAction.backType && typeof inAction.backType === 'string') {
      out.type = inAction.backType;
    } else {
      out.type = type;
    }
    if (inAction.id !== undefined) out.id = inAction.id + '';
    return out;
  }

  /**
   * watcher for CALL type
   * @param  {Client} client
   * @param  {Object} action
   * @param  {String} action.type
   * @param  {String} [action.id]
   * @param  {String} action.backType
   * @param  {Mixed}  action.arguments
   * @param  {Boolean} action.flat
   * @param  {Boolean} action.merge
   */
  async _callWatcher(client, action) {
    this.checkCallAction(action);
    const { module } = await this._processActionBefore(client, action);
    if (!isFunction(module[action.method])) {
      throw new HttpError(404, 'Method not found');
    }
    let result;
    if (action.flat && Array.isArray(action.arguments)) {
      result = await module[action.method](...action.arguments);
    } else if (action.arguments !== undefined) {
      result = await module[action.method](action.arguments);
    } else {
      result = await module[action.method]();
    }
    const out = this.makeOutAction(result, action);
    client.dispatch(out);
  }

  /**
   * check subscribe action
   * @param  {Object} action
   * @return {RPC}    this
   */
  checkSubAction(action) {
    if (!action.module) {
      throw new HttpError(400, 'Module is not defined');
    }
    if (!action.event) {
      throw new HttpError(400, 'Method is not defined');
    }
    if (action.method) {
      throw new HttpError(400, 'Method can\'t be set in SUB and UNSUB types');
    }
    return this;
  }

  /**
   * make action for subscribe echo dispatch
   * @param  {String} type   of action
   * @param  {Object} action input action
   * @return {Object}        output action
   */
  makeSubAction(type, action) {
    const payload = {
      lib: action.lib || 'main',
      module: action.module,
      event: action.event
    };
    if (action.id) payload.id = action.id + '';
    return {
      type,
      payload
    }
  }

  /**
   * watcher for SUBSCRIBE action
   * @param  {Client}  client
   * @param  {Object}  action
   * @return {Promise}
   */
  async _subWatcher(client, action) {
    this.checkSubAction(action);
    const { module } = await this._processActionBefore(
      client, action, ['all', 'lib', 'module', 'event']
    );
    try {
      client.listenersCounter.add(module, action.event, (result) => {
        const out = this.makeOutAction(result, action, this.types['client/rpc'].EVENT);
        client.dispatch(out);
      });
    } catch(err) {
      if (err.message === 'model should be EventEmitter\'s instance') {
        throw new HttpError(400, 'Module is not defined');
      }
      throw err;
    }
    if (action.echo) {
      client.dispatch(this.makeSubAction(
        this.types['client/rpc'].SUBSCRIBED,
        action
      ));
    }
  }

  /**
   * watcher for UNSUBSCRIBE action
   * @param  {Client}  client
   * @param  {Object}  action
   * @return {Promise}        [description]
   */
  async _unsubWatcher(client, action) {
    this.checkSubAction(action);
    let name = action.lib ? action.lib : 'main';
    name += '.' + action.module;
    const module = this.getModule(name);
    client.listenersCounter.remove(module, action.event);
    if (action.echo) {
      client.dispatch(this.makeSubAction(
        this.types['client/rpc'].UNSUBSCRIBED,
        action
      ));
    }
  }

  /**
   * apply for redbone.extension
   */
  apply() {
    this.redbone.watch(this.types['server/rpc'].CALL, this._callWatcher);
    this.redbone.watch(this.types['server/rpc'].SUB, this._subWatcher);
    this.redbone.watch(this.types['server/rpc'].UNSUB, this._unsubWatcher);
  }
}

RPC.prototype.name = 'rpc';

module.exports = RPC;
