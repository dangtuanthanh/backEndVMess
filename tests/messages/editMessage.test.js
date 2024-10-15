//editMessage.test.js
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

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4MzczNjQwLCJleHAiOjE3Mjg5Nzg0NDB9.ZXmDF6Vk45nMNT04IztzhzJJOtHyDllplvhTmfIiWnk'; // Thay valid_token bằng token hợp lệ
const roomId = "3d9c03a4-03e7-4b76-a1bb-27cfd667b531"; // Thay roomId bằng ID của phòng chat hợp lệ
const messageId = 4; // Thay messageId bằng ID của tin nhắn hợp lệ

describe('Test API sửa tin nhắn trong phòng chat', () => {
  test('Sửa tin nhắn thành công', async () => {
    const res = await supertest(app)
      .put(`/editMessage/${messageId}`)
      .send({ newMessageContent: 'Tin nhắn đã được sửa', roomId })
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 200 (OK)
    expect(res.status).toBe(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Tin nhắn đã được sửa thành công.');
    expect(res.body.updatedMessage).toBeDefined();
    expect(res.body.updatedMessage.messageId).toBe(messageId);
  });

  test('Sửa tin nhắn thất bại vì thiếu roomId', async () => {
    const res = await supertest(app)
      .put(`/editMessage/${messageId}`)
      .send({ newMessageContent: 'Tin nhắn đã được sửa' }) // Không có roomId
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Nội dung tin nhắn không hợp lệ!');
  });

  test('Sửa tin nhắn thất bại vì nội dung tin nhắn rỗng', async () => {
    const res = await supertest(app)
      .put(`/editMessage/${messageId}`)
      .send({ newMessageContent: '', roomId })
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Nội dung tin nhắn không hợp lệ!');
  });

  test('Sửa tin nhắn thất bại vì tin nhắn không tồn tại', async () => {
    const res = await supertest(app)
      .put('/editMessage/99999') // Tin nhắn không tồn tại
      .send({ newMessageContent: 'Nội dung mới', roomId })
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 404 (Not Found)
    expect(res.status).toBe(404);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Tin nhắn không tồn tại hoặc bạn không phải là người gửi.');
  });

  test('Sửa tin nhắn thất bại vì không có token (Unauthorized)', async () => {
    const res = await supertest(app)
      .put(`/editMessage/${messageId}`)
      .send({ newMessageContent: 'Nội dung mới', roomId });

    // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
    expect(res.status).toBe(401);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không tồn tại.');
  });

  test('Token không hợp lệ', async () => {
    const res = await supertest(app)
      .put(`/editMessage/${messageId}`)
      .send({ newMessageContent: 'Nội dung mới', roomId })
      .set('Authorization', 'Bearer invalid_token'); // Sử dụng token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token không hợp lệ hoặc đã hết hạn.');
  });

  test('Lỗi hệ thống khi sửa tin nhắn', async () => {
    await pool.close(); // Giả lập lỗi hệ thống bằng cách đóng kết nối database

    const res = await supertest(app)
      .put(`/editMessage/${messageId}`)
      .send({ newMessageContent: 'Nội dung mới', roomId })
      .set('Authorization', token);

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đã xảy ra lỗi trong quá trình sửa tin nhắn.');

    // Mở lại kết nối sau khi test
    await pool.connect();
  });
});
