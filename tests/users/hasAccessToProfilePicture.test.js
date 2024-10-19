//hasAccessToProfilePicture.test.js
const db = require('../../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
const app = require('../../app');
const { exec } = require('child_process');

beforeAll(async () => {
  await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
  await exec('node ctrf/exportResults.js'); // Xuất kết quả sau khi chạy test
});

// Giả lập token cho người dùng
const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4OTgwNzEyLCJleHAiOjE3Mjk1ODU1MTJ9.CBl_5Mg69XdGxLCpthKz46swpTppttTUwuByb_zE5j0'; // Thay thế bằng token hợp lệ
const filename = 'profile_102_1729157115355_resized.png'; // Tên file ảnh hợp lệ

describe('Test API kiểm tra quyền truy cập ảnh hồ sơ', () => {
  test('Người dùng có quyền truy cập ảnh hồ sơ', async () => {
    
    const res = await supertest(app)
      .get(`/uploads/profilePictures/${filename}`)
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 200 (OK)
    expect(res.status).toBe(200);
    expect(res.type).toContain('image/png'); // Giả sử ảnh là định dạng PNG
  });

  test('Người dùng không có quyền truy cập ảnh hồ sơ', async () => {
    const filename2 = 'profile_19_1729157793350_resized.png'; // Tên file ảnh không thuộc về người dùng
    const res = await supertest(app)
      .get(`/uploads/profilePictures/${filename2}`)
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Bạn không có quyền truy cập ảnh này!');
  });

  test('Ảnh hồ sơ không tồn tại', async () => {
    const filename2 = 'profile_102_1729157115355_resized.png'; // Tên file ảnh không tồn tại
    const res = await supertest(app)
      .get(`/uploads/profilePictures/${filename2}`)
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 404 (Not Found)
    expect(res.status).toBe(404);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Ảnh không tồn tại!');
  });

  test('Không có token (Unauthorized)', async () => {
    const res = await supertest(app)
      .get(`/uploads/profilePictures/${filename}`);

    // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
    expect(res.status).toBe(401);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không tồn tại.');
  });

  test('Token không hợp lệ', async () => {
    const res = await supertest(app)
      .get(`/uploads/profilePictures/${filename}`)
      .set('Authorization', 'Bearer invalid_token'); // Sử dụng token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
  });

  test('Lỗi hệ thống khi kiểm tra quyền truy cập ảnh', async () => {
    await pool.close(); // Giả lập lỗi hệ thống bằng cách đóng kết nối database
    const res = await supertest(app)
      .get(`/uploads/profilePictures/${filename}`)
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đã xảy ra lỗi khi truy xuất ảnh.');

    // Mở lại kết nối sau khi test
    await pool.connect();
  });
});
