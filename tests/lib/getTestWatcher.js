/* global expect */

function getTestWatcher(redbone, client, type) {
  return (client, action) => {
    expect(action.type).toBe(type);
    expect(client).toBe(client);
    expect(client.redbone).toBe(redbone);
  };
}

module.exports = getTestWatcher;
