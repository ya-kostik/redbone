const Connector = require('./Connector');
const Client = require('./Client');

class SocketIO extends Connector {
  constructor(io, eventIn = 'dispatch', eventOut = eventIn) {
    super();
    this.io = io;
    this.eventIn;
    this.eventOut = eventOut;
    this.onConnection = this.onConnection.bind(this);
    io.on('connection', this.onConnection);
  }

  onConnection(socket) {
    const client = new Client(socket.id, this.redbone, socket, this.io);
    this.emit('connection', client);
    socket.on('disconnect', () => {
      this.emit('disconnect', client);
    });
    socket.on(this.eventIn, (action) => {
      this.emit('dispatch', client, action);
    });
  }
}

module.exports = SocketIO;
