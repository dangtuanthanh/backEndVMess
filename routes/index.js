var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const sql = require("../handle/handleIndex");
const jwt = require('jsonwebtoken');
const { authenticateToken } = require("../middleware/auth");
router.use(bodyParser.json());//cho phép xử lý dữ liệu gửi lên dạng json
// router.use(bodyParser.urlencoded({ extended: false }));//cho phép xử lý dữ liệu gửi lên dạng application/x-www-form-urlencoded

// import xử lý ảnh
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Regex kiểm tra email hợp lệ
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* GET home page. */
router.get('/', function (req, res, next) {
  // #swagger.tags = ['Home']  // Bạn có thể tạo tag 'Home'
  // #swagger.summary = 'Trang chủ của Back-end'
  // #swagger.description = 'Đây là trang chủ của back-end API, server đang chạy.'
  res.render('index', { title: 'VMess' });
});


// đăng ký tài khoản mới
router.post('/register', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Đăng ký tài khoản mới'
  // #swagger.description = 'Endpoint để đăng ký tài khoản mới với email và mật khẩu.'
  const { email, password } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Dữ liệu gửi lên không chính xác!" });
  }

  // Kiểm tra tính hợp lệ của email theo chuẩn quốc tế
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ!" });
  }
  try {
    // Gọi hàm đăng ký từ file handleIndex
    const result = await sql.register(req.body);

    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Đăng ký thất bại:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xác thực mã code
router.post('/verifyCode', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Xác thực mã code'
  // #swagger.description = 'Endpoint để Xác thực mã code.'
  // Kiểm tra dữ liệu đầu vào
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Dữ liệu gửi lên không chính xác!" });
  }

  // Kiểm tra tính hợp lệ của email theo chuẩn quốc tế
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ!" });
  }
  try {
    const result = await sql.verifyCode(req.body);
    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Xác thực thất bại:', error);
    res.status(500).json({ success: false, message: "Lỗi khi xác thực.", error });
  }
}
);

// Đăng nhập
router.post('/login', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Đăng nhập'
  // #swagger.description = 'Endpoint để đăng nhập với email và mật khẩu.'
  const { email, password } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Dữ liệu gửi lên không chính xác!" });
  }

  // Kiểm tra tính hợp lệ của email theo chuẩn quốc tế
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ!" });
  }

  try {
    // Gọi hàm xử lý đăng nhập từ file handleIndex
    const result = await sql.login({ email, password });

    if (result.success) {
      // Tạo access token và refresh token
      const accessToken = jwt.sign({ userId: result.userId }, process.env.accessTokenSecret, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: result.userId }, process.env.refreshTokenSecret, { expiresIn: '7d' });

      // Lưu refresh token vào cơ sở dữ liệu
      await sql.saveRefreshToken(result.userId, refreshToken);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,   // Chỉ cho phép HTTP truy cập, không cho JavaScript
        secure: true,    // Tạm thời không bật chế độ bảo mật HTTPS
        sameSite: 'Lax', // Không gửi cookie với các request ngoài cùng nguồn
        maxAge: 7 * 24 * 60 * 60 * 1000 // Thời gian sống 7 ngày
      });

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        accessToken: accessToken
      });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi trong quá trình đăng nhập." });
  }
});

// Kiểm tra Access Token
router.post('/checkToken', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Kiểm tra Access Token'
  // #swagger.description = 'Endpoint để kiểm tra Access Token có hợp lệ hay không khi mới vào trang.'

  const accessToken = req.headers['authorization'];

  // Kiểm tra nếu không có Access Token
  if (!accessToken) {
    return res.status(400).json({ success: false, message: "Không tìm thấy Access Token!" });
  }

  try {
    // Gọi hàm xác thực Access Token từ file handleIndex
    const result = await sql.verifyAccessToken(accessToken);

    if (result.success) {
      return res.status(200).json({ success: true, message: "Access Token hợp lệ.", user: result.user });
    } else {
      return res.status(401).json({ success: false, message: "Access Token không hợp lệ hoặc đã hết hạn!" });
    }
  } catch (error) {
    console.error('Lỗi kiểm tra Access Token:', error);
    return res.status(500).json({ success: false, message: "Đã xảy ra lỗi trong quá trình kiểm tra Access Token." });
  }
});

// Làm mới Access Token bằng Refresh Token
router.post('/refreshToken', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Làm mới Access Token'
  // #swagger.description = 'Endpoint để lấy Access Token mới bằng Refresh Token.'
  const refreshToken = req.cookies.refreshToken;
  // Kiểm tra dữ liệu đầu vào
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh Token không được gửi lên!" });
  }

  try {
    // Gọi hàm xử lý làm mới token từ file handleIndex.js
    const result = await sql.refreshAccessToken(refreshToken);


    if (result.success) {
      // Tạo Access Token mới
      console.log('result.user.userId', result.user.userId);
      const newAccessToken = jwt.sign({ userId: result.user.userId }, process.env.accessTokenSecret, { expiresIn: '15m' });

      res.status(200).json({
        success: true,
        message: 'Làm mới Access Token thành công.',
        accessToken: newAccessToken,
        user: result.user
      });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi khi làm mới Access Token:', error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi trong quá trình làm mới Access Token." });
  }
});

