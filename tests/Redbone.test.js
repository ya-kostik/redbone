/* global jest describe test expect */
const Redbone = require('../classes/Redbone');
const MainClient = require('../classes/Client');

const Client = require('./mocks/TestClient');

const createMiddlewares = require('./lib/createMiddlewares');
const getTestWatcher = require('./lib/getTestWatcher');
const inspectMiddlewares = require('./lib/inspectMiddlewares');

const ACTION_ERROR_TEXT = 'is not a valid action';

function createMiddlewaresTest(firstUse, secondUse) {
  return async () => {
    const redbone = new Redbone();
    const client = new Client();

    const middlewares = createMiddlewares(3);

    const action = { type: 'test' };

    firstUse(redbone, middlewares);

    await redbone.dispatch(client, action);
    inspectMiddlewares(middlewares, 1);

    secondUse(redbone, middlewares, action);
    await redbone.dispatch(client, action);

    inspectMiddlewares(middlewares, 3);
  }
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

  test('don\'t takes invalid action', async () => {
    const redbone = new Redbone();
    const client = new Client();
    // test action without type
    await expect(redbone.dispatch(client, {})).rejects.toThrow(ACTION_ERROR_TEXT);
    // test string action
    await expect(redbone.dispatch(client, 'test')).rejects.toThrow(ACTION_ERROR_TEXT);
    // test no action
    await expect(redbone.dispatch(client)).rejects.toThrow(ACTION_ERROR_TEXT);
    await expect(redbone.dispatch(client, null)).rejects.toThrow(ACTION_ERROR_TEXT);
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

  test('catches errors in the catcher', async () => {
    const redbone = new Redbone();
    const testClient = new Client();

    const type = 'test';


    const error = new Error('Test error');

    const catcher = jest.fn((err, client, action) => {
      expect(err).toBe(error);
      expect(client).toBe(testClient);
      expect(action.type).toBe(type);
    });

    const watcher = () => {
      throw error;
    };

    // try chaining
    redbone.
    watch(watcher).
    catch(catcher);

    await redbone.dispatch(testClient, { type });

    expect(catcher.mock.calls.length).toBe(1);
  });

  test('throws regular error if no catcher specified', async () => {
    const redbone = new Redbone();
    const client = new Client();

    const type = 'test';
    const error = new Error('Test error');

    const middleware = () => { throw error };
    redbone.use(middleware);

    await expect(redbone.dispatch(client, { type })).rejects.toThrow(error);
  });

  test('uses typed middlewares', async () => {
    const redbone = new Redbone();
    const client = new Client();

    const type = 'test';
    const otherType = 'other test';
    const otherOtherType = 'don\'t test';
    /* eslint-disable-next-line */
    const regexpType = new RegExp(`${type}$`);

    const handler = getTestWatcher(redbone, client, type);
    const middlewareForType = jest.fn(handler);
    const middlewareForRegExp = jest.fn();
    const middlewareForOtherType = jest.fn();

    redbone.
    use(type, middlewareForType).
    use(regexpType, middlewareForRegExp).
    use(otherType, middlewareForOtherType);

    for (const actionType of [type, type, otherType, otherOtherType]) {
      await redbone.dispatch(client, { type: actionType });
    }

    expect(middlewareForType.mock.calls.length).toBe(2);
    expect(middlewareForRegExp.mock.calls.length).toBe(4);
    expect(middlewareForOtherType.mock.calls.length).toBe(1);
  });

  test('has raw Client class', () => {
    expect(Redbone.Client).toBe(MainClient);
  });

  test('can use many middlewares from arguments', createMiddlewaresTest((redbone, middlewares) => {
    redbone.use(...middlewares);
  }, (redbone, middlewares, action) => {
    redbone.use(action.type, ...middlewares);
  }));

  test('can use many middlewares from array', createMiddlewaresTest((redbone, middlewares) => {
    redbone.use(middlewares);
  }, (redbone, middlewares, action) => {
    redbone.use(action.type, middlewares);
  }));

  test('creates boilerplate action', () => {
    const type = 'test';
    const actionWithoutPayload = Redbone.createAction(type);
    const actionWithPayload = Redbone.createAction(type, { message: type });
    const actionWithNullPayload = Redbone.createAction(type, null);

    const redbone = new Redbone();
    const actionCreatedByInstance = redbone.createAction(type);

    expect(actionWithoutPayload).toEqual({ type });
    expect(actionWithPayload).toEqual({
      type,
      payload: { message: type }
    });
    expect(actionWithNullPayload).toEqual({ type, payload: null });
    expect(actionCreatedByInstance).toEqual(actionWithoutPayload);
  });

  test('compares action and type', () => {
    const firstType = 'first test';
    const secondType = 'second test';
    const thirdType = 'crazy type';
    const regexpType = /test/;

    const firstAction = Redbone.createAction(firstType);
    const secondAction = Redbone.createAction(secondType);
    const thirdAction = Redbone.createAction(thirdType);


    expect(Redbone.is(firstAction, firstType)).toBe(true);
    expect(Redbone.is(firstAction, secondType)).toBe(false);

    expect(Redbone.is(firstAction, regexpType)).toBe(true);
    expect(Redbone.is(secondAction, regexpType)).toBe(true);
    expect(Redbone.is(thirdAction, regexpType)).toBe(false);
  });
});
