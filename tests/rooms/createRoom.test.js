//createRoom.test.js
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

const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4MzczNjQwLCJleHAiOjE3Mjg5Nzg0NDB9.ZXmDF6Vk45nMNT04IztzhzJJOtHyDllplvhTmfIiWnk'

const targetUserId = 102

describe('Test API tạo phòng chat', () => {
  test('Tạo phòng chat thành công giữa hai người dùng', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 19 }) // Thay targetUserId bằng ID của người dùng hợp lệ
      .set('Authorization', token); // Thay valid_token bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 201 (Created)
    expect(res.status).toBe(201);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.roomId).toBeDefined(); // Phải trả về roomId
    expect(res.body.message).toBe("Phòng chat đã được tạo thành công.");
  });

  test('Tạo phòng chat thất bại vì targetUserId không tồn tại', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 12310 }) // targetUserId không tồn tại
      .set('Authorization', token); // Thay valid_token bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 404 (Not Found)
    expect(res.status).toBe(404);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Người dùng được chỉ định không tồn tại.");
  });

  test('Tạo phòng chat thất bại khi tạo với chính bản thân', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 102 }) // Giả sử 19 là userId của người dùng hiện tại
      .set('Authorization', token); // Thay valid_token bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Không thể tạo phòng với chính bản thân!");
  });

  test('Tạo phòng chat thất bại khi phòng đã tồn tại', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 96 }) // Thay targetUserId bằng ID của người đã có phòng chat
      .set('Authorization', token); // Thay valid_token bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Phòng chat giữa hai người dùng đã tồn tại.");
  });

  test('Tạo phòng chat thất bại khi thiếu targetUserId', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({}) // Không có targetUserId
      .set('Authorization', token); // Thay valid_token bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Yêu cầu tạo phòng không hợp lệ!");
  });

  test('Không có token gửi lên (Unauthorized)', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 102 }); // Gửi request mà không có token

    // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
    expect(res.status).toBe(401);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không tồn tại.");
  });

  test('Token không hợp lệ', async () => {
    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 102 }) // Thay targetUserId bằng ID của người dùng hợp lệ
      .set('Authorization', 'Bearer invalid_token'); // Sử dụng token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403 (Forbidden)
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn.");
  });

  test('Lỗi hệ thống trong quá trình tạo phòng chat', async () => {
    await pool.close(); // Giả lập lỗi hệ thống bằng cách đóng kết nối database

    const res = await supertest(app)
      .post('/createRoom')
      .send({ targetUserId: 102 }) // Thay targetUserId bằng ID hợp lệ
      .set('Authorization', token); // Thay valid_token bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 500 (Internal Server Error)
    expect(res.status).toBe(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Đã xảy ra lỗi trong quá trình tạo phòng.");
    
    // Mở lại kết nối sau khi test
    await pool.connect();
  });

});
