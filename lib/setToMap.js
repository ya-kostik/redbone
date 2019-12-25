module.exports = function setToMap(type, handler, map) {
  const list = map.get(type) || [];
  list.push(handler);
  map.set(type, list);
};
