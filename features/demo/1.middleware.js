module.exports = function(socket, action) {
  if (action.type === '@@TEST1') {
    socket.set({ test: true });
  } else if (action.type === '@@TEST2') {
    if (!socket.get('test')) {
      throw new Error('test is not defined');
    }
    this.tested = true;
  }
};
