const isObject = require('lodash/isObject');
const TYPES = require('./RPC.TYPES');

/**
 * Redbone's Remote procedure call
 * @class RPC
 * @prop {Redbone|null} redbone — redbone's instance. Will be null before redbone.extension(rpc)
 * @prop {Object} libs — hash of all libs
 */
class RPC {
  constructor() {
    this.libs = {};
    this.redbone = null;
    this.types = {
      'server/rpc': TYPES.server,
      'client/rpc': TYPES.client
    }
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
        throw new TypeError('invalid name, it should be string with two dot notated values');
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
}

RPC.prototype.name = 'rpc';

module.exports = RPC;
