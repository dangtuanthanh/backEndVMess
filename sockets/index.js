// /sockets/index.js
const socketIo = require('socket.io');
const handleSocket = require('./handleSocket');

function initSocket(server) {
  const io = socketIo(server);
  io.use(require('./socketMiddleware'));
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.userId);
    // Người dùng tham gia vào kênh duy nhất dựa trên userId
    socket.join(socket.userId);
    // Đưa các sự kiện vào file handleSocket để quản lý
    handleSocket(io, socket);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.userId);
    });
  });

  return io;
}

module.exports = initSocket;
