const processTypes = require('../services/processTypes');
const makeAction = require('../services/makeAction');

class Redbone {
  constructor() {
    this.types = {};
  }
}

Redbone.prototype.processTypes = processTypes;
Redbone.prototype.makeAction = makeAction;

module.exports = Redbone;
