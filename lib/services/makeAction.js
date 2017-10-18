function makeAction(name, type, payload, merge = false) {
  const action = { type: this.types[name][type] }
  if (merge) Object.assign(action, payload);
  else action.payload = payload;

  return action;
}

module.exports = makeAction;
