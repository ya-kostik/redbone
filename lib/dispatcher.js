const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const Promise = require('bluebird');
const intel = require('intel');
const Socket = require('./Socket');


const GeneratorFunction = (function* () {}).constructor;

/**
 * Выполняет цепочку middleware после выполняет наблюдаемые функции
 * @param  {Socket} socket соединение с клиентом
 * @param  {Object} action действие направленное на сервер
 */
function dispatcher(socket, action) {
  if (!(socket instanceof Socket)) {
    socket = new Socket(socket);
  }
  //Если список middleware пуст
  if (!dispatcher.__fns.length) return;

  //Функция обработчик
  function run(index) {
    //Берем middleware по индексу и передаем в него параметры, в том числе next
    try {
      dispatcher.__fns[index](socket, action, function(err) {
        //Если next(err) процессим ошибку
        if (err) return dispatcher.__error(socket, err);
        //Если последняя middleware умираем
        if (!dispatcher.__fns[index + 1]) return dispatcher.__callWatchers(socket, action);
        //Если не последняя, то берем следующую
        run(index + 1);
      });
    } catch(err) {
      dispatcher.__error(socket, err);
    }
  }
  run(0);
}

/**
 * Обработчик ошибок из цепочки middleware, если такая вернется в next
 * @param  {Error} err  ошибка переданная в next
 * @return {Error}      таже ошибка, что и была переданна
 */
dispatcher.__error = function __error(socket, err) {
  if (!dispatcher.__errFn) throw err;
  dispatcher.__errFn(socket, err);
  return err;
}

/**
 * Регистрирует обработчик ошибки, переписывает старый, если такой есть
 * @param  {Function} fn Обрабочик ошибки из цепочки, принимает err — ошибка
 * @return {Function} dispatcher возвращает dispatcher для возможности связывания
 * @api public
 */
dispatcher.catch = function(fn) {
  if (!isFunction(fn)) throw new TypeError('catch fn is not a function');
  if (dispatcher.__errFn) intel.verbose('Replace dispatcher err function');
  dispatcher.__errFn = fn;
  return dispatcher
}

/**
 * Массив функций для цепочки выполнения
 * @type {Array}
 * @api private
 */
dispatcher.__fns = [];

/**
 * Добавляет функцию в цепочку middleware
 * @param  {Function} middleware — функция цепочки. Принимает три параметра socket, action, next — необходимо вызвать чтобы продолжить цепочку
 * @return {Function} dispatcher возвращает dispatcher для возможности связывания
 * @api public
 */
dispatcher.use = function use(middleware) {
  if (!isFunction(middleware)) throw new TypeError('middleware is not a function');
  dispatcher.__fns.push(middleware);
  return dispatcher;
}

/**
 * Массив функций для цепочки выполнения
 * @type {Object}
 * @api private
 */
dispatcher.__watchers = new Map();

/**
 * Регистрирует наблюдатель за определенным типом
 * @param  {String}   type тип action за которым следует наблюдать
 * @param  {Function} fn   функция обратного вызова, которая будет вызвана
 * @return {Function} dispatcher возвращает dispatcher для возможности связывания
 * @api public
 */
dispatcher.watch = function watch(type, fn) {
  if (!isFunction(fn)) throw new TypeError('fn is not a function');
  if (!dispatcher.__watchers.has(type)) dispatcher.__watchers.set(type, []);
  if (fn instanceof GeneratorFunction) {
    fn = Promise.coroutine(fn);
  }
  dispatcher.__watchers.get(type).push(fn);
  return dispatcher
};

/**
 * Обабатывает наблюдателей
 * @param  {Socket} socket соединение с клиентом
 * @param  {Object} action action, который пришел от клиента
 */
dispatcher.__callWatchers = function(socket, action) {
  if (!(action && action.type && isString(action.type))) {
    return intel.error('action type is not an string');
  }
  const watchers = dispatcher.__watchers.get(action.type);
  if (!watchers) return;
  try {
    watchers.forEach((watcher) => {
      const promise = watcher(socket, action, function(err) {
        if (err) return dispatcher.__error(socket, err);
      });
      if (promise && promise.catch) {
        promise.catch((err) => dispatcher.__error(socket, err));
      }
    });

  } catch(err) {
    dispatcher.__error(socket, err);
  }
}

module.exports = dispatcher;
