const db = require('../dbconfig');
const pool = db.getPool();
const sql = require('mssql');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleOAuth2Client = new OAuth2Client(process.env.googleClientId);
const generateRandomCode = require('../utils/generateCode');
const hashPassword = require('../utils/password');

// Hàm đăng ký
async function register(data) {
    const { email, password } = data;
    try {
        // Bắt đầu một transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();  // Quan trọng: bắt đầu transaction

        // Tạo một request trong transaction
        let request = new sql.Request(transaction);
        // Thời gian hiện tại từ back-end
        const currentTime = new Date();
        // Lấy userId của các tài khoản có mã xác thực hết hạn
        const expiredUsers = await request
            .input('currentTime', sql.DateTime, currentTime)
            .query(`
                SELECT DISTINCT fpc.userId 
                FROM forgotPasswordCodes fpc 
                WHERE fpc.expiresAt < @currentTime
            `);

        // Lưu các userId vào mảng
        const userIdsToDelete = expiredUsers.recordset.map(row => row.userId);

        // Xóa các mã xác thực hết hạn
        request = new sql.Request(transaction);
        await request
            .input('currentTime', sql.DateTime, currentTime)
            .query(`
                DELETE FROM forgotPasswordCodes 
                WHERE expiresAt < @currentTime
            `);

        // Xóa tài khoản tương ứng với các mã xác thực đã hết hạn và chưa được xác thực
        if (userIdsToDelete.length > 0) {
            await request.query(`
                DELETE FROM users 
                WHERE userId IN (${userIdsToDelete.join(',')})
                AND isVerified = 0
            `);
        }


        // Kiểm tra email đã tồn tại chưa
        const resultCheckEmail = await request
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM users WHERE email = @email');

        if (resultCheckEmail.recordset.length > 0) {
            return { success: false, message: "Email đã được sử dụng" };
        }



        // Tạo người dùng mới
        const userName = email.split('@')[0]; // Lấy phần trước dấu @ từ email làm userName
        console.log('userName', userName);

        request = new sql.Request(transaction);
        const resultCreateAccount = await request
            .input('email', sql.VarChar, email)
            .input('passwordHash', sql.VarChar, await hashPassword(password))
            .input('userName', sql.NVarChar, userName) // Chèn userName vào cột userName
            .query(`
    INSERT INTO users (email, passwordHash, userName) 
    VALUES (@email, @passwordHash, @userName); 
    SELECT SCOPE_IDENTITY() AS userId
  `);


        const userId = resultCreateAccount.recordset[0].userId;
        console.log('userId', userId);

        // Sinh mã xác thực
        const verificationCode = generateRandomCode();
        const expirationTime = new Date(Date.now() + 15 * 60000); // 15 phút
        const createdAt = new Date(Date.now());

        // Lưu mã xác thực
        await request
            .input('userId', sql.Int, userId)
            .input('code', sql.VarChar, verificationCode)
            .input('expiresAt', sql.DateTime, expirationTime)
            .input('createdAt', sql.DateTime, createdAt)
            .query('INSERT INTO forgotPasswordCodes (userId, code, expiresAt, createdAt) VALUES (@userId, @code, @expiresAt, @createdAt)');

        // Gửi email xác thực
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.emailUser,
                pass: process.env.emailPassword
            }
        });

        const mailOptions = {
            from: process.env.emailUser,
            to: email,
            subject: 'Xác thực tài khoản VMess',
            text: `Chào bạn, mã xác thực tài khoản VMess của bạn là: ${verificationCode}. Mã sẽ hết hạn sau 15 phút.`
        };

        let info;
        try {
            info = await transporter.sendMail(mailOptions);
            console.log('Email sent: ' + info.response);

            // Nếu gửi thành công, commit transaction
            await transaction.commit();
            return { success: true, message: "Đăng ký thành công, vui lòng kiểm tra email để xác thực." };
        } catch (emailError) {
            // Nếu lỗi gửi email, rollback transaction
            console.error('Lỗi khi gửi email:', emailError);
            await transaction.rollback();

            if (emailError.responseCode === 550) {
                return { success: false, message: "Email không tồn tại hoặc hộp thư đầy." };
            }
            return { success: false, message: "Không thể gửi email xác thực. Vui lòng thử lại sau." };
        }
    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);

        // Rollback transaction nếu có bất kỳ lỗi nào trong quá trình xử lý
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error('Lỗi khi rollback:', rollbackError);
        }

    }
}
//hàm xác thực code
async function verifyCode({ email, code }) {
    // Bắt đầu một transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();  // Quan trọng: bắt đầu transaction

    try {
        // Tạo một request trong transaction
        let request = new sql.Request(transaction);
        //kiểm tra sự tồn tại của email
        const user = await request
            .input('email', sql.NVarChar, email)
            .query(`
        SELECT userId 
        FROM users 
        WHERE email = @email
      `);

        if (!user.recordset.length) {
            return { success: false, message: "Email không tồn tại trong hệ thống!" };
        }
        request = new sql.Request(transaction);
        // Kiểm tra mã code
        const currentTime = new Date();
        const forgotPasswordCode = await request
            .input('email', sql.NVarChar, email)
            .input('code', sql.NVarChar, code)
            .input('currentTime', sql.DateTime, currentTime)
            .query(`
                SELECT fpc.forgotPasswordCodeId, fpc.code, fpc.expiresAt, fpc.usedAt, u.userId 
                FROM forgotPasswordCodes fpc
                INNER JOIN users u ON fpc.userId = u.userId
                WHERE u.email = @email 
                  AND fpc.code = @code
                  AND fpc.usedAt IS NULL 
                  AND fpc.expiresAt > @currentTime
            `);

        if (forgotPasswordCode.recordset.length === 0) {
            // Mã code không hợp lệ hoặc đã hết hạn
            await transaction.rollback(); // Rollback nếu mã code không hợp lệ
            return { success: false, message: 'Mã code không hợp lệ hoặc đã hết hạn' };
        }

        const userId = forgotPasswordCode.recordset[0].userId;

        // Cập nhật bảng forgotPasswordCodes (usedAt)
        request = new sql.Request(transaction);
        await request
            .input('userId', sql.Int, userId)
            .input('code', sql.NVarChar, code)
            .input('usedAt', sql.DateTime, new Date())
            .query(`
          UPDATE forgotPasswordCodes 
          SET usedAt = @usedAt 
          WHERE userId = @userId AND code = @code
        `);

        // Cập nhật bảng users (isVerified)
        request = new sql.Request(transaction);
        await request
            .input('userId', sql.Int, userId)
            .query(`
          UPDATE users 
          SET isVerified = 1 
          WHERE userId = @userId
        `);

        // Commit transaction nếu mọi thứ thành công
        await transaction.commit();
        return { success: true, message: 'Mã code đã được xác thực thành công' };
    } catch (error) {
        // Nếu có lỗi, rollback lại transaction
        await transaction.rollback();
        console.error('Lỗi xác thực mã code:', error);
        return { success: false, message: 'Đã xảy ra lỗi trong quá trình xác thực mã code' };
    }
}


