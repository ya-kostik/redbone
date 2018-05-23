const isFunction = require('lodash/isFunction');
/**
 * Check is middleware is a function
 * @param  {Function}  middleware middleware function
 * @return {Boolean}              true, if middleware is valid
 */
module.exports = function isMiddleware(middleware) {
  if (!isFunction(middleware)) {
    throw new TypeError('middleware is not a function');
  }
  return true;
}
