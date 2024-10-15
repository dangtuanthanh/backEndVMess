//searchUser.test.js
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
const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMiwiaWF0IjoxNzI4MzU3Mzc5LCJleHAiOjE3MjgzNTgyNzl9.i-AQigQrerWtHdR1ZbULCEfpef7oVMYz2CFtE6vBRQQ'
describe('Test API tìm kiếm người dùng', () => {

  test('Tìm kiếm thành công với kết quả có phân trang', async () => {
    const search = 'cu'; // Giá trị tìm kiếm ví dụ
    const res = await supertest(app)
      .get(`/searchUser?search=${search}&page=1&limit=5`)
      .set('Authorization', token) // Thay <valid_token> bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 200
    expect(res.status).toBe(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(true);
    expect(res.body.users).toBeInstanceOf(Array); // users phải là mảng
    expect(res.body.currentPage).toBe(1); // Đúng trang hiện tại
    expect(res.body.pageSize).toBe(5); // Số lượng bản ghi mỗi trang
    expect(res.body.totalRecords).toBeGreaterThan(0); // Phải có kết quả tìm kiếm
  });

  test('Tìm kiếm không tìm thấy người dùng', async () => {
    const search = 'notfound'; // Giá trị tìm kiếm không có trong DB
    const res = await supertest(app)
      .get(`/searchUser?search=${search}&page=1&limit=5`)
      .set('Authorization', token); // Thay <valid_token> bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 404
    expect(res.status).toBe(404);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Không tìm thấy người dùng.');
  });

  test('Yêu cầu tìm kiếm không hợp lệ (thiếu từ khóa tìm kiếm)', async () => {
    const res = await supertest(app)
      .get('/searchUser?page=1&limit=5')
      .set('Authorization', token); // Thay <valid_token> bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 400
    expect(res.status).toBe(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Yêu cầu tìm kiếm không hợp lệ!");
  });

  test('Không có token gửi lên (Unauthorized)', async () => {
    const search = 'test'; // Giá trị tìm kiếm ví dụ
    const res = await supertest(app)
      .get(`/searchUser?search=${search}&page=1&limit=5`);

    // Kiểm tra mã trạng thái phản hồi là 401
    expect(res.status).toBe(401);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không tồn tại.");
  });

  test('Token không hợp lệ', async () => {
    const search = 'test'; // Giá trị tìm kiếm ví dụ
    const res = await supertest(app)
      .get(`/searchUser?search=${search}&page=1&limit=5`)
      .set('Authorization', 'Bearer invalid_token'); // Sử dụng token không hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 403
    expect(res.status).toBe(403);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn.");
  });

  test('Lỗi hệ thống trong quá trình tìm kiếm', async () => {
    await pool.close();
    const search = 'test'; // Giá trị tìm kiếm ví dụ
    // Giả lập lỗi bằng cách ngắt kết nối tới database hoặc lỗi tương tự

    const res = await supertest(app)
      .get(`/searchUser?search=${search}&page=1&limit=5`)
      .set('Authorization', 'Bearer <valid_token>'); // Thay <valid_token> bằng token hợp lệ

    // Kiểm tra mã trạng thái phản hồi là 500
    expect(res.status).toBe(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toContain('json');

    // Kiểm tra nội dung phản hồi
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Đã xảy ra lỗi trong quá trình tìm kiếm.");
    // Kết nối lại cơ sở dữ liệu sau khi test xong
    await pool.connect();
  });
});
