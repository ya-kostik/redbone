const codes = require('http').STATUS_CODES;


class HttpError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.statusMessage = codes[code] || 'Undefined Message';
  }
}

module.exports = HttpError;
