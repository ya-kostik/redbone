const path = require('path');
const isArray = require('lodash/isArray');
const isString = require('lodash/isString');
const isFunction = require('lodash/isFunction');

const RedboneError = require('../Errors/RedboneError');
const dispatcher = require('./dispatcher');
const Socket = require('./Socket');
const scandir = require('./scandir');
const scandirSync = require('./scandirSync');

const handleError = require('./handleError');
const intel = require('../middlewares/intel');

/**
 * onConnect event handler
 * @param  {Socket} socket is connection to client
 */
function onConnection(socket) {
  dispatcher(socket, { type: '@@server/CONNECTION' });
  const synteticSocket = new Socket(socket);
  socket.on('dispatch', (action) => dispatcher(synteticSocket, action));
  socket.on('disconnect', () => dispatcher(synteticSocket, { type: '@@server/DISCONNECT' }));
}

/**
 * redbone just add water init function
 * @param  {Object}   io Socket io instance
 * @return {Function} redbone function to chain
 */
function redbone(io) {
  if (redbone.io) {
    redbone.io.removeListener('connection', onConnection);
    redbone.io = null;
  }
  io.on('connection', onConnection);
  redbone.io = io;
  return redbone;
}

/**
 * Dispatch action to all clients
 * @param  {Object|String} action to dispatch
 */
redbone.dispatch = function dispatch(action) {
  if (!redbone.io) throw new RedboneError('Redbone is not inited');
  Socket.dispatch(redbone.io, action);
}
redbone.dispatchAll = redbone.dispatch;

/**
 * Direct dispatch to client by id of socket
 * @param  {String}        socket_id — socket.io socket id
 * @param  {Object|String} action to dispatch
 */
redbone.dispatchTo = function dispatchTo(socket_id, action) {
  if (!redbone.io) throw new RedboneError('Redbone is not inited');
  const socket = redbone.io.sockets.connected[socket_id];
  if (!socket) throw new RedboneError('Socket not found');
  Socket.dispatch(socket, action);
}

/**
 * set intel verbose logging and default catch function
 * @return {Function} redbone function to chain
 */
redbone.default = function redbone_default() {
  dispatcher.use(intel);
  dispatcher.catch(handleError);
  return redbone;
};

/**
 * use proxy to dispatcher.use
 * @param  {Function} middleware function to process data before they handle by watchers
 * @return {Function} redbone function to chain
 */
redbone.use = function use(middleware) {
  dispatcher.use(middleware);
  return redbone;
};

/**
 * catch proxy to dispatcher.catch
 * @param  {Function} error handler to process errors
 * @return {Function} redbone function to chain
 */
redbone.catch = function redbone_catch(handler) {
  dispatcher.catch(handler);
  return redbone;
}

/**
 * watch proxy to dispatcher.watch
 * @param  {String}   type action.type of redux action object
 * @param  {Function} fn   callback function to process watched data (socket, action, next)
 * @return {Function} redbone function to chain
 */
redbone.watch = function watch(type, fn) {
  dispatcher.watch(type, fn);
  return redbone;
}

/**
 * Watchers autoloader
 * Read files in the dir dirrectory, and add watchers from them to redbone watch
 * @param  {String} dir path to dir
 * @return {Promise}
 */
redbone.readWatchers = function readWatchers(dir) {
  return scandir(dir, function(file) {
    const watchers = require(path.join(dir, file));
    if (!isArray(watchers)) throw new RedboneError('Watchers is not an array');
    watchers.forEach((watcher) => {
      if (!(watcher.type && isString(watcher.type))) throw new RedboneError('Watcher type is not defined');
      if (!(watcher.action && isFunction(watcher.action))) throw new RedboneError('Watcher action is not defined');
      redbone.watch(watcher.type, watcher.action);
    });
  });
}

/**
 * Watchers autoloader
 * Read files in the dir dirrectory, and add watchers from them to redbone watch
 * @param  {String} dir path to dir
 * @return {Function} redbone function to chain
 */
redbone.readWatchersSync = function readWatchersSync(dir) {
  scandirSync(dir, function(file) {
    const watchers = require(path.join(dir, file));
    if (!isArray(watchers)) throw new RedboneError('Watchers is not an array');
    watchers.forEach((watcher) => {
      if (!(watcher.type && isString(watcher.type))) throw new RedboneError('Watcher type is not defined');
      if (!(watcher.action && isFunction(watcher.action))) throw new RedboneError('Watcher action is not defined');
      redbone.watch(watcher.type, watcher.action);
    });
  });
  return redbone;
}

redbone.dispatcher = dispatcher;
redbone.Socket = Socket;
redbone.RedboneError = RedboneError;

module.exports = redbone;
