/* global test expect */

const HTTP = require('./');
const Redbone = require('../../Redbone');

test('create connector', () => {
  const connector = new HTTP();
  const redbone = new Redbone(connector);
  expect(redbone.connector).toBe(connector);
});
