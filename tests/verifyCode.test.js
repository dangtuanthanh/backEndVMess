// verifyCode.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const { exec } = require('child_process'); 
beforeAll(async () => {
  await pool.connect(); // Kết nối đến SQL Server trước khi test
});
afterAll(async () => {
  await exec('node ctrf/exportResults.js');
});
// afterAll(async () => {
//   await pool.close(); // Đóng kết nối SQL Server sau khi tất cả các test chạy xong
// });

const supertest = require('supertest');
const app = require('../app'); // Đường dẫn đến file app.js của bạn

describe('Test chức năng xác thực mã code', () => {
  test('Xác thực mã code hợp lệ', async () => {
    const data = {
      email: 'test@gmail.com',
      code: '123456'
    };

    // Gửi yêu cầu POST tới endpoint xác thực mã code
    const res = await supertest(app)
      .post('/verifyCode') // Đường dẫn của endpoint xác thực mã code
      .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
      .send(data); // Gửi dữ liệu xác thực (email và code)

    // Kiểm tra mã trạng thái phản hồi là 200 (Thành công)
    expect(res.status).toEqual(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: true,
      message: 'Mã code đã được xác thực thành công'
    });
  });

  test('Xác thực mã code không hợp lệ', async () => {
    const data = {
      email: 'test@gmail.com',
      code: 'wrongcode'
    };

    // Gửi yêu cầu POST tới endpoint xác thực mã code
    const res = await supertest(app)
      .post('/verifyCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Mã code không hợp lệ hoặc đã hết hạn'
    });
  });

  test('Xác thực với email không tồn tại', async () => {
    const data = {
      email: 'nonexistent@gmail.com',
      code: '123456'
    };

    // Gửi yêu cầu POST tới endpoint xác thực mã code
    const res = await supertest(app)
      .post('/verifyCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Email không tồn tại trong hệ thống!'
    });
  });

  test('Xác thực mã code với dữ liệu thiếu trường email', async () => {
    const data = {
      code: '123456'
    };

    // Gửi yêu cầu POST tới endpoint xác thực mã code
    const res = await supertest(app)
      .post('/verifyCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Dữ liệu gửi lên không chính xác!'
    });
  });

  test('Xác thực mã code với dữ liệu thiếu trường code', async () => {
    const data = {
      email: 'test@gmail.com'
    };

    // Gửi yêu cầu POST tới endpoint xác thực mã code
    const res = await supertest(app)
      .post('/verifyCode')
      .set('Content-type', 'application/json')
      .send(data);

    // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Dữ liệu gửi lên không chính xác!'
    });
  });

  // test('Xác thực mã code khi cơ sở dữ liệu gặp lỗi', async () => {
  //   await pool.close();

  //   const data = {
  //     email: 'error@gmail.com',
  //     code: '123456'
  //   };

  //   // Gửi yêu cầu POST tới endpoint xác thực mã code
  //   const res = await supertest(app)
  //     .post('/verifyCode')
  //     .set('Content-type', 'application/json')
  //     .send(data);

  //   // Kiểm tra mã trạng thái phản hồi là 500 (Lỗi hệ thống)
  //   expect(res.status).toEqual(500);

  //   // Kiểm tra phản hồi có Content-Type là JSON
  //   expect(res.type).toEqual(expect.stringContaining('json'));

  //   // Kiểm tra nội dung phản hồi
  //   expect(res.body).toEqual({
  //     success: false,
  //     message: 'Lỗi khi xác thực.'
  //   });
  //   // Kết nối lại cơ sở dữ liệu sau khi test xong
  //   await pool.connect();
  // });
});
