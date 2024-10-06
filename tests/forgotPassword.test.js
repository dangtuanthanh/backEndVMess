//forgotPassword.test.js
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

describe('Test chức năng quên mật khẩu', () => {
  test('Yêu cầu quên mật khẩu với email hợp lệ', async () => {
    const data = { email: 'dangtuanthanh265@gmail.com' }; // Email hợp lệ

    // Gửi yêu cầu POST tới endpoint quên mật khẩu
    const res = await supertest(app)
      .post('/forgotPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 200
    expect(res.status).toEqual(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: true,
      message: "Mã xác thực đã được gửi đến email của bạn."
    });
  });

  test('Yêu cầu quên mật khẩu với email không tồn tại', async () => {
    const data = { email: 'nonexistent@gmail.com' }; // Email không tồn tại

    // Gửi yêu cầu POST tới endpoint quên mật khẩu
    const res = await supertest(app)
      .post('/forgotPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Email không tồn tại!'
    });
  });

  test('Yêu cầu quên mật khẩu với email không hợp lệ', async () => {
    const data = { email: 'invalidemail' }; // Email không hợp lệ

    // Gửi yêu cầu POST tới endpoint quên mật khẩu
    const res = await supertest(app)
      .post('/forgotPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Email không hợp lệ!'
    });
  });

  test('Yêu cầu quên mật khẩu mà không gửi email', async () => {
    const data = {}; // Không gửi email trong body

    // Gửi yêu cầu POST tới endpoint quên mật khẩu
    const res = await supertest(app)
      .post('/forgotPassword')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Email không được để trống!'
    });
  });

//   test('Lỗi hệ thống trong quá trình', async () => {
//     await pool.close();
//     const data = { email: 'servererror@gmail.com' }; // Trường hợp giả định xảy ra lỗi khi gửi email

//     // Gửi yêu cầu POST tới endpoint đăng xuất
//     const res = await supertest(app)
//         .post('/forgotPassword') // Đường dẫn của endpoint đăng xuất
//         .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
//         .send(data);

//     // Kiểm tra mã trạng thái phản hồi là 500 (lỗi hệ thống)
//     expect(res.status).toEqual(500);

//     // Kiểm tra phản hồi có Content-Type là JSON
//     expect(res.type).toEqual(expect.stringContaining('json'));

//     // Kiểm tra nội dung phản hồi
//     expect(res.body).toEqual({
//         success: false,
//         message: "Đã xảy ra lỗi khi yêu cầu đặt lại mật khẩu."
//     });
//     // Kết nối lại cơ sở dữ liệu sau khi test xong
//     await pool.connect();
// });
});
