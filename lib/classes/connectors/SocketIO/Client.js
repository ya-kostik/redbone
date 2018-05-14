const ClientMain = require('../../Client');

class Client extends ClientMain {
  constructor(id, redbone, connector) {
    super(id, redbone, connector);
    this.__nativeSocket = null;
  }

  dispatcher(action) {
    this.__nativeSocket.emit(this.connector.eventOut, action);
  }
}

module.exports = Client;
