//getUserRooms.test.js
const db = require('../../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../../app');
const { exec } = require('child_process');

beforeAll(async () => {
  await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
  await exec('node ctrf/exportResults.js'); // Xuất kết quả sau khi chạy test
});

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4MzczNjQwLCJleHAiOjE3Mjg5Nzg0NDB9.ZXmDF6Vk45nMNT04IztzhzJJOtHyDllplvhTmfIiWnk'; // Thay token bằng token hợp lệ

describe('Test API lấy danh sách phòng chat của người dùng', () => {
  test('Lấy danh sách phòng chat thành công', async () => {
    const res = await supertest(app)
      .get('/getUserRooms')
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 200 (OK)
    expect(res.status).toBe(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.rooms)).toBe(true);
    expect(res.body.totalRooms).toBeGreaterThanOrEqual(0);
  });

  test('Không có phòng chat nào cho người dùng', async () => {
    const res = await supertest(app)
      .get('/getUserRooms')
      .set('Authorization', "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMywiaWF0IjoxNzI4OTU3ODI3LCJleHAiOjE3Mjk1NjI2Mjd9.EglnNQ5eu9ejB893KEusLW5RxCqs9lLGIrqYpZaeWnE");

    // Giả sử không có phòng chat nào
    expect(res.status).toBe(404);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Không có phòng chat nào.');
  });

  test('Không có token (Unauthorized)', async () => {
    const res = await supertest(app)
      .get('/getUserRooms');

    // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
    expect(res.status).toBe(401);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không tồn tại.');
  });

  test('Token không hợp lệ', async () => {
    const res = await supertest(app)
      .get('/getUserRooms')
      .set('Authorization', 'Bearer invalid_token'); // Sử dụng token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
  });

  test('Lỗi hệ thống khi lấy danh sách phòng chat', async () => {
    await pool.close(); // Giả lập lỗi hệ thống bằng cách đóng kết nối database

    const res = await supertest(app)
      .get('/getUserRooms')
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);
    expect(res.type).toContain('json');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đã xảy ra lỗi trong quá trình lấy danh sách phòng.');

    // Mở lại kết nối sau khi test
    await pool.connect();
  });
});
