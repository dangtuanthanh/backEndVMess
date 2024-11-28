//handleRoom.js
const db = require('../dbconfig');
const pool = db.getPool();
const sql = require('mssql');

// Hàm tìm kiếm người dùng theo email hoặc userName với phân trang
async function searchUser(search, offset, limit, userId) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    let request = new sql.Request(transaction);
    const result = await request
      .input('search', sql.VarChar, `%${search}%`)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT userId, email, userName, profilePicture,
               COUNT(*) OVER() AS totalCount
        FROM users 
        WHERE (email LIKE @search OR userName LIKE @search)
          AND isDelete = 0
          AND userId != @userId
        ORDER BY userName 
        OFFSET @offset ROWS 
        FETCH NEXT @limit ROWS ONLY
      `);

    if (result.recordset.length > 0) {
      await transaction.commit();
      return {
        success: true,
        users: result.recordset,
        total: result.recordset[0].totalCount // Tổng số bản ghi từ `COUNT(*) OVER()`
      };
    } else {
      await transaction.rollback();
      return { success: false, message: "Không tìm thấy người dùng." };
    }
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi tìm kiếm người dùng:', error);
    throw error;
  }
}

// Hàm kiểm tra và tạo phòng chat giữa hai người dùng
async function createRoom(userId, targetUserId) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // Kiểm tra xem đã có phòng chat giữa hai người dùng hay chưa
    let request = new sql.Request(transaction);
    const existingRoom = await request
      .input('userId', sql.Int, userId)
      .input('targetUserId', sql.Int, targetUserId)
      .query(`
    SELECT 
      r.roomId, 
      u.userName, 
      u.profilePicture
    FROM rooms r
    JOIN roomMembers rm1 ON r.roomId = rm1.roomId
    JOIN roomMembers rm2 ON r.roomId = rm2.roomId
    JOIN users u ON rm2.userId = u.userId
    WHERE 
      rm1.userId = @userId 
      AND rm2.userId = @targetUserId 
      AND r.isGroup = 0 
      AND r.isDelete = 0
  `);

    // Nếu đã có phòng, trả về thông báo lỗi
    if (existingRoom.recordset.length > 0) {
      const { roomId, userName, profilePicture } = existingRoom.recordset[0];
      await transaction.rollback();
      return {
        success: false,
        message: "Phòng chat giữa hai người dùng đã tồn tại.",
        roomId,
        userName: userName,
        profilePicture: profilePicture
      };
    }


    // Nếu chưa có phòng, tạo phòng mới
    request = new sql.Request(transaction);
    const currentTime = new Date();
    const result = await request
      .input('roomName', sql.NVarChar, null) // Phòng cá nhân không cần tên
      .input('createdBy', sql.Int, userId) // Người tạo phòng là người dùng hiện tại
      .input('createdAt', sql.DateTime, currentTime)
      .query(`
        INSERT INTO rooms (roomName, isGroup, createdBy, createdAt) 
        OUTPUT INSERTED.roomId 
        VALUES (@roomName, 0, @createdBy, @createdAt)
      `);

    const roomId = result.recordset[0].roomId; // roomId là kiểu UNIQUEIDENTIFIER

    // Thêm hai người dùng vào phòng chat mới tạo
    request = new sql.Request(transaction);
    await request
      .input('roomId', sql.UniqueIdentifier, roomId) // Đổi sang kiểu UNIQUEIDENTIFIER
      .input('userId', sql.Int, userId)
      .input('addedAt', sql.DateTime, currentTime)
      .query(`
        INSERT INTO roomMembers (roomId, userId, addedAt) 
        VALUES (@roomId, @userId, @addedAt)
      `);

    request = new sql.Request(transaction);
    await request
      .input('roomId', sql.UniqueIdentifier, roomId) // Đổi sang kiểu UNIQUEIDENTIFIER
      .input('targetUserId', sql.Int, targetUserId)
      .input('addedAt', sql.DateTime, currentTime)
      .query(`
        INSERT INTO roomMembers (roomId, userId, addedAt) 
        VALUES (@roomId, @targetUserId, @addedAt)
      `);

    await transaction.commit();
    return { success: true, roomId };
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi tạo phòng chat:', error);
    throw error;
  }
}

// Hàm kiểm tra sự tồn tại của người dùng theo userId
async function checkUserExistence(userId) {
  const request = new sql.Request(pool);

  try {
    const result = await request
      .input('userId', sql.Int, userId)
      .query(`
        SELECT userId 
        FROM users 
        WHERE userId = @userId AND isDelete = 0
      `);

    return result.recordset.length > 0; // Trả về true nếu người dùng tồn tại
  } catch (error) {
    console.error('Lỗi khi kiểm tra người dùng tồn tại:', error);
    throw error;
  }
}

// Hàm kiểm tra xem người dùng có trong phòng không
async function checkRoomMembership(userId, roomId) {
  const request = new sql.Request(pool);
  const result = await request
    .input('userId', sql.Int, userId)
    .input('roomId', sql.UniqueIdentifier, roomId)
    .query(`
      SELECT COUNT(*) AS isMember 
      FROM roomMembers 
      WHERE userId = @userId AND roomId = @roomId AND isDelete = 0
    `);
  return result.recordset[0].isMember > 0;
}

// Hàm lấy tin nhắn trong phòng với phân trang, sắp xếp từ mới nhất đến cũ nhất
async function getRoomMessages(roomId, offset, limit) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    let request = new sql.Request(transaction);
    const result = await request
      .input('roomId', sql.UniqueIdentifier, roomId)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT m.messageId, m.messageContent, m.createdAt, m.senderId, u.userName, m.editedAt, m.isEdited
        FROM messages m
        JOIN users u ON m.senderId = u.userId
        WHERE m.roomId = @roomId AND m.isDelete = 0
        ORDER BY m.createdAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    // Lấy tổng số tin nhắn trong phòng
    request = new sql.Request(transaction);
    const total = await request
      .input('roomId', sql.UniqueIdentifier, roomId)
      .query(`
        SELECT COUNT(*) AS total 
        FROM messages 
        WHERE roomId = @roomId AND isDelete = 0
      `);

    await transaction.commit();

    if (result.recordset.length > 0) {
      // Định dạng lại ngày tháng cho kết quả trả về
      const formattedMessages = result.recordset.map(msg => ({
        messageId: msg.messageId,
        messageContent: msg.messageContent,
        userName: msg.userName,
        senderId: msg.senderId,
        editedAt: msg.isEdited ? new Date(msg.editedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
        createdAt: new Date(msg.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

      }));
      return {
        success: true,
        messages: formattedMessages,
        total: total.recordset[0].total
      };
    } else {
      return { success: false, message: 'Không có tin nhắn trong phòng này.' };
    }
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi lấy tin nhắn:', error);
    throw error;
  }
}

// Hàm lấy danh sách phòng chat của người dùng
async function getUserRooms(userId, offset, limit) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    let request = new sql.Request(transaction);

    // Lấy thông tin phòng chat mà user là thành viên
    const result = await request
      .input('userId', sql.Int, userId)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
    SELECT 
      r.roomId, 
      r.roomName, 
      rm.unreadMessagesCount, 
      r.lastMessageTime,
      r.isGroup,
      CASE 
        WHEN r.isGroup = 1 THEN r.roomImage
        ELSE (
          SELECT TOP 1 u.userName 
          FROM roomMembers rm2
          INNER JOIN users u ON rm2.userId = u.userId
          WHERE rm2.roomId = r.roomId AND rm2.userId != @userId
        ) 
      END AS userName,
      CASE 
        WHEN r.isGroup = 0 THEN (
          SELECT TOP 1 u.profilePicture
          FROM roomMembers rm2
          INNER JOIN users u ON rm2.userId = u.userId
          WHERE rm2.roomId = r.roomId AND rm2.userId != @userId
        )
        ELSE NULL
      END AS image,
      CASE 
        WHEN r.isGroup = 0 THEN (
          SELECT TOP 1 u.email
          FROM roomMembers rm2
          INNER JOIN users u ON rm2.userId = u.userId
          WHERE rm2.roomId = r.roomId AND rm2.userId != @userId
        )
        ELSE NULL
      END AS email,
      (
        SELECT TOP 1 m.messageContent 
        FROM messages m
        WHERE m.roomId = r.roomId AND m.isDelete = 0
        ORDER BY m.createdAt DESC
      ) AS lastMessage
    FROM roomMembers rm
    INNER JOIN rooms r ON rm.roomId = r.roomId
    WHERE rm.userId = @userId 
      AND rm.isDelete = 0
      AND EXISTS ( -- Chỉ lấy phòng có tin nhắn
        SELECT 1
        FROM messages m
        WHERE m.roomId = r.roomId AND m.isDelete = 0
      )
    ORDER BY r.lastMessageTime DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);
    request = new sql.Request(transaction);
    const total = await request
      .input('userId', sql.Int, userId)
      .query(`
    SELECT COUNT(*) AS total
    FROM roomMembers rm
    INNER JOIN rooms r ON rm.roomId = r.roomId
    WHERE rm.userId = @userId 
      AND rm.isDelete = 0
      AND EXISTS (
        SELECT 1
        FROM messages m
        WHERE m.roomId = r.roomId AND m.isDelete = 0
      )
  `);

    if (result.recordset.length > 0) {
      // Lấy ngày hiện tại để so sánh
      const currentDate = new Date();
      const today = currentDate.toISOString().slice(0, 10); // Chỉ lấy phần ngày (yyyy-mm-dd)

      // Xử lý định dạng lastMessageTime
      result.recordset.forEach(room => {
        const messageDate = new Date(room.lastMessageTime);
        const messageDateString = messageDate.toISOString().slice(0, 10); // Lấy phần ngày để so sánh

        // Nếu ngày tin nhắn trùng với ngày hiện tại, chỉ trả về giờ và phút
        if (messageDateString === today) {
          room.lastMessageTime = messageDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } else {
          // Nếu khác ngày hiện tại, trả về ngày/tháng/năm và giờ/phút
          room.lastMessageTime = messageDate.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      });
      await transaction.commit();
      return {
        success: true,
        rooms: result.recordset, // Danh sách các phòng
        total: total.recordset[0].total
      };
    } else {
      await transaction.rollback();
      return { success: false, message: "Không có phòng chat nào." };
    }
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi lấy danh sách phòng:', error);
    throw error;
  }
}

module.exports = {
  searchUser,
  createRoom,
  checkUserExistence,
  checkRoomMembership,
  getRoomMessages,
  getUserRooms
};