//updateUserName.test.js
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

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4OTgwNzEyLCJleHAiOjE3Mjk1ODU1MTJ9.CBl_5Mg69XdGxLCpthKz46swpTppttTUwuByb_zE5j0'; // Thay valid_token_here bằng token hợp lệ
const invalidToken = 'Bearer invalid_token';

describe('Test API cập nhật tên người dùng', () => {

  test('Cập nhật tên người dùng thành công', async () => {
    const res = await supertest(app)
      .put('/updateUserName')
      .set('Authorization', token)
      .send({ userName: 'newUserName' });

    // Kiểm tra mã trạng thái phản hồi là 200 (OK)
    expect(res.status).toBe(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Tên người dùng đã được cập nhật thành công.');
  });

  test('Thất bại khi tên người dùng đã tồn tại', async () => {
    const res = await supertest(app)
      .put('/updateUserName')
      .set('Authorization', token)
      .send({ userName: 'test' });

    // Kiểm tra mã trạng thái phản hồi là 409 (Conflict)
    expect(res.status).toBe(409);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Tên người dùng đã tồn tại.');
  });

  test('Thất bại khi tên người dùng không hợp lệ', async () => {
    const res = await supertest(app)
      .put('/updateUserName')
      .set('Authorization', token)
      .send({ userName: '' });  // Tên người dùng trống

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Tên người dùng không hợp lệ!');
  });

  test('Thất bại khi không có token', async () => {
    const res = await supertest(app)
      .put('/updateUserName')
      .send({ userName: 'newUserName' });

    // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
    expect(res.status).toBe(401);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không tồn tại.');
  });

  test('Thất bại khi token không hợp lệ', async () => {
    const res = await supertest(app)
      .put('/updateUserName')
      .set('Authorization', invalidToken)
      .send({ userName: 'newUserName' });

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
  });

  test('Lỗi hệ thống khi cập nhật tên người dùng', async () => {
    // Giả lập lỗi bằng cách đóng kết nối database
    await pool.close();

    const res = await supertest(app)
      .put('/updateUserName')
      .set('Authorization', token)
      .send({ userName: 'newUserName' });

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đã xảy ra lỗi trong quá trình cập nhật tên người dùng.');

    // Mở lại kết nối sau khi test
    await pool.connect();
  });
});
