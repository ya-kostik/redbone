class Socket {
  constructor(socket) {
    this.nativeSocket = socket;
  }

  get id() {
    return this.nativeSocket.id;
  }

  get io() {
    return this.nativeSocket.io;
  }

  dispatch(action) {
    this.nativeSocket.emit('dispatch', action);
  }
}
