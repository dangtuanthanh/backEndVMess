// refreshToken.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../app');
const { exec } = require('child_process');

beforeAll(async () => {
    await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
    await exec('node ctrf/exportResults.js'); // Xuất kết quả kiểm thử
});

describe('Test chức năng làm mới Access Token', () => {
    
    test('Làm mới Access Token với refresh token hợp lệ', async () => {
        const data = {
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE5LCJpYXQiOjE3Mjc4NzYwNTUsImV4cCI6MTcyODQ4MDg1NX0.9s5ej7hP9FJYac1_j8sUPxFJhbVuynI-vLlLTyWRUqQ'
        };

        // Gửi yêu cầu POST tới endpoint refreshToken
        const res = await supertest(app)
            .post('/refreshToken') // Đường dẫn của endpoint làm mới token
            .set('Content-type', 'application/json') // Đặt tiêu đề Content-Type là application/json
            .send(data); // Gửi dữ liệu refreshToken

        // Kiểm tra mã trạng thái phản hồi là 200
        expect(res.status).toEqual(200);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: true,
            message: "Làm mới Access Token thành công.",
            accessToken: expect.any(String) // Kiểm tra accessToken là một chuỗi
        });
    });

    test('Làm mới Access Token nhưng refresh token không được gửi lên', async () => {
        const data = {}; // Không gửi refreshToken

        const res = await supertest(app)
            .post('/refreshToken')
            .set('Content-type', 'application/json')
            .send(data);

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

    test('Làm mới Access Token với refresh token không hợp lệ', async () => {
        const data = {
            refreshToken: 'invalidRefreshToken'
        };

        const res = await supertest(app)
            .post('/refreshToken')
            .set('Content-type', 'application/json')
            .send(data);

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

    test('Làm mới Access Token với refresh token đã hết hạn', async () => {
        const data = {
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE5LCJpYXQiOjE3Mjc4NzI5ODIsImV4cCI6MTcyODQ3Nzc4Mn0.KncYuOIMfWOF7Fo-hglN7nOO0ASRwd1ajcY5ryvj9s0'
        };

        const res = await supertest(app)
            .post('/refreshToken')
            .set('Content-type', 'application/json')
            .send(data);

        // Kiểm tra mã trạng thái phản hồi là 400
        expect(res.status).toEqual(400);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Refresh Token đã hết hạn!"
        });
    });

    test('Làm mới Access Token khi người dùng không tồn tại', async () => {
        const data = {
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk1LCJpYXQiOjE3Mjc5Mjc0OTYsImV4cCI6MTcyODUzMjI5Nn0.yxPZNkBx75rEY7oxp3zv8ITves4v1okTnW8rfNFjes4'
        };

        const res = await supertest(app)
            .post('/refreshToken')
            .set('Content-type', 'application/json')
            .send(data);

        // Kiểm tra mã trạng thái phản hồi là 400
        expect(res.status).toEqual(400);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Người dùng không tồn tại!"
        });
    });

});
