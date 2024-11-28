//room.js
var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const sql = require("../handle/handleRoom");
const { authenticateToken } = require("../middleware/auth");
router.use(bodyParser.json());//cho phép xử lý dữ liệu gửi lên dạng json

// Tìm kiếm người dùng với phân trang
router.get('/searchUser', authenticateToken, async function (req, res) {
  // #swagger.tags = ['Room']
  // #swagger.summary = 'Tìm kiếm người dùng'
  // #swagger.description = 'Endpoint để tìm kiếm người dùng bằng email hoặc userName.'
  const { search, page = 1, limit = 10 } = req.query; // Thêm tham số page và limit
  const offset = (page - 1) * limit; // Tính toán vị trí bắt đầu

  // Kiểm tra dữ liệu đầu vào
  if (!search) {
    return res.status(400).json({ success: false, message: "Yêu cầu tìm kiếm không hợp lệ!" });
  }

  try {
    // Gọi hàm tìm kiếm từ file handleRoom
    
    const result = await sql.searchUser(search, offset, limit,req.user.userId);

    if (result.success) {
      // Tính tổng số trang
      const totalPages = Math.ceil(result.total / limit);
      res.status(200).json({
        success: true,
        users: result.users,
        totalRecords: result.total, // Tổng số bản ghi
        currentRecords: result.users.length, // Số bản ghi hiện tại trong trang
        pageSize: parseInt(limit), // Số bản ghi mỗi trang
        currentPage: parseInt(page), // Trang hiện tại
        totalPages // Tổng số trang
      });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Tìm kiếm thất bại:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi trong quá trình tìm kiếm.' });
  }
});

// Tạo phòng chat giữa hai người dùng nếu chưa tồn tại
router.post('/createRoom', authenticateToken, async function (req, res) {
  // #swagger.tags = ['Room']
  // #swagger.summary = 'Tạo phòng chat'
  // #swagger.description = 'Endpoint để tạo phòng chat nếu người dùng chưa có phòng chat với người dùng được tìm kiếm.'

  const { targetUserId } = req.body; // ID người dùng mà người dùng hiện tại muốn tạo phòng chat

  // Kiểm tra dữ liệu đầu vào
  if (!targetUserId) {
    return res.status(400).json({ success: false, message: "Yêu cầu tạo phòng không hợp lệ!" });
  }

  try {
    const userId = req.user.userId; // ID của người dùng hiện tại (được lấy từ token)

    // Kiểm tra sự tồn tại của targetUserId
    const targetUserExists = await sql.checkUserExistence(targetUserId);
    if (!targetUserExists) {
      return res.status(404).json({ success: false, message: "Người dùng được chỉ định không tồn tại." });
    }
    if (targetUserId == userId) {
      return res.status(400).json({ success: false, message: "Không thể tạo phòng với chính bản thân!" });
    }
    // Gọi hàm kiểm tra và tạo phòng từ file handleRoom
    const result = await sql.createRoom(userId, targetUserId);

    if (result.success) {
      res.status(201).json({ success: true, roomId: result.roomId, message: "Phòng chat đã được tạo thành công." });
    } else {
      res.status(400).json( result );
    }
  } catch (error) {
    console.error('Tạo phòng chat thất bại:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi trong quá trình tạo phòng.' });
  }
});

// Lấy danh sách tin nhắn của phòng theo phân trang
router.get('/:roomId/messages', authenticateToken, async function (req, res) {
  // #swagger.tags = ['Room']
  // #swagger.summary = 'Lấy danh sách tin nhắn của phòng'
  // #swagger.description = 'API này lấy danh sách tin nhắn cũ trong phòng chat, sắp xếp từ mới nhất đến cũ nhất, hỗ trợ phân trang.'

  const { roomId } = req.params;
  const { page = 1, limit = 20 } = req.query; // Mặc định là trang 1 và giới hạn 20 tin nhắn
  const offset = (page - 1) * limit;

  try {
    // Kiểm tra xem người dùng có trong phòng không
    const isMember = await sql.checkRoomMembership(req.user.userId, roomId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Bạn không phải là thành viên của phòng này!' });
    }

    // Gọi hàm lấy tin nhắn từ file handleRoom
    const result = await sql.getRoomMessages(roomId, offset, limit);

    if (result.success) {
      res.status(200).json({
        success: true,
        messages: result.messages,
        totalRecords: result.total,
        currentRecords: result.messages.length,
        pageSize: parseInt(limit),
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.total / limit),
      });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lấy tin nhắn thất bại:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi lấy tin nhắn.' });
  }
});

// Lấy danh sách phòng chat của người dùng
router.get('/getUserRooms', authenticateToken, async function (req, res) {
  // #swagger.tags = ['Room']
  // #swagger.summary = 'Lấy danh sách phòng chat của người dùng'
  // #swagger.description = 'Endpoint để lấy danh sách các phòng chat của người dùng hiện tại.'
  const userId = req.user.userId; // Lấy userId từ token đã được xác thực
  const { page = 1, limit = 20 } = req.query; // Mặc định là trang 1 và giới hạn 20 tin nhắn
  const offset = (page - 1) * limit;
  try {
    // Gọi hàm lấy danh sách phòng từ file handleRoom
    const result = await sql.getUserRooms(userId, offset, limit);

    if (result.success) {
      res.status(200).json({
        success: true,
        rooms: result.rooms,
        totalRecords: result.total, // Tổng số phòng
        currentRecords: result.rooms.length,
        pageSize: parseInt(limit),
        currentPage: parseInt(page),
        totalPages: Math.ceil(result.total / limit),
      });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lấy danh sách phòng thất bại:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi trong quá trình lấy danh sách phòng.' });
  }
});

module.exports = router;