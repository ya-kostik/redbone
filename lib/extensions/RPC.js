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
    this.redbone = null;
    this.types = {
      'server/rpc': TYPES.server,
      'client/rpc': TYPES.client
    }
    this._callWatcher = this._callWatcher.bind(this);
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
  checkAction(action) {
    if (!action.module) {
      throw new HttpError(400, 'Module is not defined');
    }
    if (!action.method) {
      throw new HttpError(400, 'Method is not defined');
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
        path[2] = action.method + '';
      }
      return path;
    }
    let path = '';
    if (action.lib) path += action.lib + '.';
    path += action.module;
    if (addMethod) {
      path += '.' + action.method;
    }
    return path;
  }

  /**
   * call all midllewares for a specific action
   * @param  {Client}  client
   * @param  {Object}  action
   * @return {Promise}
   */
  async _callMiddlewares(client, action) {
    const [lib, module, method] = this.makePathFromAction(action, true, true);
    if (this.middlewares && this.middlewares.length) {
      for (const middleware of this.middlewares) {
        if ((await middleware(client, action)) === false) return false;
      }
    }
    if (this.libsMiddlewares[lib] && this.libsMiddlewares[lib].length) {
      for (const middleware of this.libsMiddlewares[lib]) {
        if ((await middleware(client, action)) === false) return false;
      }
    }
    let name = lib + '.' + module;
    if (this.modulesMiddlewares[name] && this.modulesMiddlewares[name].length) {
      for (const middleware of this.modulesMiddlewares[name]) {
        if ((await middleware(client, action)) === false) return false;
      }
    }
    name += '.' + method;
    if (this.methodsMiddlewares[name] && this.methodsMiddlewares[name].length) {
      for (const middleware of this.methodsMiddlewares[name]) {
        if ((await middleware(client, action)) === false) return false;
      }
    }
    return true;
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
    this.checkAction(action);
    const path = this.makePathFromAction(action);
    const resultFromMiddlewares = await this._callMiddlewares(client, action);
    if (resultFromMiddlewares === false) return;
    const module = this.getModule(path);
    if (!module) throw new HttpError(404, 'Module not found');
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
    const out = {};
    if (action.merge && isObject(result)) {
      Object.assign(out, result);
    } else {
      out.payload = result;
    }
    if (action.backType && typeof action.backType === 'string') {
      out.type = action.backType;
    } else {
      out.type = this.types['client/rpc'].RETURN;
    }
    if (action.id !== undefined) out.id = action.id + '';
    client.dispatch(out);
  }

  /**
   * apply for redbone.extension
   */
  apply() {
    this.redbone.watch(this.types['server/rpc'].CALL, this._callWatcher);
  }
}

RPC.prototype.name = 'rpc';

module.exports = RPC;
