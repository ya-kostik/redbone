const dispatcher = require('./dispatcher');
const Socket = require('Socket');
const intel = require('../middlewares/intel');
const handleError = require('./handleError');

/**
 * redbone just add water init function
 * @param  {Object}   io Socket io instance
 * @return {Function} redbone function to chain
 */
function redbone(io) {
  io.on('connection', (socket) => {
    dispatcher(socket, { type: '@@server/CONNECTION' });
    socket.on('dispatch', (action) => dispatcher(socket, action));
    socket.on('disconnect', () => dispatcher(socket, { type: '@@server/DISCONNECT' }));
  });
  return redbone;
}

/**
 * set intel verbose logging and default catch function
 * @return {Function} redbone function to chain
 */
redbone.default = function redbone_default() {
  dispatcher.use(intel);
  dispatcher.catch(handleError);
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
 * catch proxy to dispatcher.watch
 * @param  {String}   type action.type of redux action object
 * @param  {Function} fn   callback function to process watched data (socket, action, next)
 * @return {Function} redbone function to chain
 */
redbone.watch = function watch(type, fn) {
  dispatcher.watch(type, fn);
  return redbone;
}

redbone.dispatcher = dispatcher;
redbone.Socket = Socket;
