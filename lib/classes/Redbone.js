const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const intel = require('intel');
const Socket = require('./Socket');
const EventEmitter = require('events');

/**
 * Redbone main class
 * @class Redbone
 * @prop {Object}   io          socket.io instance
 * @prop {Array}    middlewares array of middlewares
 * @prop {Map}      watchers    watchers map; keys — type for watcher fn
 * @prop {Function} catcher     function to process errors
 * @prop {Object}   types       default redbone types for socket lifecicle actions
 */
class Redbone extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    io.on('connection', (socket) => {
      const synteticSocket = new Socket(socket, this);
      this.run(synteticSocket, { type: this.types.CONNECTION });
      socket.once('disconnect', () => {
        this.run(synteticSocket, { type: this.types.DISCONNECT });
      });
      socket.on('dispatch', (action) => this.run(synteticSocket, action));

    });
    this.middlewares = [];
    this.watchers = new Map();
    this.catcher = this.onError;
    this.types = {
      CONNECTION: '@@server/CONNECTION',
      DISCONNECT: '@@server/DISCONNECT',
      ERROR:      '@@redbone/ERROR'
    }
    this.dispatch.to = this.dispatchTo.bind(this);
  }

  /**
   * Check is middleware is a function
   * @param  {Function}  middleware middleware function
   * @return {Boolean}              ttue, if middleware is valid
   */
  isMiddleware(middleware) {
    if (!isFunction(middleware)) {
      throw new TypeError('middleware is not a function');
    }
    return true;
  }

  /**
   * use middleware
   * @param  {Function}  middleware middleware function
   * @return {Redbone}              this
   */
  use(middleware) {
    this.isMiddleware(middleware);
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
    this.isMiddleware(middleware);
    this.watchers.set(type, middleware);
    return this;
  }

  /**
   * set catcher function
   * @param  {Function}  middleware middleware function for error process
   * @return {Redbone}              this
   */
  catch(middleware) {
    this.isMiddleware(middleware);
    intel.verbose('Replace default redbone err handler');
    this.catcher = middleware;
    return this;
  }

  /**
   * dispatch action to all clients
   * @param  {Object}  action do dispatch
   * @return {Redbone}        this
   */
  dispatch(action) {
    this.io.emit('dispatch', action);
    return this;
  }

  /**
   * dispatch to client by id
   * @param  {Object}  action to dispatch
   * @return {Redbone}        this
   */
  dispatchTo(id, action) {
    const socket = this.io.sockets.connected[id];
    if (!socket) throw new TypeError('undefined is not a socket');
    Socket.dispatch(socket, action);
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
      this.watch(watcher.type, watcher.action);
    });
    return this;
  }

  /**
   * run socket lifecicle with action
   * @param  {Socket}  socket   syntetic Socket
   * @param  {Object}  action   to dispatch
   * @return {Promise<Redbone>} this
   */
  async run(socket, action) {
    try {
      this.emit('dispatch', socket, action);
      for (const middleware of this.middlewares) {
        const result = await middleware(socket, action);
        if (result === false) return;
      }
      await this.runWatchers(socket, action);
    } catch (err) {
      return this.catcher(socket, action, err);
    }
    return this;
  }

  /**
   * find and run watchers
   * @param  {Socket}  socket   syntetic Socket
   * @param  {Object}  action   to dispatch
   * @return {Promise<Redbone>} this
   */
  async runWatchers(socket, action) {
    if (!(action && isString(action.type))) {
      return intel.error('action.type should be a string');
    }
    const watcher = this.watchers.get(action.type);
    if (!watcher) return this;
    try {
      await watcher(socket, action);
    } catch (err) {
      this.catcher(socket, action, err);
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
   * use default redbone options
   * @return {Redbone}        this
   */
  default() {
    this.use(require('../middlewares/intel'));
    return this;
  }

  onError(socket, action, err) {
    if (err.constructor.name === 'HttpError') {
      return socket.dispatch({
        type: this.types.ERROR,
        code: err.code,
        status: err.statusMessage,
        message: err.message
      });
    }
    socket.dispatch({ type: this.types.ERROR, err });
  }
}

module.exports = Redbone;
