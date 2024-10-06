//verifyResetCode.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../app');
const { exec } = require('child_process');

beforeAll(async () => {
  await pool.connect(); // Kết nối tới SQL Server trước khi test
});

afterAll(async () => {
  await exec('node ctrf/exportResults.js'); // Xuất kết quả kiểm thử ra file
});

describe('Test chức năng xác thực mã quên mật khẩu', () => {
  test('Xác thực mã hợp lệ', async () => {
    const data = { email: 'dangtuanthanh265@gmail.com', code: '159164' }; // Mã hợp lệ

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 200
    expect(res.status).toEqual(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: true,
      message: "Mã xác thực hợp lệ. Bạn có thể đổi mật khẩu.",
      tempToken: expect.any(String) // Kiểm tra token tạm thời trả về
    });
  });

  test('Xác thực mã không hợp lệ', async () => {
    const data = { email: 'dangtuanthanh265@gmail.com', code: 'invalidCode123' }; // Mã không hợp lệ

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Mã xác thực không hợp lệ hoặc đã hết hạn."
    });
  });

  test('Xác thực mã với email không tồn tại', async () => {
    const data = { email: 'nonexistent@gmail.com', code: 'validCode123' }; // Email không tồn tại

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Mã xác thực không hợp lệ hoặc đã hết hạn."
    });
  });

  test('Xác thực mã với email không hợp lệ', async () => {
    const data = { email: 'invalidEmail', code: 'validCode123' }; // Email không hợp lệ

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Email không hợp lệ!"
    });
  });

  test('Xác thực mã mà không gửi code', async () => {
    const data = { email: 'test@gmail.com' }; // Không gửi mã xác thực

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Dữ liệu không chính xác!"
    });
  });

  test('Xác thực mã mà không gửi email', async () => {
    const data = { code: 'validCode123' }; // Không gửi email

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Dữ liệu không chính xác!"
    });
  });

  test('Lỗi khi server không thể xác thực mã', async () => {
    await pool.close();
    const data = { email: 'servererror@gmail.com', code: 'validCode123' }; // Trường hợp giả định lỗi server

    // Gửi yêu cầu POST tới endpoint verifyResetCode
    const res = await supertest(app)
      .post('/verifyResetCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 500 (lỗi server)
    expect(res.status).toEqual(500);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Đã xảy ra lỗi khi xác thực mã."
    });
    // Kết nối lại cơ sở dữ liệu sau khi test xong
    await pool.connect();
  });
});
