'use strict';

var isPlainObject = require('node_modules/lodash/isPlainObject');
var assign = require('node_modules/lodash/assign');

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
  var middlewareOptions = options ? assign(defaultOptions, options) : defaultOptions;

  return function () {
    return function (next) {
      return function (action) {
        if (!isPlainObject(action)) return next(action);
        if (!action.type) return next(action);
        if (serverRegexp.test(action.type)) {
          var allowedType = (!middlewareOptions.exclude || middlewareOptions.exclude.indexOf(action.type) === -1) && (!middlewareOptions.include || middlewareOptions.include.indexOf(action.type) !== -1);

          if (!middlewareOptions.next || middlewareOptions.next && !allowedType) {
            return io.emit('dispatch', action);
          } else {
            io.emit('dispatch', action);
          }
        }
        next(action);
      };
    };
  };
};
