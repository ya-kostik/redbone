const isString = require('lodash/isString');
const isNot = require('./isNot');

/**
 * Compare action and type
 * @param  {Action}  action
 * @param  {HandlerType}  type   [description]
 * @return {Boolean} result of comparison
 */
function isActionOfType(action, type) {
  isNot(action, 'valid action', 'action');
  isNot(type, 'string or regexp', 'type');

  return isString(type)
    ? action.type === type
    : type.test(action.type);
}

module.exports = isActionOfType;
