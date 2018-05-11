const ClientMain = require('../../Client');

class Client extends ClientMain {
  constructor(id, redbone, socket, io) {
    super(id, redbone);
    this.__nativeSocket = socket;
    this.__io = io
  }

  dispatcher(action) {
    this.__nativeSocket.emit(this.__io.eventOut, action);
  }
}

module.exports = Client;
