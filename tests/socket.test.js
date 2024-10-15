//socket.test.js
const { Server } = require('http');
const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../app');  // ứng dụng Express của bạn
const initSocket = require('../sockets');  // socket được khởi tạo
let server, io, clientSocket1, clientSocket2;
const { exec } = require('child_process');

describe('Kiểm thử tính năng nhắn tin theo thời gian thực', () => {
  beforeAll((done) => {
    // Khởi tạo server HTTP và Socket.IO
    server = Server(app);
    io = initSocket(server);
    server.listen(() => {
      const port = server.address().port;
      clientSocket1 = ioClient(`http://localhost:${port}`, {
        query: {
          token: jwt.sign({ userId: 102 }, process.env.accessTokenSecret)
        }
      });
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        query: {
          token: jwt.sign({ userId: 19 }, process.env.accessTokenSecret)
        }
      });
      done();
    });
  });

  afterAll(async(done) => {
    io.close();
    clientSocket1.close();
    clientSocket2.close();
    server.close(done);
    await exec('node ctrf/exportResults.js'); // Xuất kết quả kiểm thử ra file
  });

  test('Kết nối và vào phòng', (done) => {
    clientSocket1.emit('joinRoom', { roomId: 7 });

    clientSocket1.on('joinedRoom', (data) => {
      expect(data.roomId).toBe(7);
      done();
    });
  });

  test('Gửi và nhận tin nhắn', (done) => {
    clientSocket1.emit('joinRoom', { roomId: 7 });
    clientSocket2.emit('joinRoom', { roomId: 7 });

    clientSocket1.emit('sendMessage', { roomId: 7, message: 'Hello from user 1' });

    clientSocket2.on('receiveMessage', (newMessage) => {
      expect(newMessage.message).toBe('Hello from user 1');
      expect(newMessage.userId).toBe(102); // userId của người gửi
      done();
    });
  });

  test('Token không hợp lệ', (done) => {
    const invalidTokenSocket = ioClient(`http://localhost:${server.address().port}`, {
      query: {
        token: 'invalidToken'
      }
    });

    invalidTokenSocket.on('connect_error', (err) => {
      expect(err.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
      invalidTokenSocket.close();
      done();
    });
  });

  test('Không phải thành viên của phòng', (done) => {
    clientSocket1.emit('sendMessage', { roomId: 999, message: 'This should fail' });

    clientSocket1.on('errorMessage', (error) => {
      expect(error.message).toBe('Bạn không phải là thành viên của phòng này!');
      done();
    });
  });
});