// Hàm đăng nhập
async function login({ email, password }) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Kiểm tra email có tồn tại không
        let request = new sql.Request(transaction);
        const result = await request
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email and isDelete = 0');

        if (!result.recordset.length) {
            await transaction.rollback();
            return { success: false, message: "Email hoặc mật khẩu không đúng!" };
        }

        const user = result.recordset[0];

        // Kiểm tra xem tài khoản đã xác thực chưa
        if (!user.isVerified) {
            await transaction.rollback();
            return { success: false, message: "Tài khoản chưa được xác thực!" };
        }

        // Kiểm tra mật khẩu
        if (!user.passwordHash) {
            await transaction.rollback();
            return { success: false, message: "Bạn chưa thiết lập mật khẩu cho tài khoản của mình. Vui lòng đăng nhập bằng tài khoản Google." };
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            console.log('mật khẩu không đúng');

            await transaction.rollback();
            return { success: false, message: "Email hoặc mật khẩu không đúng!" };
        }

        await transaction.commit();
        return { success: true, userId: user.userId };
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi đăng nhập:', error);
        return { success: false, message: "Đã xảy ra lỗi trong quá trình đăng nhập." };
    }
}

// Hàm lưu refresh token
async function saveRefreshToken(userId, token) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày
        let request = new sql.Request(transaction);

        await request
            .input('userId', sql.Int, userId)
            .input('token', sql.NVarChar, token)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query(`
                INSERT INTO refreshTokens (userId, token, expiresAt)
                VALUES (@userId, @token, @expiresAt)
            `);

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi lưu refresh token:', error);
    }
}

