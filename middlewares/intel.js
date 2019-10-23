module.exports = function(socket, action, next) {
  console.info('dispatch -> ' + action.type);
  next();
};
