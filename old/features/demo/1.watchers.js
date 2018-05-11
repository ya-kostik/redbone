module.exports = [{
  type: '@@TEST', action: function(socket) {
    socket.dispatch({ type: "@@TEST_ECHO" });
  }
}];