// Đăng xuất
router.post('/logout', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Đăng xuất'
  // #swagger.description = 'Endpoint để đăng xuất và xóa Refresh Token.'

  const refreshToken = req.cookies.refreshToken;

  // Kiểm tra dữ liệu đầu vào
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh Token không được gửi lên!" });
  }

  try {
    // Gọi hàm xử lý đăng xuất từ file handleIndex.js
    const result = await sql.logout(refreshToken);

    if (result.success) {
      res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: true, // Nếu triển khai thực tế, nên đặt thành true khi sử dụng HTTPS
        sameSite: 'Lax',
        maxAge: 0 // Xóa cookie ngay lập tức
      });

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công.'
      });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi trong quá trình đăng xuất." });
  }
});

// Đăng nhập bằng Google
router.post('/googleLogin', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Đăng nhập bằng Google'
  // #swagger.description = 'Endpoint để đăng nhập thông qua tài khoản Google.'

  const { tokenId } = req.body;

  if (!tokenId) {
    return res.status(400).json({ success: false, message: "Thiếu tokenId từ Google." });
  }

  try {
    // Gọi hàm xử lý logic Google Login từ file handleIndex
    const result = await sql.googleLogin(tokenId);
    if (result.success) {
      // Tạo access token và refresh token
      const accessToken = jwt.sign({ userId: result.userId }, process.env.accessTokenSecret, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: result.userId }, process.env.refreshTokenSecret, { expiresIn: '7d' });

      // Lưu refresh token vào cơ sở dữ liệu
      await sql.saveRefreshToken(result.userId, refreshToken);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,   // Chỉ cho phép HTTP truy cập, không cho JavaScript
        secure: false,    // Tạm thời không bật chế độ bảo mật HTTPS
        sameSite: 'Lax', // Không gửi cookie với các request ngoài cùng nguồn
        maxAge: 7 * 24 * 60 * 60 * 1000 // Thời gian sống 7 ngày
      });
      return res.status(200).json({
        success: true,
        message: 'Đăng nhập bằng Google thành công.',
        accessToken: accessToken
      });
    } else {
      return res.status(result.status || 400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi đăng nhập bằng Google:', error);
    return res.status(500).json({ success: false, message: "Đã xảy ra lỗi trong quá trình đăng nhập bằng Google." });
  }
});

//#region chức năng quên mật khẩu
// Yêu cầu quên mật khẩu
router.post('/forgotPassword', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Yêu cầu quên mật khẩu'
  // #swagger.description = 'Endpoint để yêu cầu quên mật khẩu'
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email không được để trống!" });
  }
  // Kiểm tra tính hợp lệ của email theo chuẩn quốc tế
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ!" });
  }
  try {
    const result = await sql.forgotPassword(email);

    if (result.success) {
      res.status(200).json({ success: true, message: "Mã xác thực đã được gửi đến email của bạn." });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Quên mật khẩu thất bại:', error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi yêu cầu đặt lại mật khẩu." });
  }
});
// Xác thực mã reset mật khẩu
router.post('/verifyResetCode', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Xác thực mã quên mật khẩu'
  // #swagger.description = 'Endpoint để Xác thực mã trong chức năng quên mật khẩu'
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Dữ liệu không chính xác!" });
  }
  // Kiểm tra tính hợp lệ của email theo chuẩn quốc tế
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ!" });
  }
  try {
    const result = await sql.verifyResetCode(email, code);

    if (result.success) {
      res.cookie('tempToken', result.tempToken, {
        httpOnly: true,   // Chỉ cho phép HTTP truy cập, không cho JavaScript
        secure: false,    // Tạm thời không bật chế độ bảo mật HTTPS
        sameSite: 'Lax', // Không gửi cookie với các request ngoài cùng nguồn
        maxAge: 15 * 60 * 1000  // Thời gian sống 15p
      });
      res.status(200).json({ success: true, message: "Mã xác thực hợp lệ. Bạn có thể đổi mật khẩu." });
      console.log('tokenAPIverifyResetCode', result.tempToken);

    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Xác thực mã thất bại:', error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi xác thực mã." });
  }
});
// Đổi mật khẩu cho chức năng quên mật khẩu
router.post('/resetPassword', async function (req, res) {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Đổi mật khẩu mới trong chức năng quên mật khẩu'
  // #swagger.description = 'Endpoint Đổi mật khẩu mới trong chức năng quên mật khẩu'

  const { newPassword } = req.body;
  const tempToken = req.cookies.tempToken;
  // Kiểm tra dữ liệu đầu vào
  if (!tempToken || !newPassword) {
    return res.status(400).json({ success: false, message: "Dữ liệu không chính xác!" });
  }

  try {
    let decoded;  // Khai báo biến decoded ở đây để có thể truy cập sau try-catch

    // Giải mã token tạm thời
    try {
      decoded = jwt.verify(tempToken, process.env.temporaryTokenSecret);
      // Kiểm tra token có hợp lệ không
      if (!decoded || !decoded.email || !decoded.userId) {
        return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
    }
    // Tiến hành đổi mật khẩu và xóa tất cả refresh tokens
    const result = await sql.resetPassword(decoded.email, newPassword);

    // Nếu thành công
    if (result.success) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      // Nếu có lỗi trong quá trình reset
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Đổi mật khẩu thất bại:', error);
    return res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi đổi mật khẩu." });
  }
});
//#endregion



module.exports = router;

