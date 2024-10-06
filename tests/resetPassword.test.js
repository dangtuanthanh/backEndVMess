// resetPassword.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
const app = require('../app');
const { exec } = require('child_process');

beforeAll(async () => {
  await pool.connect(); // Kết nối tới SQL Server trước khi test
});

afterAll(async () => {
  await exec('node ctrf/exportResults.js'); // Xuất kết quả kiểm thử ra file
});

describe('Test chức năng đổi mật khẩu sau quên mật khẩu', () => {

  test('Đổi mật khẩu thành công với tempToken hợp lệ', async () => {
    const data = {
      tempToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRhbmd0dWFudGhhbmgyNjVAZ21haWwuY29tIiwidXNlcklkIjoxMDIsImlhdCI6MTcyODE4NzUzMCwiZXhwIjoxNzI4MTg4NDMwfQ.giBvR6pfLGFK-xAyPJOTd5MN5N_4ztOz4XaAtIwReTo',
      newPassword: '0000'
    }; // Token và mật khẩu hợp lệ

    const res = await supertest(app)
      .post('/resetPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 200
    expect(res.status).toEqual(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: true,
      message: "Mật khẩu đã được cập nhật và các phiên đăng nhập trước đã bị đăng xuất."
    });
  });

  test('Đổi mật khẩu thất bại với tempToken không hợp lệ', async () => {
    const data = {
      tempToken: 'invalidTempToken123',
      newPassword: 'NewPassword!23'
    }; // Token không hợp lệ

    const res = await supertest(app)
      .post('/resetPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn!"
    });
  });

  test('Đổi mật khẩu thất bại khi không gửi tempToken', async () => {
    const data = {
      newPassword: 'NewPassword!23'
    }; // Không gửi tempToken

    const res = await supertest(app)
      .post('/resetPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Dữ liệu không chính xác!"
    });
  });

  test('Đổi mật khẩu thất bại khi không gửi newPassword', async () => {
    const data = {
      tempToken: 'validTempToken123'
    }; // Không gửi newPassword

    const res = await supertest(app)
      .post('/resetPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: "Dữ liệu không chính xác!"
    });
  });

//   test('Lỗi khi server không thể đổi mật khẩu', async () => {
//     await pool.close(); // Giả lập lỗi server

//     const data = {
//       tempToken: 'validTempToken123',
//       newPassword: 'NewPassword!23'
//     };

//     const res = await supertest(app)
//       .post('/resetPassword')
//       .set('Content-type', 'application/json')
//       .send(data);

//     // Kiểm tra mã trạng thái phản hồi là 500 (lỗi server)
//     expect(res.status).toEqual(500);

//     // Kiểm tra phản hồi có Content-Type là JSON
//     expect(res.type).toEqual(expect.stringContaining('json'));

//     // Kiểm tra nội dung phản hồi
//     expect(res.body).toEqual({
//       success: false,
//       message: "Đã xảy ra lỗi khi đổi mật khẩu."
//     });

//     // Kết nối lại cơ sở dữ liệu sau khi test xong
//     await pool.connect();
//   });
});
