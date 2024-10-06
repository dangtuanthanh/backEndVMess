const jwt = require('jsonwebtoken');

// Middleware xác thực access token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ header
    if (token == null) return res.sendStatus(401); // Không có token

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token không hợp lệ
        req.user = user;
        next(); // Cho phép request tiếp tục
    });
}

module.exports = { authenticateToken };