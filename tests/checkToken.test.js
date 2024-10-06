//checkToken.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../app');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process'); 

beforeAll(async () => {
    await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
    await exec('node ctrf/exportResults.js'); // Xuất kết quả kiểm thử sau khi test hoàn tất
});

describe('Test chức năng kiểm tra Access Token', () => {
    // Trường hợp 1: Token hợp lệ
    test('Kiểm tra Access Token hợp lệ', async () => {
        // Tạo Access Token hợp lệ
        const validToken = jwt.sign({ userId: 19 }, process.env.accessTokenSecret, { expiresIn: '15m' });

        // Gửi yêu cầu POST tới endpoint checkToken
        const res = await supertest(app)
            .post('/checkToken') // Đường dẫn của endpoint checkToken
            .set('Authorization', validToken) // Thiết lập Access Token hợp lệ
            .set('Content-type', 'application/json');

        // Kiểm tra mã trạng thái phản hồi là 200
        expect(res.status).toEqual(200);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: true,
            message: "Access Token hợp lệ.",
            userId: expect.any(Number) // Kiểm tra userId là một số
        });
    });

    // Trường hợp 2: Token không hợp lệ
    test('Kiểm tra Access Token không hợp lệ', async () => {
        // Sử dụng một token giả mạo
        const invalidToken = 'invalidToken';

        // Gửi yêu cầu POST tới endpoint checkToken
        const res = await supertest(app)
            .post('/checkToken') // Đường dẫn của endpoint checkToken
            .set('Authorization', invalidToken) // Thiết lập Access Token không hợp lệ
            .set('Content-type', 'application/json');

        // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
        expect(res.status).toEqual(401);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Access Token không hợp lệ hoặc đã hết hạn!"
        });
    });

    // Trường hợp 3: Không có token
    test('Kiểm tra khi không có Access Token', async () => {
        // Gửi yêu cầu POST tới endpoint checkToken mà không có Access Token
        const res = await supertest(app)
            .post('/checkToken') // Đường dẫn của endpoint checkToken
            .set('Content-type', 'application/json');

        // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
        expect(res.status).toEqual(400);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Không tìm thấy Access Token!"
        });
    });

    // Trường hợp 4: Token hết hạn
    test('Kiểm tra Access Token hết hạn', async () => {
        // Tạo Access Token đã hết hạn
        const expiredToken = jwt.sign({ userId: 19 }, process.env.accessTokenSecret, { expiresIn: '-1h' });

        // Gửi yêu cầu POST tới endpoint checkToken
        const res = await supertest(app)
            .post('/checkToken') // Đường dẫn của endpoint checkToken
            .set('Authorization', expiredToken) // Thiết lập Access Token hết hạn
            .set('Content-type', 'application/json');

        // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
        expect(res.status).toEqual(401);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Access Token không hợp lệ hoặc đã hết hạn!"
        });
    });
});
