const intel = require('intel');
module.exports = function(socket, action) {
  intel.verbose('dispatch -> ' + action.type);
};
