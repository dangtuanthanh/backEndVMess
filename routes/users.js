//users.js
var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const sql = require("../handle/handleUsers");
const { authenticateToken } = require("../middleware/auth");
router.use(bodyParser.json());//cho phép xử lý dữ liệu gửi lên dạng json


// import xử lý ảnh
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Regex kiểm tra email hợp lệ
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//#region cập nhật ảnh hồ sơ
// Cấu hình thư mục lưu ảnh và tên file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/profilePictures');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const fileName = `profile_${req.user.userId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Cho phép file tiếp tục xử lý
  } else {
    // Ném lỗi với mã lỗi tùy chỉnh cho định dạng file không hợp lệ
    const error = new Error('Định dạng file không hợp lệ! Chỉ chấp nhận JPEG, PNG và JPG.');
    error.code = 'INVALID_FILE_TYPE'; // Gán mã lỗi tùy chỉnh
    cb(error, false); // Ném lỗi và không chấp nhận file
  }
};


// Sử dụng multer với cấu hình lưu trữ và kiểm tra file
const upload = multer({
  storage: storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // Giới hạn kích thước 5MB
  fileFilter: fileFilter
});


router.post('/updateProfilePicture', authenticateToken, (req, res) => {
  // #swagger.tags = ['User Profile']
  // #swagger.summary = 'Cập nhật ảnh hồ sơ'
  // #swagger.description = 'Endpoint để cập nhật ảnh hồ sơ người dùng'
  upload.single('profilePicture')(req, res, function (err) {
    console.log('err', err); // Log để kiểm tra lỗi nhận được

    if (err instanceof multer.MulterError) {
      // Xử lý lỗi liên quan đến Multer (ví dụ: vượt quá giới hạn file)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Kích thước file quá lớn. Giới hạn tối đa là 5MB.' });
      }
      return res.status(400).json({ success: false, message: 'Lỗi khi tải file lên: ' + err.message });
    } else if (err) {
      // Xử lý lỗi định dạng file không hợp lệ
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, message: 'Định dạng file không hợp lệ! Chỉ chấp nhận JPEG, PNG và JPG.' });
      }
      // Các lỗi khác
      return res.status(400).json({ success: false, message: 'Lỗi không xác định: ' + err.message });
    }

    // Kiểm tra xem có file ảnh được gửi lên không
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một ảnh để tải lên!' });
    }

    // Đường dẫn ảnh trên server
    const imagePath = path.join(__dirname, '../uploads/profilePictures', req.file.filename);

    // Cắt ảnh thành hình vuông 512x512 pixels
    const resizedImagePath = imagePath.replace(path.extname(imagePath), '_resized.png');
    sharp(imagePath)
      .resize(512, 512) // Kích thước chuẩn
      .toFile(resizedImagePath)
      .then(() => {
        // Xóa ảnh gốc sau khi resize (tùy chọn)
        fs.unlinkSync(imagePath);

        // Lưu đường dẫn mới vào cơ sở dữ liệu
        const imageUrl = `${req.protocol}://${req.headers.host}/uploads/profilePictures/${path.basename(resizedImagePath)}`;
        sql.updateProfilePicture(req.user.userId, imageUrl)
          .then(result => {
            if (result.success) {
              return res.status(200).json({ success: true, message: 'Ảnh hồ sơ đã được cập nhật thành công!', url: imageUrl });
            } else {
              return res.status(500).json({ success: false, message: 'Có lỗi khi lưu thông tin ảnh vào cơ sở dữ liệu.' });
            }
          })
          .catch(dbError => {
            console.error('Lỗi khi lưu ảnh vào cơ sở dữ liệu:', dbError);
            return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi cập nhật ảnh hồ sơ.' });
          });
      })
      .catch(imageError => {
        console.error('Lỗi khi xử lý ảnh:', imageError);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi xử lý ảnh.' });
      });
  });
});

//#endregion

// API kiểm tra quyền truy cập ảnh
router.get('/uploads/profilePictures/:filename', authenticateToken, async (req, res) => {
  // #swagger.tags = ['User Profile']
  // #swagger.summary = 'Lấy ảnh hồ sơ'
  // #swagger.description = 'Endpoint để lấy ảnh hồ sơ người dùng với xác thực'

  const { filename } = req.params; // Lấy tên file ảnh từ URL
  const userId = req.user.userId;   // Lấy ID người dùng từ token đã xác thực

  try {
    // Gọi hàm kiểm tra xem người dùng hiện tại có quyền truy cập ảnh hay không
    const hasAccess = await sql.hasAccessToProfilePicture(userId, filename);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập ảnh này!' });
    }

    // Trả về file ảnh nếu tồn tại
    const filePath = path.join(__dirname, '../uploads/profilePictures', filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ success: false, message: 'Ảnh không tồn tại!' });
    }
  } catch (error) {
    console.error('Lỗi khi truy xuất ảnh:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi truy xuất ảnh.' });
  }
});

// API cập nhật tên người dùng
router.put('/updateUserName', authenticateToken, async (req, res) => {
  // #swagger.tags = ['User Profile']
  // #swagger.summary = 'Cập nhật tên người dùng'
  // #swagger.description = 'Endpoint để cập nhật tên người dùng'

  const { userName } = req.body;  // Lấy tên người dùng mới từ body request
  const userId = req.user.userId; // Lấy ID người dùng từ token đã xác thực

  // Kiểm tra dữ liệu đầu vào
  if (!userName || userName.trim() === '') {
    return res.status(400).json({ success: false, message: 'Tên người dùng không hợp lệ!' });
  }

  try {
    // Gọi hàm kiểm tra và cập nhật tên người dùng từ file handleUser
    const result = await sql.updateUserName(userId, userName);

    if (result.success) {
      res.status(200).json({ success: true, message: 'Tên người dùng đã được cập nhật thành công.' });
    } else {
      if (result.statusCode == 409)
        res.status(409).json({ success: false, message: result.message });
      else
        res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật tên người dùng:', error);
    res.status(500).json({ success: false, message: 'Đã xảy ra lỗi trong quá trình cập nhật tên người dùng.' });
  }
});

// Đổi mật khẩu
router.post('/changePassword', authenticateToken, async function (req, res) {
  // #swagger.tags = ['User Profile']
  // #swagger.summary = 'Đổi mật khẩu'
  // #swagger.description = 'Endpoint để đổi mật khẩu cho người dùng.'

  const { oldPassword, newPassword } = req.body;
  const refreshToken = req.cookies.refreshToken;
  // Kiểm tra dữ liệu đầu vào
  if (!oldPassword || !newPassword || !refreshToken) {
    return res.status(400).json({ success: false, message: "Dữ liệu gửi lên không chính xác!" });
  }

  // // Kiểm tra độ dài mật khẩu mới theo chuẩn quốc tế (chỉ nếu có yêu cầu)
  // if (newPassword.length < 8) {
  //   return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 8 ký tự." });
  // }
 

  try {
    // Gọi hàm xử lý từ file handleIndex
    const result = await sql.changePassword(req.user.userId, oldPassword, newPassword, refreshToken);

    if (result.success) {
      res.status(200).json({ success: true, message: "Mật khẩu đã được đổi thành công." });
    } else {
      if (result.statusCode == 404)
        res.status(404).json({ success: false, message: result.message });
      else
        res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Đổi mật khẩu thất bại:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
