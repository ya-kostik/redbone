function createTypes(prefix, types) {
  const TYPES = {};
  types.forEach((type) => {
    TYPES[type] = prefix + type;
  });
  return TYPES;
}

module.exports = createTypes;
