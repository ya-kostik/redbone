/* global jest */

function createMiddlewares(count, cb) {
  const middlewares = [];
  for (let i = 0; i < count; i++) {
    middlewares.push(jest.fn(cb));
  }

  return middlewares;
}

module.exports = createMiddlewares;
