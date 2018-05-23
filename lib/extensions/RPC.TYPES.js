module.exports = {
  server: {
    CALL: '@@server/rpc/CALL',
    SUB: '@@server/rpc/SUB',
    UNSUB: '@@server/rpc/UNSUB'
  },
  client: {
    RETURN: '@@client/rpc/RETURN',
    ERROR: '@@client/rpc/ERROR',
    EVENT: '@@client/rpc/EVENT'
  }
};
