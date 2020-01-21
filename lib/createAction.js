/**
 * Create boilerplate action
 * @param  {String} type — type of action
 * @param  {Mixed} payload — payload of action
 * @return {Action}
 */
function createAction(type, payload) {
  const action = { type };
  if (payload !== undefined) {
    action.payload = payload;
  }

  return action;
}

module.exports = createAction;
