// /sockets/socketMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware kiểm tra token trước khi cho phép kết nối socket
module.exports = (socket, next) => {
  const token = socket.handshake.query.token;

  if (!token) {
    return next(new Error('Token không tồn tại.'));
  }

  jwt.verify(token, process.env.accessTokenSecret, (err, decoded) => {
    if (err) {
      return next(new Error('Token không hợp lệ hoặc đã hết hạn.'));
    }
    // Lưu thông tin người dùng vào socket để sử dụng sau này
    socket.userId = decoded.userId;
    next();
  });
};
