const TYPE = '@@redbone/SERVER_ERROR';

module.exports = function error(socket, err) {
  socket.dispatch({ type: TYPE, err });
}
