//logout.test.js
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

describe('Test chức năng đăng xuất', () => {
    test('Đăng xuất thành công với Refresh Token hợp lệ', async () => {
        const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk1LCJpYXQiOjE3Mjc5Mjc0OTYsImV4cCI6MTcyODUzMjI5Nn0.yxPZNkBx75rEY7oxp3zv8ITves4v1okTnW8rfNFjes4';

        // Gửi yêu cầu POST tới endpoint đăng xuất
        const res = await supertest(app)
            .post('/logout') // Đường dẫn của endpoint đăng xuất
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send({ refreshToken }); // Gửi dữ liệu refreshToken

        // Kiểm tra mã trạng thái phản hồi là 200
        expect(res.status).toEqual(200);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: true,
            message: 'Đăng xuất thành công.'
        });
    });

    test('Không gửi Refresh Token (lỗi đầu vào)', async () => {
        const res = await supertest(app)
            .post('/logout') // Đường dẫn của endpoint đăng xuất
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send({}); // Không gửi Refresh Token

        // Kiểm tra mã trạng thái phản hồi là 400
        expect(res.status).toEqual(400);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Refresh Token không được gửi lên!"
        });
    });

    test('Đăng xuất với Refresh Token không hợp lệ', async () => {
        const refreshToken = 'token không hợp lệ';

        // Gửi yêu cầu POST tới endpoint đăng xuất
        const res = await supertest(app)
            .post('/logout') // Đường dẫn của endpoint đăng xuất
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send({ refreshToken }); // Gửi Refresh Token không hợp lệ

        // Kiểm tra mã trạng thái phản hồi là 400
        expect(res.status).toEqual(400);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Refresh Token không hợp lệ!"
        });
    });

    test('Lỗi hệ thống trong quá trình đăng xuất', async () => {
        await pool.close();
        const refreshToken = 'token gây lỗi'; // Giả lập token gây lỗi trong quá trình xử lý

        // Gửi yêu cầu POST tới endpoint đăng xuất
        const res = await supertest(app)
            .post('/logout') // Đường dẫn của endpoint đăng xuất
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send({ refreshToken });

        // Kiểm tra mã trạng thái phản hồi là 500 (lỗi hệ thống)
        expect(res.status).toEqual(500);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Đã xảy ra lỗi trong quá trình đăng xuất."
        });
        // Kết nối lại cơ sở dữ liệu sau khi test xong
        await pool.connect();
    });
});
