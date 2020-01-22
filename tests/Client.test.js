/* global test expect describe jest */
const ErrorText = {
  ACTION_INVALID: 'is not a valid action',
  CLIENT_SEND: 'send method is not implemented'
}

const Client = require('./mocks/TestClient');
const MainClient = require('../classes/Client');

describe('Client class', () => {
  test('calls run for dispatch method', () => {
    const client = new Client();
    const type = 'test';

    client.native = jest.fn((action) => {
      expect(action.type).toBe(type);
    });

    client.dispatch({ type });

    expect(client.native.mock.calls.length).toBe(1);
  });

  test('creates action from type', () => {
    const client = new Client();
    const type = 'test';
    const payload = {};

    const onlyType = jest.fn((action) => {
      expect(action.type).toBe(type);
      expect(action.payload).not.toBeDefined();
    });

    const withPayload = jest.fn((action) => {
      expect(action.type).toBe(type);
      expect(action.payload).toBe(payload);
    });

    client.native = onlyType;
    client.dispatch(type);

    client.native = withPayload;
    client.dispatch(type, payload);

    expect(onlyType.mock.calls.length).toBe(1);
    expect(withPayload.mock.calls.length).toBe(1);
  });

  test('doesn\'t take invalid action', () => {
    const client = new Client();

    expect(() => client.dispatch({})).toThrow(ErrorText.ACTION_INVALID);
    expect(() => client.dispatch()).toThrow(ErrorText.ACTION_INVALID);
    expect(() => client.dispatch(null)).toThrow(ErrorText.ACTION_INVALID);
  });

  test('sets `native` and `transport` from constructor', () => {
    const native = () => {};
    const transport = Object.create(null);
    const client = new Client({ native, transport });

    expect(client.native).toBe(native);
    expect(client.transport).toBe(transport);
  });

  test('throws error when send is not implemented', () => {
    class InvalidClient extends MainClient {}
    const client = new InvalidClient();

    const type = 'test';

    expect(() => client.dispatch({ type })).toThrow(ErrorText.CLIENT_SEND);
  });
});
