/* global expect */

function inspectMiddlewares(middlewares, count = 1) {
  for (const middleware of middlewares) {
    expect(middleware.mock.calls.length).toBe(count);
  }
}

module.exports = inspectMiddlewares;
