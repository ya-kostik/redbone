/* global describe test expect jest */
const Type = {
  IN: 'type in',
  OUT: 'type out'
}

const Client = require('./mocks/TestClient');
const Redbone = require('../classes/Redbone');

describe('Transports and two-way data flow', () => {
  test('two-way dispatch', async () => {
    const native = jest.fn((action) => {
      expect(action.type).toBe(Type.OUT);
    });
    const watcher = jest.fn((client, action) => {
      expect(action.type).toBe(Type.IN);
      client.dispatch({ type: Type.OUT });
    });

    const client = new Client({ native });
    const redbone = new Redbone();

    redbone.watch(Type.IN, watcher);
    await redbone.dispatch(client, { type: Type.IN });

    expect(watcher.mock.calls.length).toBe(1);
    expect(native.mock.calls.length).toBe(1);
  });
});
