//auth.js
const jwt = require('jsonwebtoken');

// Middleware xác thực access token
function authenticateToken(req, res, next) {
    // Lấy token từ header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Tách token

    if (!token) {
        return res.status(401).json({ success: false, message: "Token không tồn tại." }); // Không có token
    }

    jwt.verify(token, process.env.accessTokenSecret, (err, user) => {
        if (err) {
            // Kiểm tra lỗi và trả về mã lỗi chi tiết
            return res.status(403).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." }); // Token không hợp lệ
        }

        req.user = user; // Gán thông tin người dùng
        next(); // Cho phép request tiếp tục
    });
    
}

module.exports = { authenticateToken };