// Hàm xác thực Access Token
async function verifyAccessToken(token) {
    try {
        // Xác thực JWT bằng secret key
        const decoded = jwt.verify(token, process.env.accessTokenSecret);
        // Lấy thông tin người dùng
        const userResult = await pool.request()
            .input('userId', sql.Int, decoded.userId)
            .query('SELECT userId, email, userName, profilePicture FROM users WHERE userId = @userId and isDelete = 0');

        if (!userResult.recordset.length) {
            await transaction.rollback();
            return { success: false };
        }

        const user = userResult.recordset[0];
        // Nếu thành công, trả về thông tin userId từ token
        return { success: true, user: user };
    } catch (error) {
        console.error('Lỗi khi xác thực Access Token:', error);
        return { success: false };
    }
}

// Hàm làm mới Access Token
async function refreshAccessToken(refreshToken) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let request = new sql.Request(transaction);

        // Kiểm tra Refresh Token có tồn tại không
        const result = await request
            .input('token', sql.NVarChar, refreshToken)
            .query('SELECT * FROM refreshTokens WHERE token = @token');

        if (!result.recordset.length) {
            await transaction.rollback();
            return { success: false, message: "Refresh Token không hợp lệ!" };
        }

        const tokenData = result.recordset[0];

        // Kiểm tra Refresh Token đã hết hạn chưa
        if (new Date(tokenData.expiresAt) < new Date()) {
            await transaction.rollback();
            return { success: false, message: "Refresh Token đã hết hạn!" };
        }

        // Lấy thông tin người dùng
        const userResult = await request
            .input('userId', sql.Int, tokenData.userId)
            .query('SELECT userId, email, userName, profilePicture FROM users WHERE userId = @userId and isDelete = 0');

        if (!userResult.recordset.length) {
            await transaction.rollback();
            return { success: false, message: "Người dùng không tồn tại!" };
        }

        const user = userResult.recordset[0];
        await transaction.commit();
        return { success: true, user: user };
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi làm mới Access Token:', error);
        return { success: false, message: "Đã xảy ra lỗi trong quá trình làm mới Access Token." };
    }
}

// Hàm đăng xuất
async function logout(refreshToken) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Kiểm tra Refresh Token có tồn tại không
        let request = new sql.Request(transaction);
        const result = await request
            .input('token', sql.NVarChar, refreshToken)
            .query('SELECT * FROM refreshTokens WHERE token = @token');

        if (!result.recordset.length) {
            await transaction.rollback();
            return { success: false, message: "Refresh Token không hợp lệ!" };
        }

        // Xóa Refresh Token khỏi cơ sở dữ liệu
        request = new sql.Request(transaction);
        await request
            .input('token', sql.NVarChar, refreshToken)
            .query('DELETE FROM refreshTokens WHERE token = @token');

        await transaction.commit();
        return { success: true, message: "Đăng xuất thành công." };
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi đăng xuất:', error);
        return { success: false, message: "Đã xảy ra lỗi trong quá trình đăng xuất." };
    }
}

