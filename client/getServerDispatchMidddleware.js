const isPlainObject = require('lodash/isPlainObject');
const merge = require('lodash/merge');

var server_regexp = /^@@server\/.*?$/i
var defaultOptions = {
  next: false
}

/**
 * Process client -> server dispatching
 * @param  {Socket} io socket.io connection to server
 * @param  {Object} options action processing options
 * @return {Mided}  do not use it
 */
module.exports = function getServerDispatchMiddleware(io, options) {
  let middlewareOptions = options ? merge(defaultOptions, options) : defaultOptions;

  return function () {
    return function(next) {
      return function(action) {
        if (!isPlainObject(action)) return next(action);
        if (!action.type) return next(action);
        if (server_regexp.test(action.type)) {
          if (middlewareOptions.next === false) {
            return io.emit('dispatch', action);
          } else {
            io.emit('dispatch', action);
          }
        }
        next(action);
      }
    }
  }
}
