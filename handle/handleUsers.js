//handleUsers.js
const db = require('../dbconfig');
const pool = db.getPool();
const sql = require('mssql');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleOAuth2Client = new OAuth2Client(process.env.googleClientId);
const generateRandomCode = require('../utils/generateCode');
const hashPassword = require('../utils/password');

// hàm xử lý cập nhật ảnh hồ sơ
async function updateProfilePicture(userId, profilePicture) {
  const transaction = new sql.Transaction(pool);
  try {
    // Bắt đầu transaction
    await transaction.begin();

    let request = new sql.Request(transaction);

    await request
      .input('profilePicture', sql.NVarChar, profilePicture)
      .input('userId', sql.Int, userId)
      .query(`
            UPDATE users SET profilePicture = @profilePicture WHERE userId = @userId
          `);

    // Commit transaction sau khi tất cả các truy vấn thành công
    await transaction.commit();
    return { success: true, message: "Ảnh hồ sơ đã được cập nhật thành công!" };

  } catch (error) {
    // Rollback nếu có lỗi
    await transaction.rollback();
    console.error('Lỗi khi cập nhật ảnh hồ sơ:', error);
    return { success: false, message: "Đã xảy ra lỗi khi cập nhật ảnh hồ sơ." };
  }
}

// Hàm xử lý kiểm tra quyền truy cập ảnh hồ sơ
async function hasAccessToProfilePicture(userId, filename) {
  try {
    const request = new sql.Request(pool);
    const result = await request
      .input('userId', sql.Int, userId)
      .query(`
          SELECT profilePicture 
          FROM users 
          WHERE userId = @userId
        `);

    // Kiểm tra nếu không có bản ghi nào được trả về (người dùng không tồn tại)
    if (result.recordset.length === 0) {
      return false;
    }

    const profilePicture = result.recordset[0].profilePicture;

    // Lấy tên file từ đường dẫn đầy đủ của profilePicture
    const storedFilename = path.basename(profilePicture);

    // Nếu ảnh thuộc về người dùng và đúng tên file
    return storedFilename === filename;
  } catch (error) {
    console.error('Lỗi khi kiểm tra ảnh hồ sơ:', error);
    return false;
  }
}

// Hàm xử lý cập nhật tên người dùng
async function updateUserName(userId, newUserName) {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // Kiểm tra xem tên người dùng mới đã tồn tại chưa
    let request = new sql.Request(transaction);
    const checkUserName = await request
      .input('userName', sql.NVarChar, newUserName)
      .query('SELECT userId FROM users WHERE userName = @userName AND isDelete = 0');

    if (checkUserName.recordset.length > 0) {
      await transaction.rollback();
      return { success: false, message: 'Tên người dùng đã tồn tại.', statusCode: 409 };  // 409: Conflict
    }

    // Cập nhật tên người dùng
    request = new sql.Request(transaction);
    await request
      .input('userId', sql.Int, userId)
      .input('newUserName', sql.NVarChar, newUserName)
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
          UPDATE users 
          SET userName = @newUserName, updatedAt = @updatedAt 
          WHERE userId = @userId AND isDelete = 0
        `);

    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi khi cập nhật tên người dùng:', error);
    return { success: false, message: 'Lỗi hệ thống.', statusCode: 500 };
  }
}

// Hàm đổi mật khẩu
async function changePassword(userId, oldPassword, newPassword,refreshToken) {
  try {
    // Tạo một transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();  // Bắt đầu transaction

    // Lấy user với userId
    let request = new sql.Request(transaction);
    const resultUser = await request
      .input('userId', sql.Int, userId)
      .query('SELECT passwordHash FROM users WHERE userId = @userId AND isDelete = 0');

    if (resultUser.recordset.length === 0) {
      return { success: false, message: "Người dùng không tồn tại!", statusCode: 404 };
    }

    const user = resultUser.recordset[0];

    // So sánh mật khẩu cũ
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordMatch) {
      return { success: false, message: "Mật khẩu cũ không chính xác!" };
    }

    // Kiểm tra mật khẩu mới có trùng với mật khẩu cũ không
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return { success: false, message: "Mật khẩu mới không được trùng với mật khẩu cũ!" };
    }

    // Hash mật khẩu mới
    const newPasswordHash = await hashPassword(newPassword);

    // Cập nhật mật khẩu mới
    request = new sql.Request(transaction);
    await request
      .input('userId', sql.Int, userId)
      .input('newPasswordHash', sql.NVarChar, newPasswordHash)
      .input('updatedAt', sql.DateTime, new Date())
      .query('UPDATE users SET passwordHash = @newPasswordHash, updatedAt = @updatedAt WHERE userId = @userId');

    // 2. Xóa tất cả refresh tokens của user sau khi đổi mật khẩu
    request = new sql.Request(transaction);
    await request
      .input('userId', sql.Int, userId)
      .input('currentRefreshToken', sql.NVarChar, refreshToken)
      .query('DELETE FROM refreshTokens WHERE userId = @userId AND token != @currentRefreshToken');

    // Commit transaction
    await transaction.commit();
    return { success: true, message: "Đổi mật khẩu thành công." };

  } catch (error) {
    // Rollback transaction nếu có lỗi
    console.error('Lỗi khi đổi mật khẩu:', error);
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Lỗi khi rollback:', rollbackError);
    }
    return { success: false, message: "Đổi mật khẩu thất bại." };
  }
}



module.exports = {
  updateProfilePicture,
  hasAccessToProfilePicture,
  updateUserName,
  changePassword
};