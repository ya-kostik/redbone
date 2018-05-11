const { defineSupportCode } = require('cucumber');
const Redbone = require('../index');
const assert = require('assert');
const path = require('path');
const EventEmitter = require('events');

class Model extends EventEmitter {}

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

  Given('добавим хуки моделей-событий-слушателей', function () {
    this.model = new Model();
    this.event = 'event';
    global.__model__ = this.model;
    global.__event__ = this.event;
    global.__eventListener__ = () => {};
  });

  Given('мы занесем сокет в переменные при коннекте', function() {
    global.__onConnection__ = (socket) => {
      this.socket = socket;
    }
  })

  Then('у модели будет слушатель', function () {
    assert(this.model.listenerCount(this.event) === 1);
  });

  Then('мы отключимся от сокета', function (callback) {
    this.io.close(callback);
    global.__onDisconnect__ = () => {
      callback();
    }
  });

  Then('у модели не останется слушателей', function (callback) {
    assert(this.model.listenerCount(this.event) === 0);
    callback();
  });

  Given('мы добавим к синтетическому сокету событие в sub', function () {
    this.socket.sub(this.model, 'pubevent', '@@client/TEST');
  });

  Given('добавим колбэк __onDispatch__', function () {
    this.client.on('dispatch', (action) => {
      this.action = action;
      global.__onDispatch__(action);
    });
  })

  Then('когда выстрелит событие из модели на клинете мы получим тип с данными', function (callback) {
    global.__onDispatch__ = (action) => {
      assert(action.type === '@@client/TEST');
      assert(action.payload === 'payload');
      callback();
    }
    this.model.emit('pubevent', 'payload');
  });

  Given('мы инициализируем Pubsub', function () {
    this.redbone.initPubsub();
  });

  Given('добавим в Pubsub модель', function () {
    this.redbone.pubsub.addSetOfModels({ Model: this.model });
  });

  Then('у редбона появятся вотчеры пабсаба', function () {
    assert(this.redbone.watchers.has(this.redbone.pubsub.TYPES.SUB) === true);
    assert(this.redbone.watchers.has(this.redbone.pubsub.TYPES.UNSUB) === true);
  });

  Then('при отправке действия {string}', function (action, callback) {
    this.redbone.pubsub.use(() => {
      setTimeout(() => {
        callback()
      }, 100);
    }, this.model)
    this.client.emit('dispatch', require(path.join(__dirname, action)));
  });


  After(function(callback) {
    if (this.io) this.io.close(callback);
    if (this.client) this.client.close(callback);
  });
});
