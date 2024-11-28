//handleMessage.js
const db = require('../dbconfig');
const pool = db.getPool();
const sql = require('mssql');

// Hàm xử lý sửa tin nhắn
async function editMessage(messageId, userId, newMessageContent) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  messageId = Number(messageId);
  try {
    // Kiểm tra xem tin nhắn có tồn tại và người dùng có phải là người gửi không
    let request = new sql.Request(transaction);
    const message = await request
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
          SELECT * 
          FROM messages 
          WHERE messageId = @messageId AND senderId = @userId AND isDelete = 0
        `);

    if (message.recordset.length === 0) {
      await transaction.rollback();
      return { success: false, message: 'Tin nhắn không tồn tại hoặc bạn không phải là người gửi.', statusCode: 404 };
    }

    // Cập nhật tin nhắn
    let currentTime = new Date();
    request = new sql.Request(transaction);
    await request
      .input('messageId', sql.Int, messageId)
      .input('newMessageContent', sql.NVarChar, newMessageContent)
      .input('editedAt', sql.DateTime, currentTime)
      .query(`
          UPDATE messages
          SET messageContent = @newMessageContent, isEdited = 1, editedAt = @editedAt
          WHERE messageId = @messageId
        `);

    await transaction.commit();
    const today = currentTime.toISOString().slice(0, 10); // Chỉ lấy phần ngày (yyyy-mm-dd)
    const messageDate = new Date(currentTime);
    const messageDateString = messageDate.toISOString().slice(0, 10); // Lấy phần ngày để so sánh

    // Nếu ngày tin nhắn trùng với ngày hiện tại, chỉ trả về giờ và phút
    if (messageDateString === today) {
      currentTime = messageDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } else {
      // Nếu khác ngày hiện tại, trả về ngày/tháng/năm và giờ/phút
      currentTime = messageDate.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return { success: true, updatedMessage: { messageId, newMessageContent, editedAt: currentTime} };
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi sửa tin nhắn:', error);
    throw error;
  }
}

// Hàm xử lý xóa tin nhắn
async function deleteMessage(messageId, userId) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  messageId = Number(messageId);

  try {
    // Kiểm tra xem tin nhắn có tồn tại và người dùng có phải là người gửi không
    let request = new sql.Request(transaction);
    const message = await request
      .input('messageId', sql.Int, messageId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT * 
        FROM messages 
        WHERE messageId = @messageId AND senderId = @userId AND isDelete = 0
      `);

    if (message.recordset.length === 0) {
      await transaction.rollback();
      return { success: false, message: 'Tin nhắn không tồn tại hoặc bạn không phải là người gửi.', statusCode: 404 };
    }

    // Đánh dấu tin nhắn là đã xóa
    request = new sql.Request(transaction);
    await request
      .input('messageId', sql.Int, messageId)
      .query(`
        UPDATE messages
        SET isDelete = 1
        WHERE messageId = @messageId
      `);

    await transaction.commit();
    return { success: true,messageId:messageId };
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi xóa tin nhắn:', error);
    throw error;
  }
}

module.exports = {
  editMessage,
  deleteMessage
};