const intel = require('intel');

module.exports = function(socket, action, next) {
  intel.verbose('dispatch -> ' + action.type);
  next();
};
