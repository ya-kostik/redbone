const { defineSupportCode } = require('cucumber');
const Redbone = require('../index');
const assert = require('assert');
const path = require('path');

defineSupportCode(({ Given, Then, After }) => {
  Given('мы создадим io на порту {int}', function(port) {
    this.io = require('socket.io')(port);
  });
  Given('мы создадим экземпляр редбона', function () {
    this.redbone = new Redbone(this.io);
  });
  Then('экземпляр будет создан', function(callback) {
    if (!this.redbone) throw new TypeError('redbone not defined');
    callback();
  });
  Given('мы добавим мидлвару которая запишет свое выполнение в this.mw', function() {
    this.redbone.use((socket, action) => {
      if (!this.types) this.types = [];
      this.types.push(action.type);
      if (this.mw === undefined) {
        this.mw = true;
      } else {
        this.mw = this.mw && true;
      }
    });
  });
  Given('мы подключимся к сокету на порту {int}', function(port, callback) {
    this.clientIO = require('socket.io-client');
    this.client = this.clientIO(`http://localhost:${port}`);
    this.io.once('connection', () => {
      callback()
    });
  });
  Then('в this.mw будет true', function() {
    assert.strictEqual(this.mw, true);
  });
  Then('в this.types появится {string}', function (type) {
    assert.notStrictEqual(this.types.indexOf(type), -1);
  });
  Given('мы добавим мидлвару {string}', function (pathToMiddleware) {
    this.redbone.use(
      require(path.join(__dirname, pathToMiddleware)).bind(this)
    );
  });
  Given('произойдет dispatch с типом {string}', function (type, callback) {
    this.client.emit('dispatch', { type });
    this.redbone.once('dispatch', (socket, action) => {
      if (action.type === type) callback();
    });
  });
  Then('все будет протестировано', function () {
    assert.strictEqual(this.tested, true);
  });
  Given('мы добавим вотчеры {string}', function (pathToWatchers) {
    this.redbone.processWatchers(require(path.join(__dirname, pathToWatchers)));
  });
  Then('на клиенте мы получим диспатч с типом {string}', function (type, callback) {
    this.client.once('dispatch', (action) => {
      assert.strictEqual(action.type, type);
      this.client.disconnect();
      callback();
    });
  });

  After(function(callback) {
    if (this.io) this.io.close(callback);
    if (this.client) this.client.close(callback);
  });
});
