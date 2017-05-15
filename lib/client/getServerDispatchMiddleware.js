var isPlainObject = require('lodash/isPlainObject');

var serverRegexp = /^@@server\/.*?$/i;
var defaultOptions = {
  next: false,
  exclude: null,
  include: null
};

/**
 * Process client -> server dispatching
 * @param  {Socket} io - socket.io connection to server
 * @param  {Object} options - action processing options
 * @param  {Boolean} options.next - process server action or not
 * @param  {Array} options.exclude - list of disallowed server action types
 * @param  {Array} options.include - list of allowed server action types
 * @return {Mided}  - do not use it
 */

module.exports = function getServerDispatchMiddleware(io, options) {
  var middlewareOptions = options ? Object.assign(defaultOptions, options) : defaultOptions;

  return function () {
    return function (next) {
      return function (action) {
        if (!isPlainObject(action)) return next(action);
        if (!action.type) return next(action);
        if (serverRegexp.test(action.type)) {
          io.emit('dispatch', action);
          if (middlewareOptions.next) {
            if (options.exclude
                && options.exclude.indexOf
                && options.exclude.indexOf(action.type) !== -1) return;
            if (options.include
                && options.include.indexOf
                && options.include.indexOf(action.type) === -1) return;
            next(action);
          }
          return;
        }
        next(action);
      };
    };
  };
};
