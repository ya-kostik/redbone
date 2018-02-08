/**
 * @class ModelBasedExtension
 * @prop {Map}     sets sets of models for subscribing
 * @prop {Redbone} redbone the Redbone instance
 */
class ModelBasedExtension {
  constructor(redbone) {
    this.sets = new Map();
    this.redbone = redbone;
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

module.exports = ModelBasedExtension;
