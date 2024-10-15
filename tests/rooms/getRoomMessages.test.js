//getRoomMessages.test.js
const db = require('../../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../../app');
const { exec } = require('child_process');

beforeAll(async () => {
    await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
    await exec('node ctrf/exportResults.js');
});

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4MzczNjQwLCJleHAiOjE3Mjg5Nzg0NDB9.ZXmDF6Vk45nMNT04IztzhzJJOtHyDllplvhTmfIiWnk'; // Thay bằng token hợp lệ

describe('Test API lấy danh sách tin nhắn của phòng', () => {

  test('Lấy tin nhắn thành công với phân trang', async () => {
    const roomId = 7; // Ví dụ với roomId là 1
    const res = await supertest(app)
      .get(`/${roomId}/messages?page=1&limit=10`)
      .set('Authorization', token); // Gửi token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 200
    expect(res.status).toBe(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toBeInstanceOf(Array); // messages phải là mảng
    expect(res.body.currentPage).toBe(1); // Đúng trang hiện tại
    expect(res.body.pageSize).toBe(10); // Số lượng bản ghi mỗi trang
    expect(res.body.totalRecords).toBeGreaterThan(0); // Phải có tin nhắn
    expect(res.body.messages[0]).toHaveProperty('messageId');
    expect(res.body.messages[0]).toHaveProperty('messageContent');
    expect(res.body.messages[0]).toHaveProperty('userName');
    expect(res.body.messages[0]).toHaveProperty('createdAt'); // Kiểm tra các thuộc tính tin nhắn
  });

  test('Không tìm thấy tin nhắn trong phòng', async () => {
    const roomId = 6; // Ví dụ với roomId không tồn tại
    const res = await supertest(app)
      .get(`/${roomId}/messages?page=1&limit=10`)
      .set('Authorization', token); // Gửi token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 404
    expect(res.status).toBe(404);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Không có tin nhắn trong phòng này.');
  });

  test('Không phải thành viên của phòng', async () => {
    const roomId = 8; // Ví dụ với roomId mà user không phải thành viên
    const res = await supertest(app)
      .get(`/${roomId}/messages?page=1&limit=10`)
      .set('Authorization', token); // Gửi token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Bạn không phải là thành viên của phòng này!');
  });

  test('Thiếu token xác thực', async () => {
    const roomId = 7; // Ví dụ với roomId hợp lệ
    const res = await supertest(app)
      .get(`/${roomId}/messages?page=1&limit=10`);

    // Kiểm tra mã trạng thái phản hồi là 401
    expect(res.status).toBe(401);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không tồn tại.");
  });

  test('Token không hợp lệ', async () => {
    const roomId = 7; // Ví dụ với roomId hợp lệ
    const res = await supertest(app)
      .get(`/${roomId}/messages?page=1&limit=10`)
      .set('Authorization', 'Bearer invalid_token'); // Gửi token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn.");
  });

  test('Lỗi hệ thống trong quá trình lấy tin nhắn', async () => {
    await pool.close(); // Giả lập lỗi bằng cách ngắt kết nối DB
    const roomId = 7; // Ví dụ với roomId hợp lệ

    const res = await supertest(app)
      .get(`/${roomId}/messages?page=1&limit=10`)
      .set('Authorization', token); // Gửi token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 500
    expect(res.status).toBe(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Đã xảy ra lỗi khi lấy tin nhắn.");
    await pool.connect(); // Kết nối lại DB sau khi test xong
  });

});
