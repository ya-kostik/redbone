const Client = require('../../classes/Client');

class TestClient extends Client {
  constructor() {
    super(...arguments);
  }

  send(action) {
    if (this.native) this.native(action);
  }
}

module.exports = TestClient;
