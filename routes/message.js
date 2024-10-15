//message.js
var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const sql = require("../handle/handleMessage");
const { authenticateToken } = require("../middleware/auth");
router.use(bodyParser.json());//cho phép xử lý dữ liệu gửi lên dạng json

// Sửa tin nhắn trong phòng chat
router.put('/editMessage/:messageId', authenticateToken, async function (req, res) {
  const { messageId } = req.params;
  const { newMessageContent, roomId } = req.body;
  const userId = req.user.userId; // Lấy ID người dùng từ token

  // Kiểm tra dữ liệu đầu vào
  if (!roomId || !newMessageContent || newMessageContent.trim() === '') {
    return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không hợp lệ!' });
  }

  try {
    // Gọi hàm xử lý sửa tin nhắn từ file handleMessage
    const result = await sql.editMessage(messageId, userId, newMessageContent, roomId);

    if (result.success) {
      res.status(200).json({ success: true, message: 'Tin nhắn đã được sửa thành công.', updatedMessage: result.updatedMessage });
    } else {
      res.status(result.statusCode).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi khi sửa tin nhắn:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi trong quá trình sửa tin nhắn.' });
  }
});

// Xóa tin nhắn trong phòng chat
router.delete('/deleteMessage/:messageId', authenticateToken, async function (req, res) {
  // #swagger.tags = ['Message']
  // #swagger.summary = 'Xóa tin nhắn'
  // #swagger.description = 'Endpoint để xóa tin nhắn trong phòng chat'

  const { messageId } = req.params;
  const { roomId } = req.body;
  const userId = req.user.userId; // Lấy ID người dùng từ token

  // Kiểm tra dữ liệu đầu vào
  if (!roomId) {
    return res.status(400).json({ success: false, message: 'Phòng chat không hợp lệ!' });
  }

  try {
    // Gọi hàm xử lý xóa tin nhắn từ file handleMessage
    const result = await sql.deleteMessage(messageId, userId, roomId);

    if (result.success) {
      res.status(200).json({ success: true, message: 'Tin nhắn đã được xóa thành công.' });
    } else {
      res.status(result.statusCode).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi khi xóa tin nhắn:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi trong quá trình xóa tin nhắn.' });
  }
});

module.exports = router;