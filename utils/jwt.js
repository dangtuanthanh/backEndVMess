const jwt = require('jsonwebtoken');

// Hàm tạo access token
function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

// Hàm tạo refresh token
function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
}
module.exports = { generateAccessToken, generateRefreshToken };