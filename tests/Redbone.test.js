/* global jest describe test expect */
const ACTION_ERROR_TEXT = 'is not a valid action';

const Redbone = require('../classes/Redbone');

const Client = require('./mocks/TestClient');

function getTestWatcher(redbone, client, type) {
  return (client, action) => {
    expect(action.type).toBe(type);
    expect(client).toBe(client);
    expect(client.redbone).toBe(redbone);
  };
}

describe('Redbone class', () => {
  test('returns watchers by type', () => {
    const redbone = new Redbone();
    const type = 'test';

    const plainWatcher = jest.fn();
    const regexWatcherOne = jest.fn();
    const regexWatcherTwo = jest.fn();
    const regexWatcherThree = jest.fn();
    const allWatcherGoneFirst = jest.fn();

    redbone.watch(type, plainWatcher);
    redbone.watch(/^test/, regexWatcherOne);
    redbone.watch(/st$/, regexWatcherTwo);
    redbone.watch(/(bla)+?/, regexWatcherThree);
    redbone.watch(allWatcherGoneFirst);

    const watchers = redbone.watchers.get(type);
    expect(watchers).toBeInstanceOf(Array);
    expect(watchers.length).toBe(4);

    const testWatchers = [
      allWatcherGoneFirst, plainWatcher, regexWatcherOne, regexWatcherTwo
    ];
    testWatchers.forEach((watcher, index) => {
      expect(watchers[index]).toBe(watcher);
    });
  });

  test('takes a watcher', async () => {
    const redbone = new Redbone();
    const client = new Client();

    const type = 'test';

    const watcher = getTestWatcher(redbone, client, type);

    const plainWatcher = jest.fn(watcher);
    const regexpWatcher = jest.fn(watcher);

    redbone.watch(type, plainWatcher);
    /* eslint-disable-next-line */
    redbone.watch(new RegExp(`^${type}`), regexpWatcher);



    await redbone.dispatch(client, { type });
    expect(plainWatcher.mock.calls.length).toBe(1);
    expect(regexpWatcher.mock.calls.length).toBe(1);
  });

  test('don\'t takes invalid action', () => {
    const redbone = new Redbone();
    const client = new Client();
    // test action without type
    expect(redbone.dispatch(client, {})).rejects.toThrow(ACTION_ERROR_TEXT);
    // test string action
    expect(redbone.dispatch(client, 'test')).rejects.toThrow(ACTION_ERROR_TEXT);
    // test no action
    expect(redbone.dispatch(client)).rejects.toThrow(ACTION_ERROR_TEXT);
    expect(redbone.dispatch(client, null)).rejects.toThrow(ACTION_ERROR_TEXT);
  });

  test('uses before middlewares for all types', async () => {
    const redbone = new Redbone();
    const client = new Client();

    const type = 'test';

    const watcher = getTestWatcher(redbone, client, type);
    const firstMiddleware = jest.fn((watcher));
    const secondMiddleware = jest.fn(watcher);
    const stopMiddleware = jest.fn(() => false);
    const testWatcher = jest.fn();

    redbone.use(firstMiddleware);
    redbone.use(secondMiddleware);
    redbone.watch(type, testWatcher);

    await redbone.dispatch(client, { type });

    expect(firstMiddleware.mock.calls.length).toBe(1);
    expect(secondMiddleware.mock.calls.length).toBe(1);
    expect(testWatcher.mock.calls.length).toBe(1);

    // Direct call use of before
    redbone.before.use(stopMiddleware);

    await redbone.dispatch(client, { type });

    expect(firstMiddleware.mock.calls.length).toBe(2);
    expect(secondMiddleware.mock.calls.length).toBe(2);
    expect(stopMiddleware.mock.calls.length).toBe(1);
    expect(testWatcher.mock.calls.length).toBe(1);
  });

  test('uses after middlewares for all types', async () => {
    const redbone = new Redbone();
    const client = new Client();

    const type = 'test';

    const watcher = getTestWatcher(redbone, client, type);
    const beforeMiddleware = jest.fn((watcher));
    const afterMiddleware = jest.fn(watcher);
    const testWatcher = jest.fn(watcher);

    redbone.use(beforeMiddleware);
    redbone.watch(testWatcher);
    redbone.after.use(afterMiddleware);

    await redbone.dispatch(client, { type });

    expect(beforeMiddleware.mock.calls.length).toBe(1);
    expect(afterMiddleware.mock.calls.length).toBe(1);
    expect(testWatcher.mock.calls.length).toBe(1);
  });
});
