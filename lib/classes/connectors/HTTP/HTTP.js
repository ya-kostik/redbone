const HttpError = require('../../../../Errors/HttpError');
const Client = require('./Client');
const Connector = require('../../Connector');
const uniqueId = require('lodash/uniqueId');

class HTTP extends Connector {
  constructor() {
    super();
    this.middleware = this.middleware.bind(this);
    this.call = this.call.bind(this);
  }

  createClient(req, res) {
    const client = new Client(req.clientId, this.redbone, this);
    client.__nativeReq = req;
    client.__nativeRes = res;
    return client;
  }

  onRes(res, client) {
    let disconnected = false;
    const disconnect = () => {
      if (disconnected) return;
      this.emit('disconnect', client);
      disconnected = true;
    }
    res.once('close', disconnect);
    res.once('end', disconnect);
    res.once('finish', disconnect);
  }

  async middleware(req, res, next) {
    try {
      if (!(req.body && req.body.type)) {
        throw new HttpError(400, 'Invalid action');
      }
      await this.call(req, res);
      if (next) return next();
    } catch(err) {
      if (next) return next(err);
      else throw err;
    }
  }

  async call(req, res) {
    if (!req.clientId) {
      req.clientId = uniqueId();
    }
    const client = this.createClient(req, res);
    this.onRes(res, client);
    this.emit('connection', client);
    this.emit('dispatch', client, req.action);
  }
}

module.exports = HTTP;
