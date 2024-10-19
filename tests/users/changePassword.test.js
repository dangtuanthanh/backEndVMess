//changePassword.test.js
const db = require('../../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../../app');
const { exec } = require('child_process');

// Thiết lập trước và sau khi kiểm thử
beforeAll(async () => {
  await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
  await exec('node ctrf/exportResults.js'); // Xuất kết quả sau khi chạy test
});

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI5MzAwNTUxLCJleHAiOjE3Mjk5MDUzNTF9.ttJjW0eRrqSoDSO4UNL1jbDXDA8lgYHrutnUUbEbjrQ'; // Thay bằng token hợp lệ
const invalidToken = 'Bearer invalid_token';
const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI5MzAwNTUxLCJleHAiOjE3Mjk5MDUzNTF9.ttJjW0eRrqSoDSO4UNL1jbDXDA8lgYHrutnUUbEbjrQ'

describe('Test API đổi mật khẩu', () => {
  
  test('Đổi mật khẩu thành công', async () => {
    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', token)
      .send({
        oldPassword: '0000',
        newPassword: '1234'
      })
      .set('Cookie', [`refreshToken=${refreshToken}`]); // Gửi refresh token qua cookie

    // Kiểm tra mã trạng thái phản hồi là 200 (OK)
    expect(res.status).toBe(200);
    
    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Mật khẩu đã được đổi thành công.');
  });

  test('Thất bại vì không có dữ liệu gửi lên', async () => {
    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', token)
      .send({})
      .set('Cookie', [`refreshToken=${refreshToken}`]); // Có refresh token nhưng thiếu dữ liệu

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);
    
    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });

  test('Thất bại vì mật khẩu cũ không chính xác', async () => {
    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', token)
      .send({
        oldPassword: 'wrongOldPassword',
        newPassword: 'newPassword123'
      })
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Mật khẩu cũ không chính xác!');
  });

  test('Thất bại vì mật khẩu mới trùng với mật khẩu cũ', async () => {
    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', token)
      .send({
        oldPassword: '1234',
        newPassword: '1234'
      })
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Mật khẩu mới không được trùng với mật khẩu cũ!');
  });

  test('Thất bại vì không có refresh token', async () => {
    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', token)
      .send({
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      });

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });

  test('Thất bại vì token không hợp lệ', async () => {
    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', invalidToken)
      .send({
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      })
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
  });

  test('Lỗi hệ thống khi đổi mật khẩu', async () => {
    // Giả lập lỗi bằng cách đóng kết nối database
    await pool.close();

    const res = await supertest(app)
      .post('/changePassword')
      .set('Authorization', token)
      .send({
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      })
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đổi mật khẩu thất bại.');

    // Mở lại kết nối sau khi test
    await pool.connect();
  });
});
