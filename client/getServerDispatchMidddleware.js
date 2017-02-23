const isPlainObject = require('lodash/isPlainObject');

var server_regexp = /^@@server\/.*?$/i

/**
 * Process client -> server dispatching
 * @param  {Socket} io socket.io connection to server
 * @return {Mided}  do not use it
 */
module.exports = function getServerDispatchMidddleware(io) {
  return function () {
    return function(next) {
      return function(action) {
        if (!isPlainObject(action)) return next(action);
        if (!action.type) return next(action);
        if (server_regexp.test(action.type)) {
          return io.emit('dispatch', action);
        }
        next(action);
      }
    }
  }
}
