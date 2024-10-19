//updateProfilePicture.test.js
const db = require('../../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../../app');
const path = require('path');
const { exec } = require('child_process');

// Thiết lập trước và sau khi kiểm thử
beforeAll(async () => {
  await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
  await exec('node ctrf/exportResults.js'); // Xuất kết quả sau khi chạy test
});

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4OTgwNzEyLCJleHAiOjE3Mjk1ODU1MTJ9.CBl_5Mg69XdGxLCpthKz46swpTppttTUwuByb_zE5j0'; // Thay valid_token bằng token hợp lệ
const invalidToken = 'Bearer invalid_token';
const pathImage = "../../testFiles/sampleImageAvatar.png"
describe('Test API cập nhật ảnh hồ sơ', () => {
  test('Cập nhật ảnh hồ sơ thành công', async () => {
    const res = await supertest(app)
      .post('/updateProfilePicture')
      .set('Authorization', token)
      .attach('profilePicture', path.resolve(__dirname, pathImage)); // Đính kèm file ảnh hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 200 (OK)
    expect(res.status).toBe(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Ảnh hồ sơ đã được cập nhật thành công!');
  });

  test('Cập nhật ảnh hồ sơ thất bại vì không có file ảnh', async () => {
    const res = await supertest(app)
      .post('/updateProfilePicture')
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Vui lòng chọn một ảnh để tải lên!');
  });

  test('Cập nhật ảnh hồ sơ thất bại vì định dạng file không hợp lệ', async () => {
    const res = await supertest(app)
      .post('/updateProfilePicture')
      .set('Authorization', token)
      .attach('profilePicture', path.resolve(__dirname, '../../testFiles/sample.txt')); // Đính kèm file định dạng không hợp lệ
    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Định dạng file không hợp lệ! Chỉ chấp nhận JPEG, PNG và JPG.');
  });

  test('Cập nhật ảnh hồ sơ thất bại vì kích thước file vượt quá giới hạn', async () => {
    const res = await supertest(app)
      .post('/updateProfilePicture')
      .set('Authorization', token)
      .attach('profilePicture', path.resolve(__dirname, '../../testFiles/Snake_River_(5mb).jpg')); // Đính kèm file ảnh lớn hơn 5MB

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Kích thước file quá lớn. Giới hạn tối đa là 5MB.');
  });

  test('Cập nhật ảnh hồ sơ thất bại vì không có token', async () => {
    const res = await supertest(app)
      .post('/updateProfilePicture')
      .attach('profilePicture', path.resolve(__dirname, pathImage)); // Đính kèm file ảnh hợp lệ nhưng không có token

    // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
    expect(res.status).toBe(401);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không tồn tại.');
  });

  test('Cập nhật ảnh hồ sơ thất bại vì token không hợp lệ', async () => {
    const res = await supertest(app)
      .post('/updateProfilePicture')
      .set('Authorization', invalidToken)
      .attach('profilePicture', path.resolve(__dirname, pathImage)); // Đính kèm file ảnh hợp lệ với token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
  });

  test('Lỗi hệ thống khi cập nhật ảnh hồ sơ', async () => {
    // Giả lập lỗi bằng cách đóng kết nối database
    await pool.close();

    const res = await supertest(app)
      .post('/updateProfilePicture')
      .set('Authorization', token)
      .attach('profilePicture', path.resolve(__dirname, pathImage)); // Đính kèm file ảnh hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đã xảy ra lỗi khi cập nhật ảnh hồ sơ.');

    // Mở lại kết nối sau khi test
    await pool.connect();
  });
});