// Hàm xử lý đăng nhập bằng Google
async function googleLogin(tokenId) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let ticket;
        try {
            ticket = await googleOAuth2Client.verifyIdToken({
                idToken: tokenId,
                audience: process.env.googleClientId
            });
        } catch (error) {
            // Nếu xảy ra lỗi trong quá trình xác thực tokenId
            await transaction.rollback();
            return { success: false, message: "Token không hợp lệ", status: 401 };
        }
        const payload = ticket.getPayload();
        const googleId = payload['sub']; // ID của người dùng Google
        const email = payload['email'];
        // Kiểm tra xem tài khoản Google đã tồn tại trong CSDL chưa
        let request = new sql.Request(transaction);
        const result = await request
            .input('googleId', sql.VarChar, googleId)
            .query('SELECT * FROM users WHERE googleId = @googleId');

        if (result.recordset.length > 0) {
            // Tài khoản Google đã tồn tại, tiếp tục đăng nhập
            const user = result.recordset[0];
            await transaction.commit();
            return { success: true, userId: user.userId };
        }

        // Nếu tài khoản chưa tồn tại, kiểm tra email
        request = new sql.Request(transaction);
        const emailResult = await request
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM users WHERE email = @email');

        if (emailResult.recordset.length > 0) {
            // Email đã được sử dụng nhưng chưa liên kết với Google
            const user = emailResult.recordset[0];
            await request
                .input('userId', sql.Int, user.userId)
                .input('googleId', sql.VarChar, googleId)
                .query('UPDATE users SET googleId = @googleId WHERE userId = @userId');
            await transaction.commit();
            return { success: true, userId: user.userId };
        }

        // Tạo tài khoản mới với thông tin Google
        const userName = email.split('@')[0]; // Lấy phần trước dấu @ từ email làm userName
        request = new sql.Request(transaction);
        const resultCreateAccount = await request
            .input('email', sql.VarChar, email)
            .input('googleId', sql.VarChar, googleId)
            .input('userName', sql.NVarChar, userName) // Chèn userName vào cột userName
            .query('INSERT INTO users (email, googleId, isVerified, userName) VALUES (@email, @googleId, 1,@userName); SELECT SCOPE_IDENTITY() AS userId');

        const userId = resultCreateAccount.recordset[0].userId;
        await transaction.commit();
        return { success: true, userId: userId };

    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi đăng nhập bằng Google:', error);
        return { success: false, message: "Lỗi khi xác thực với Google." };
    }
}

//hàm xử lý yêu cầu quên mật khẩu
async function forgotPassword(email) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let request = new sql.Request(transaction);
        // Kiểm tra xem email có tồn tại không
        const user = await request
            .input('email', sql.VarChar, email)
            .query('SELECT userId, isVerified FROM users WHERE email = @email');

        if (!user.recordset.length) {
            return { success: false, message: "Email không tồn tại!" };
        }

        const userId = user.recordset[0].userId;

        // Tạo mã xác thực mới
        const resetCode = generateRandomCode();
        const expiresAt = new Date(Date.now() + 15 * 60000); // 15 phút
        const createdAt = new Date();

        // Lưu mã xác thực vào bảng forgotPasswordCodes
        await request
            .input('userId', sql.Int, userId)
            .input('code', sql.VarChar, resetCode)
            .input('expiresAt', sql.DateTime, expiresAt)
            .input('createdAt', sql.DateTime, createdAt)
            .query('INSERT INTO forgotPasswordCodes (userId, code, expiresAt, createdAt) VALUES (@userId, @code, @expiresAt, @createdAt)');

        // Gửi email xác thực
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.emailUser,
                pass: process.env.emailPassword
            }
        });

        const mailOptions = {
            from: process.env.emailUser,
            to: email,
            subject: 'Xác thực tài khoản VMess',
            text: `Chào bạn, mã xác thực tài khoản VMess của bạn là: ${resetCode}. Mã sẽ hết hạn sau 15 phút.`
        };

        let info;
        try {
            info = await transporter.sendMail(mailOptions);
            console.log('Email sent: ' + info.response);

            // Nếu gửi thành công, commit transaction
            await transaction.commit();
            return { success: true, message: "Vui lòng kiểm tra email để xác thực." };
        } catch (emailError) {
            // Nếu lỗi gửi email, rollback transaction
            console.error('Lỗi khi gửi email:', emailError);
            await transaction.rollback();

            if (emailError.responseCode === 550) {
                return { success: false, message: "Email không tồn tại hoặc hộp thư đầy." };
            }
            return { success: false, message: "Không thể gửi email xác thực. Vui lòng thử lại sau." };
        }
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi yêu cầu đặt lại mật khẩu:', error);
        return { success: false, message: "Đã xảy ra lỗi." };
    }
}

