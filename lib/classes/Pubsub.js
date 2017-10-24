const HttpError = require('../../Errors/HttpError');

/**
 * Pubsub system
 * @class Pubsub
 * @prop {Map}     sets sets of models for subscribing
 * @prop {Array}   middlewares main for all SUB(SCRIBE)s
 * @prop {Map}     modelMiddlewares middlewares for specific model
 * @prop {Redbone} redbone the Redbone instance
 * @prop {Object}  TYPES subscribing and unsubscribing types — SUB and UNSUB
 * @param {Redbone} redbone the Redbone instance
 * @param {Object}  TYPES custom subscribing and unsubscribing types
 */
class Pubsub {
  constructor(redbone, TYPES) {
    if (!TYPES) TYPES = {};
    this.sets = new Map();
    this.middlewares = [];
    this.modelMiddlewares = new Map();

    this.redbone = redbone;
    this.TYPES = {
      SUB:   TYPES.SUB   || '@@server/SUB',
      UNSUB: TYPES.UNSUB || '@@server/UNSUB'
    };
    this.watcherSUB = this.watcherSUB.bind(this);
    this.watcherUNSUB = this.watcherUNSUB.bind(this);
    this.redbone.watch(this.TYPES.SUB, this.watcherSUB);
    this.redbone.watch(this.TYPES.UNSUB, this.watcherUNSUB);
  }

  /**
   * Add middleware
   * @param  {Function}     middleware middleware
   * @param  {EventEmitter} [model=null] subscribing model, if you want to add middleware for it
   * @param  {String}       event model event, if you want to add middleware for it
   * @return {Pubsub}       this
   */
  use(middleware, model, event) {
    this.redbone.isMiddleware(middleware);
    if (model) {
      this._modelUse(middleware, model, event)
    } else {
      this.middlewares.push(middleware);
    }
    return this;
  }

  /**
   * use middleware for model-event
   * @param  {Function}      middleware middleware
   * @param  {EventEmitter} [model=null] subscribing model
   * @param  {String}        event model event, if you want to add middleware for it
   * @return {Pubsub}        this
   */
  _modelUse(middleware, model, event) {
    let events;
    if (this.modelMiddlewares.has(model)) {
      events = this.modelMiddlewares.get(model);
    } else {
      events = {
        __main__: []
      }
    }
    if (!event) event = '__main__';
    if (!events[event]) events[event] = [];
    events[event].push(middleware);
    this.modelMiddlewares.set(model, events);
    return this;
  }

  /**
   * Just subscribe watcher
   * @param  {Socket}  socket
   * @param  {Object}  action
   * @return {Promise}
   */
  async watcherSUB(socket, action) {
    for (const middleware of this.middlewares) {
      let result = await middleware(socket, action);
      if (result === false) return;
    }
    if (!action.set) action.set = 'default';
    const { set, model, event, backType, merge } = action;
    if (!model) throw new HttpError(400, 'Model is not defined');
    if (!event) throw new HttpError(400, 'Event is not defined');
    if (!backType) throw new HttpError(400, 'Back Type is not defined');

    const sub = { set, model, event, type: backType, merge };
    this.sub(socket, sub);
  }

  /**
   * Just unsubscribe watcher
   * @param  {Socket}  socket
   * @param  {Object}  action
   * @return {Promise}
   */
  async watcherUNSUB(socket, action) {
    if (!action.set) action.set = 'default';
    const { set, model, event } = action;
    if (!model) throw new HttpError(400, 'Model is not defined');
    if (!event) throw new HttpError(400, 'Event is not defined');

    const sub = { set, model, event };
    this.sub(socket, sub);
  }

  /**
   * Find model in set
   * @param  {String} set   set name
   * @param  {String} model model name
   * @return {EventEmitter|null} found model
   */
  findModel(set, model) {
    if (!this.sets.has(set)) return null;
    const models = this.sets.get(set);
    if (!models[model]) return null;
    return models[model];
  }

  /**
   * Subscribe
   * @param  {Socket}   socket Redbone syntetic socket
   * @param  {Object}   sub    subscribe params
   * @param  {String}   sub.set set name
   * @param  {String}   sub.model model name
   * @param  {String}   sub.event event name
   * @param  {String}   sub.type action type name
   * @param  {Boolean} [sub.merge=false] merge event data, or use payload
   * @return {Promise}
   */
  async sub(socket, { set, model, event, type, merge }) {
    if (merge === undefined) merge = false;
    model = this.findModel(set, model);
    if (!model) return;
    if (this.modelMiddlewares.has(model)) {
      const events = this.modelMiddlewares.get(model);
      // Main model midlewares
      let middlewares = events.__main__;
      for (const middleware of middlewares) {
        let result = await middleware(socket, model);
        if (result === false) return;
      }
      // Current event middlewares
      middlewares = events[event];
      if (middlewares) {
        for (const middleware of middlewares) {
          let result = await middleware(socket, model, event);
          if (result === false) return;
        }
      }
    }
    socket.sub(model, event, type, merge);
    return;
  }

  /**
   * Unsubscribe
   * @param  {Socket}   socket Redbone syntetic socket
   * @param  {Object}   unsub  unsubscribe params
   * @param  {String}   unsub.set set name
   * @param  {String}   unsub.model model name
   * @param  {String}   unsub.event event name
   * @return {Promise}
   */
  async unsub(socket, { set, model, event }) {
    model = this.findModel(set, model);
    if (!model) return;
    socket.listenersCounter.remove(model, event);
  }

  /**
   * add models object to a specific set name
   * @param {String} set set name
   * @param {Object} models object with event emitters
   * @return {Pubsub} this
   */
  addSetOfModels(set, models) {
    if (typeof set === 'object' && set !== null) {
      models = set;
      set = 'default';
    }
    if (!(typeof models === 'object' && models !== null)) {
      throw new TypeError('Models is not defined');
    }
    if (!set) throw new TypeError('Set name is not defined');
    this.sets.set(set, models)
    return this;
  }

  /**
   * add Model To Set by name
   * @param {String} set set name
   * @param {String} name  model name
   * @param {EventEmitter} model subscribe model
   * @return {Pubsub} this
   */
  addModelToSet(set, name, model) {
    if (!(typeof model === 'object' && model !== null)) {
      throw new TypeError('Model is not defined');
    }
    if (!set) throw new TypeError('Set name is not defined');
    if (!name) throw new TypeError('Model name is not defined');
    let setObject;
    if (this.sets.has(set)) {
      setObject = this.sets.get(set);
    } else {
      setObject = {};
    }
    setObject[name] = model;
    this.sets.set(set, setObject);
    return this;
  }
}

module.exports = Pubsub;
