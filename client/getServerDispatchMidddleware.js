const isPlainObject = require('lodash/isPlainObject');
const assign = require('lodash/assign');

var server_regexp = /^@@server\/.*?$/i
var defaultOptions = {
  next: false,
  exclude: null,
  event: 'dispatch'
}

/**
 * Process client -> server dispatching
 * @param  {Socket} io - socket.io connection to server
 * @param  {Object} options - action processing options
 * @param  {Boolean} options.next - process server action or not
 * @param  {Array} options.exclude - list of disallowed server action types
 * @return {Mided}  - do not use it
 */
module.exports = function getServerDispatchMiddleware(io, options) {
  let middlewareOptions = options ? assign(defaultOptions, options) : defaultOptions;

  return function () {
    return function(next) {
      return function(action) {
        if (!isPlainObject(action)) return next(action);
        if (!action.type) return next(action);
        if (server_regexp.test(action.type)) {
          if (!middlewareOptions.exclude || middlewareOptions.exclude.indexOf(action.type) === -1) {
            if (middlewareOptions.next === false) {
              return io.emit(options.event, action);
            } else {
              io.emit(options.event, action);
            }
          }
        }
        next(action);
      }
    }
  }
}