// Hàm xử lý Xác thực mã reset mật khẩu
async function verifyResetCode(email, code) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let request = new sql.Request(transaction);
        const resetCode = await request
            .input('email', sql.VarChar, email)
            .input('code', sql.VarChar, code)
            .input('currentTime', sql.DateTime, new Date())
            .query(`
                SELECT fpc.forgotPasswordCodeId, fpc.expiresAt, fpc.userId
                FROM forgotPasswordCodes fpc
                INNER JOIN users u ON fpc.userId = u.userId
                WHERE u.email = @email AND fpc.code = @code AND fpc.usedAt IS NULL AND fpc.expiresAt > @currentTime
            `);

        // Kiểm tra xem mã có tồn tại và hợp lệ không
        if (!resetCode.recordset.length) {
            await transaction.rollback();
            return { success: false, message: "Mã xác thực không hợp lệ hoặc đã hết hạn." };
        }

        // Tạo token tạm thời sau khi mã được xác thực thành công
        const userId = resetCode.recordset[0].userId; // Giả sử bạn có userId từ bảng users
        console.log('userId', userId);

        const tempToken = jwt.sign(
            { email, userId },  // Payload chứa email và userId
            process.env.temporaryTokenSecret,  // Sử dụng secret key để mã hóa token
            { expiresIn: '15m' }  // Token tạm thời có thời hạn 15 phút
        );

        // Cập nhật trạng thái mã xác thực đã được sử dụng
        request = new sql.Request(transaction);
        await request
            .input('forgotPasswordCodeId', sql.Int, resetCode.recordset[0].forgotPasswordCodeId)
            .input('currentTime', sql.DateTime, new Date())
            .query('UPDATE forgotPasswordCodes SET usedAt = @currentTime WHERE forgotPasswordCodeId = @forgotPasswordCodeId');

        // Commit transaction nếu tất cả các bước thành công
        await transaction.commit();
        return { success: true, tempToken };  // Trả token tạm thời về cho người dùng
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi xác thực mã code:', error);
        return { success: false, message: "Đã xảy ra lỗi." };
    }
}

//hàm đặt mật khẩu mới
async function resetPassword(email, newPassword) {
    const transaction = new sql.Transaction(pool);

    try {
        // Bắt đầu transaction
        await transaction.begin();

        let request = new sql.Request(transaction);

        // 1. Cập nhật mật khẩu mới
        await request
            .input('email', sql.VarChar, email)
            .input('passwordHash', sql.VarChar, await hashPassword(newPassword))
            .input('updatedAt', sql.DateTime, new Date()) // Cập nhật thời gian thay đổi
            .query('UPDATE users SET passwordHash = @passwordHash, updatedAt = @updatedAt WHERE email = @email');

        // 2. Xóa tất cả refresh tokens của user sau khi đổi mật khẩu
        request = new sql.Request(transaction);
        await request
            .input('email', sql.VarChar, email)
            .query('DELETE FROM refreshTokens WHERE userId = (SELECT userId FROM users WHERE email = @email)');

        // Commit transaction sau khi tất cả các truy vấn thành công
        await transaction.commit();
        return { success: true, message: "Mật khẩu đã được cập nhật và các phiên đăng nhập trước đã bị đăng xuất." };

    } catch (error) {
        // Rollback nếu có lỗi
        await transaction.rollback();
        console.error('Lỗi khi đổi mật khẩu:', error);
        return { success: false, message: "Đã xảy ra lỗi khi đổi mật khẩu." };
    }
}

module.exports = {
    register,
    verifyCode,
    login,
    saveRefreshToken,
    verifyAccessToken,
    refreshAccessToken,
    logout,
    googleLogin,
    forgotPassword,
    verifyResetCode,
    resetPassword
};