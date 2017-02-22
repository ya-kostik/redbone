const readdirSync = require('fs').readdirSync;
const isFunction = require('lodash/isFunction');

/**
 * Перебирает каждый файл в директории на поиск js, игнорирует index.js и другие не .js файлы
 * @param  {String}   dir  Директория для сканирования и перебора
 * @param  {Function} each Функция которая будет вызвана для каждого элемента. Принимает два аргумента: file — имя фала, name — имя файла без .js на конце
 * @return {Promise}       Промис. При успешном выполнении вернет список файлов с .js на конце
 */
function scandir(dir, each) {
  const files = readdirSync(dir)
  const out = [];
  for (const file of files) {
    if (file === 'index.js') continue;
    if (file.slice(-3) !== '.js') continue;
    if (isFunction(each)) {
      each(file, file.slice(0, -3));
    }
    out.push(file);
  }
  return out;
}

module.exports = scandir;
