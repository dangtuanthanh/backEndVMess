//login.test.js
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

describe('Test chức năng đăng nhập', () => {
    test('Đăng nhập với email và mật khẩu hợp lệ', async () => {
        const data = {
            email: 'cuathanhday265@gmail.com',
            password: '1234'
        };

        // Gửi yêu cầu POST tới endpoint đăng nhập
        const res = await supertest(app)
            .post('/login') // Đường dẫn của endpoint đăng nhập
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send(data); // Gửi dữ liệu đăng nhập (email và password)

        // Kiểm tra mã trạng thái phản hồi là 200
        expect(res.status).toEqual(200);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: true,
            message: "Đăng nhập thành công.",
            accessToken: expect.any(String), // Kiểm tra accessToken là một chuỗi
            refreshToken: expect.any(String) // Kiểm tra refreshToken là một chuỗi
        });
    });

    test('Đăng nhập với email không tồn tại trong cơ sở dữ liệu', async () => {
        const data = {
            email: 'noemail@gmail.com',
            password: 'password123'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Email hoặc mật khẩu không đúng!');
    });
    test('Đăng nhập với mật khẩu không đúng', async () => {
        const data = {
            email: 'cuathanhday265@gmail.com',
            password: 'nopass'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Email hoặc mật khẩu không đúng!');
    });
    test('Đăng nhập với email và mật khẩu hợp lệ, nhưng tài khoản chưa được xác thực', async () => {
        const data = {
            email: 'test@gmail.com',
            password: '1234'
        };

        // Gửi yêu cầu POST tới endpoint đăng nhập
        const res = await supertest(app)
            .post('/login') // Đường dẫn của endpoint đăng nhập
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send(data); // Gửi dữ liệu đăng nhập (email và password)

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Tài khoản chưa được xác thực!');
    });
    test('Đăng nhập thiếu trường email', async () => {
        const data = {
            password: 'password123'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });

    test('Đăng nhập thiếu trường mật khẩu', async () => {
        const data = {
            email: 'test2@gmail.com'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });

    test('Đăng nhập với email không hợp lệ', async () => {
        const data = {
            email: 'not-an-email',
            password: 'password123'
        };
        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data); // Gửi dữ liệu đăng nhập không hợp lệ

        expect(res.status).toEqual(400);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Email không hợp lệ!');
    });

    test('Đăng nhập thiếu trường email', async () => {
        const data = {
            password: 'password123'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });

    test('Đăng nhập thiếu trường mật khẩu', async () => {
        const data = {
            email: 'test2@gmail.com'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });


    test('Đăng nhập với trường email trống', async () => {
        const data = {
            email: '',
            password: 'password123'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });

    test('Đăng nhập với trường mật khẩu trống', async () => {
        const data = {
            email: 'test3@gmail.com',
            password: ''
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });

    test('Đăng nhập với email là null', async () => {
        const data = {
            email: null,
            password: 'password123'
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });

    test('Đăng nhập với mật khẩu là null', async () => {
        const data = {
            email: 'test4@gmail.com',
            password: null
        };

        const res = await supertest(app)
            .post('/login')
            .set('Content-type', 'application/json')
            .send(data);

        expect(res.status).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.type).toEqual(expect.stringContaining('json'));
        expect(res.body.message).toBe('Dữ liệu gửi lên không chính xác!');
    });
});