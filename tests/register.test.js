// register.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../app');
const { exec } = require('child_process');
beforeAll(async () => {
  await pool.connect(); // Kết nối đến SQL Server trước khi test
});
afterAll(async () => {
  await exec('node ctrf/exportResults.js');
});

describe('Test chức năng đăng ký', () => {
  test('Đăng ký với email hợp lệ', async () => {
    const data = {
      email: 'test@gmail.com',
      password: 'password123'
    };

    // Gửi yêu cầu POST tới endpoint đăng ký
    const res = await supertest(app)
      .post('/register') // Đường dẫn của endpoint đăng ký
      .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
      .send(data); // Gửi dữ liệu đăng ký (email và password)

    // Kiểm tra mã trạng thái phản hồi là 200
    expect(res.status).toEqual(200);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: true,
      message: "Đăng ký thành công, vui lòng kiểm tra email để xác thực."
    });
  });

  test('Đăng ký với email đã tồn tại', async () => {
    const data = {
      email: 'cuathanhday265@gmail.com',  // Email đã tồn tại trong hệ thống
      password: 'password123'
    };

    // Gửi yêu cầu POST tới endpoint đăng ký
    const res = await supertest(app)
      .post('/register') // Đường dẫn của endpoint đăng ký
      .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
      .send(data); // Gửi dữ liệu đăng ký (email và password)

    // Kiểm tra mã trạng thái phản hồi là 400 (lỗi)
    expect(res.status).toEqual(400);

    // Kiểm tra phản hồi có Content-Type là JSON
    expect(res.type).toEqual(expect.stringContaining('json'));

    // Kiểm tra nội dung phản hồi
    expect(res.body).toEqual({
      success: false,
      message: 'Email đã được sử dụng'
    });
  });



  test('Đăng ký với email không hợp lệ', async () => {
    const data = {
      email: 'not-an-email',
      password: 'password123'
    };
    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data); // Gửi dữ liệu đăng ký không hợp lệ

    expect(res.status).toEqual(400);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email không hợp lệ!');
  });

  // test('Đăng ký với mật khẩu yếu', async () => {
  //   const data = {
  //     email: 'weakpassword@gmail.com',
  //     password: '123'
  //   };
  //   const res = await supertest(app)
  //     .post('/register')
  //     .set('Content-type', 'application/json')
  //     .send(data); // Gửi dữ liệu với mật khẩu yếu

  //   expect(res.status).toEqual(400);
  //   expect(res.body.success).toBe(false);
  //   expect(res.body.message).toBe('Mật khẩu quá yếu!');
  // });


  test('Đăng ký thiếu trường email', async () => {
    const data = {
      password: 'password123'
    };

    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data);

    expect(res.status).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });

  test('Đăng ký thiếu trường mật khẩu', async () => {
    const data = {
      email: 'test2@gmail.com'
    };

    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data);

    expect(res.status).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });


  test('Đăng ký với trường email trống', async () => {
    const data = {
      email: '',
      password: 'password123'
    };

    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data);

    expect(res.status).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });

  test('Đăng ký với trường mật khẩu trống', async () => {
    const data = {
      email: 'test3@gmail.com',
      password: ''
    };

    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data);

    expect(res.status).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });



  test('Đăng ký với email là null', async () => {
    const data = {
      email: null,
      password: 'password123'
    };

    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data);

    expect(res.status).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });

  test('Đăng ký với mật khẩu là null', async () => {
    const data = {
      email: 'test4@gmail.com',
      password: null
    };

    const res = await supertest(app)
      .post('/register')
      .set('Content-type', 'application/json')
      .send(data);

    expect(res.status).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
  });

  // test('Đăng ký khi cơ sở dữ liệu gặp lỗi', async () => {
  //   try {
  //     // Đóng pool kết nối để mô phỏng lỗi
  //     await pool.close();
  
  //     const data = {
  //       email: 'error@gmail.com',
  //       password: 'password123'
  //     };
  
  //     // Gửi yêu cầu POST tới endpoint đăng ký
  //     const res = await supertest(app)
  //       .post('/register')
  //       .set('Content-type', 'application/json')
  //       .send(data);
  
  //     // Kiểm tra mã trạng thái phản hồi là 500 (lỗi hệ thống)
  //     expect(res.status).toEqual(500);
  
  //     // Kiểm tra nội dung phản hồi
  //     expect(res.body.success).toBe(false);
  //     expect(res.type).toEqual(expect.stringContaining('json'));
  //     expect(res.body.message).toBe('Lỗi khi đăng ký, vui lòng thử lại sau.');
  //   } catch (error) {
  //     console.error('Lỗi trong quá trình kiểm thử:', error);
  //     throw error; // Bỏ lỗi để Jest có thể hiển thị
  //   } finally {
  //     // Đảm bảo rằng kết nối lại pool cơ sở dữ liệu sau khi test xong
  //     await pool.connect();
  //   }
  // });
  


});
