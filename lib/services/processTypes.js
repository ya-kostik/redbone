const createTypes = require('./createTypes');
const CL_TYPES = ['PUSH', 'POP', 'SHIFT', 'UNSHIFT', 'SET', 'SETUP', 'REMOVE'];

/**
 * Add types to name of redbone types
 * @param  {String} name name of types group
 * @param  {Object} raw  object with prefixes and types
 * @return {Redbone}     this
 */
function processTypes(name, raw) {
  if (!Array.isArray(raw.types)) {
    throw new TypeError('types is not an array');
  }
  if (!raw.prefix) {
    throw new TypeError('types is not defined');
  }
  if (!name) {
    throw new TypeError('name is not defined');
  }
  if (raw.isCollection) {
    raw.types = raw.types.concat(CL_TYPES);
  }
  this.types[name] = createTypes(raw.prefix, raw.types);
  return this;
}

module.exports = processTypes;
