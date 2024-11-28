// /sockets/handleSocket.js
const db = require('../dbconfig');
const pool = db.getPool();
const sql = require('mssql');

module.exports = function (io, socket) {
  // Sự kiện khi người dùng gửi tin nhắn
  socket.on('sendMessage', async (data) => {
    const transaction = new sql.Transaction(pool);

    try {
      const { roomId, message } = data;
      const userId = socket.userId;

      // Kiểm tra dữ liệu đầu vào
      if (!roomId || !userId || !message) {
        return socket.emit('errorMessage', { message: 'Dữ liệu gửi lên không chính xác!' });
      }

      // Kiểm tra xem user có phải là thành viên của phòng hay không
      let request = new sql.Request(pool); // Sử dụng pool thay vì transaction cho kiểm tra
      const checkMemberResult = await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('userId', sql.Int, userId)
        .query(`
        SELECT COUNT(*) AS isMember FROM roomMembers 
        WHERE roomId = @roomId AND userId = @userId AND isDelete = 0
      `);

      if (checkMemberResult.recordset[0].isMember === 0) {
        return socket.emit('errorMessage', { message: 'Bạn không phải là thành viên của phòng này!' });
      }

      // Bắt đầu giao dịch sau khi kiểm tra thành viên thành công
      await transaction.begin();

      // 1. Lưu tin nhắn vào database
      const currentTime = new Date();
      request = new sql.Request(transaction); // Sử dụng transaction để bắt đầu lưu dữ liệu
      resultSaveMessage = await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('senderId', sql.Int, userId)
        .input('messageContent', sql.NVarChar, message)
        .input('createdAt', sql.DateTime, currentTime)
        .query(`
        INSERT INTO messages (roomId, senderId, messageContent, createdAt) 
        OUTPUT INSERTED.messageId 
        VALUES (@roomId, @senderId, @messageContent, @createdAt)
      `);

      const messageId = resultSaveMessage.recordset[0].messageId;
      // 2. Cập nhật lastMessageTime trong bảng rooms
      request = new sql.Request(transaction);
      await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('lastMessageTime', sql.DateTime, currentTime)
        .query(`
        UPDATE rooms 
        SET lastMessageTime = @lastMessageTime 
        WHERE roomId = @roomId
      `);

      // 3. Tăng unreadMessagesCount cho các thành viên khác trong phòng
      request = new sql.Request(transaction);
      await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('senderId', sql.Int, userId)
        .query(`
        UPDATE roomMembers 
        SET unreadMessagesCount = unreadMessagesCount + 1
        WHERE roomId = @roomId AND userId != @senderId
      `);

      // 4. Tạo object tin nhắn mới để gửi về client
      request = new sql.Request(transaction);
      const senderResult = await request
        .input('userId', sql.Int, userId)
        .query(`
        SELECT userName FROM users WHERE userId = @userId
      `);

      const senderName = senderResult.recordset[0].userName; // Lấy tên người gửi
      const newMessage = {
        messageId,
        roomId,
        senderId:userId,
        messageContent:message,
        userName: senderName,
        createdAt: currentTime,
      };
      const today = currentTime.toISOString().slice(0, 10); // Chỉ lấy phần ngày (yyyy-mm-dd)
      const messageDate = new Date(newMessage.createdAt);
      const messageDateString = messageDate.toISOString().slice(0, 10); // Lấy phần ngày để so sánh

      // Nếu ngày tin nhắn trùng với ngày hiện tại, chỉ trả về giờ và phút
      if (messageDateString === today) {
        newMessage.createdAt = messageDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } else {
        // Nếu khác ngày hiện tại, trả về ngày/tháng/năm và giờ/phút
        newMessage.createdAt = messageDate.toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // 5. Gửi tin nhắn cho tất cả các thành viên trong phòng
      console.log(`Sending message to room: ${roomId}`);
      io.to(roomId).emit('receiveMessage', newMessage);

      // Cập nhật unreadMessagesCount cho tất cả thành viên (trừ người gửi)
      request = new sql.Request(transaction);
      const membersResult = await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('senderId', sql.Int, userId)
        .query(`
        SELECT userId FROM roomMembers 
        WHERE roomId = @roomId AND userId != @senderId AND isDelete = 0
      `);

      const members = membersResult.recordset;

      for (const member of members) {
        // Cập nhật unreadMessagesCount cho từng thành viên
        request = new sql.Request(transaction);
        await request
          .input('roomId', sql.UniqueIdentifier, roomId)
          .input('userId', sql.Int, member.userId)
          .query(`
          UPDATE roomMembers 
          SET unreadMessagesCount = unreadMessagesCount + 1 
          WHERE roomId = @roomId AND userId = @userId
        `);
        console.log('member.userId', member.userId);

        // Phát sự kiện để cập nhật danh sách phòng cho từng thành viên
        io.to(member.userId).emit('updateRoomList', "có tin nhắn mới");
      }

      // Commit transaction sau khi hoàn tất
      await transaction.commit();

    } catch (error) {
      // Rollback nếu có lỗi
      if (transaction._aborted !== true) {
        await transaction.rollback();
      }
      console.error('Lỗi khi gửi tin nhắn:', error);
      socket.emit('errorMessage', { message: 'Đã xảy ra lỗi khi gửi tin nhắn!' });
    }
  });

  // Sự kiện khác liên quan đến socket (nếu có)
  // Xử lý sự kiện khi người dùng vào phòng chat
  socket.on('joinRoom', async (data) => {
    console.log('vào đây');

    try {

      const { roomId } = data;
      const userId = socket.userId;

      // Kiểm tra dữ liệu đầu vào
      if (!roomId) {
        return socket.emit('errorMessage', { message: 'Invalid room ID!' });
      }
      // Kiểm tra xem người dùng có phải là thành viên của phòng hay không
      let request = new sql.Request(pool);
      const checkMemberResult = await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('userId', sql.Int, userId)
        .query(`
        SELECT COUNT(*) AS isMember FROM roomMembers 
        WHERE roomId = @roomId AND userId = @userId AND isDelete = 0
      `);

      if (checkMemberResult.recordset[0].isMember === 0) {
        return socket.emit('errorMessage', { message: 'You are not a member of this room!' });
      }

      // Tham gia vào phòng
      socket.join(roomId);
      // Log danh sách các socket (thành viên) hiện tại trong phòng
      const room = io.sockets.adapter.rooms.get(roomId); // Lấy thông tin phòng từ adapter
      if (room) {
        const members = Array.from(room); // Chuyển Set thành Array
        console.log(`Members in room ${roomId}:`, members);
        // Kiểm tra số lượng thành viên trong phòng
        if (members.length === 2)
          // Phòng có đủ 2 thành viên, phát sự kiện về client
          io.to(roomId).emit('joinedRoom', { twoMember: true });
        else
          io.to(roomId).emit('joinedRoom', { twoMember: false });
      }
      // Cập nhật lại unreadMessagesCount về 0 khi người dùng vào phòng
      request = new sql.Request(pool);
      await request
        .input('roomId', sql.UniqueIdentifier, roomId)
        .input('userId', sql.Int, userId)
        .query(`
        UPDATE roomMembers
        SET unreadMessagesCount = 0
        WHERE roomId = @roomId AND userId = @userId
      `);



    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('errorMessage', { message: 'Error occurred while joining the room!' });
    }
  });

  // Phát tín hiệu khi tin nhắn được sửa
  socket.on('editMessage', async (data) => {
    try {
      console.log('data',data);
      
      // Lấy id và nội dung mới của tin nhắn
      const { messageId, newMessageContent, editedAt, roomId } = data;
      console.log('messageId',messageId);
      
      // Kiểm tra dữ liệu đầu vào
      if (!roomId, !messageId, !newMessageContent, !editedAt) {
        return socket.emit('errorMessage', { message: 'Invalid' });
      }
      // Phát tín hiệu cho tất cả các thành viên trong phòng
      socket.to(roomId).emit('messageEdited', {
        messageId,
        newMessageContent,
        isEdited: true,
        editedAt,
        roomId
      });

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('errorMessage', { message: 'Error occurred while editing the message!' });
    }
  });

  // Phát tín hiệu khi tin nhắn được xóa
  socket.on('deleteMessage', async (data) => {
    try {
      const { messageId, roomId } = data;
      // Kiểm tra dữ liệu đầu vào
      if (!roomId || !messageId) {
        return socket.emit('errorMessage', { message: 'Dữ liệu không hợp lệ!' });
      }

      // Phát tín hiệu cho tất cả các thành viên trong phòng
      socket.to(roomId).emit('messageDeleted', {
        messageId,
        roomId,
        isDelete: true
      });

    } catch (error) {
      console.error('Lỗi khi xóa tin nhắn:', error);
      socket.emit('errorMessage', { message: 'Lỗi trong quá trình xóa tin nhắn!' });
    }
  });




};
