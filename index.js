const Redbone =  require('./lib/classes/Redbone');

Redbone.connectors = {
  SocketIO: require('./lib/classes/connectors/SocketIO')
};

Redbone.extensions = {
  RPC: require('./lib/extensions/RPC')
};

Redbone.errors = {
  HttpError: require('./Errors/HttpError')
};

module.exports = Redbone;
