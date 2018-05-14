const processTypes = require('../services/processTypes');
const makeAction = require('../services/makeAction');

const serverRegexp = /^@@server\/.*?$/i;

class Redbone {
  constructor() {
    this.types = {};
  }

  dispatch(name, type, payload, merge) {
    let action;
    if (typeof name === 'object' && name !== null) {
      action = name;
    } else {
      action = this.action(name, type, payload, merge);
    }
    if (serverRegexp.test(action.type)) {
      this.serverDispatcher(action);
      return this;
    }
    this.dispatcher(action);
    return this;
  }

  dispatcher(/* action */) {
    throw new TypeError('dispatcher method is not implemented');
  }

  serverDispatcher(/* action */) {
    this.dispatcher(...arguments);
  }
}

Redbone.prototype.processTypes = processTypes;
Redbone.prototype.makeAction = makeAction;
Redbone.prototype.action = makeAction;

module.exports = Redbone;
