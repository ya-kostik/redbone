const isString = require('lodash/isString');
const isFunction = require('lodash/isFunction');
const isRegExp = require('lodash/isRegExp');
const isObject = require('lodash/isObject');

function isStringOrRegExp(value) {
  return isString(value) || isRegExp(value);
}

function isAction(value) {
  return isObject(value) && value.type;
}

const types = {
  'string': isString,
  'function': isFunction,
  'string or regexp': isStringOrRegExp,
  'valid action': isAction
};

module.exports = function isNot(value, type, name) {
  const is = types[type];
  if (!is(value)) {
    throw new TypeError(`${name} is not a ${type}`);
  }
};
