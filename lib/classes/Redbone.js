const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const intel = require('intel');
const Socket = require('./Socket');

class Redbone {
  constructor(io) {
    this.io = io;
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

  isMiddleware(middleware) {
    if (!isFunction(middleware)) {
      throw new TypeError('middleware is not a function');
    }
    return true;
  }

  use(middleware) {
    this.isMiddleware(middleware);
    this.middlewares.push(middleware);
    return this;
  }

  watch(type, middleware) {
    this.isMiddleware(middleware);
    this.watchers.set(type, middleware);
    return this;
  }

  catch(middleware) {
    this.isMiddleware(middleware);
    intel.verbose('Replace default redbone err handler');
    this.catcher = middleware;
  }

  dispatch(action) {
    this.io.emit('dispatch', action);
    return this;
  }

  dispatchTo(id, action) {
    const socket = this.io.sockets.connected[id];
    if (!socket) throw new TypeError('undefined is not a socket');
    Socket.dispatch(socket, action);
    return this;
  }

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

  async run(socket, action) {
    socket = new Socket(socket, this);
    try {
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

  async runWatchers(socket, action) {
    if (!(action && isString(action.type))) {
      return intel.error('action.type should be a string');
    }
    const watcher = this.watchers.get(action.type);
    if (!watcher) throw new TypeError('watcher is not defined');
    try {
      await watcher(socket, action);
    } catch (err) {
      this.catcher(socket, action, err);
    }
    return this;
  }

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

  default() {
    this.use(require('../middlewares/intel'));
    return this;
  }

  onError(socket, action, err) {
    if (err.name === 'HttpError') {
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
