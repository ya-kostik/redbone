const MainClient = require('../../Client');

class Client extends MainClient {
  dispatcher(action) {
    const res = this.__nativeRes;
    const body = Buffer.from(JSON.stringify(action));
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    });
    res.write(body);
    res.end();
  }
}

module.exports = Client;
