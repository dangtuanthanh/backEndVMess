//googleLogin.test.js
const db = require('../dbconfig');
const pool = db.getPool();
const supertest = require('supertest');
var app = require('../app'); // Đường dẫn đến file app.js
const { exec } = require('child_process');



beforeAll(async () => {
    await pool.connect(); // Kết nối đến SQL Server trước khi test
});

afterAll(async () => {
    await exec('node ctrf/exportResults.js'); // Xuất kết quả kiểm thử sau khi test hoàn tất
});
// ID token từ Google (bạn sẽ lấy từ OAuth2 Playground)
const googleTokenId = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjI4YTQyMWNhZmJlM2RkODg5MjcxZGY5MDBmNGJiZjE2ZGI1YzI0ZDQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0MjI1NDg3NTE5NjYtdnM4NXNwOW9taXU2NDVzZHZraTVvMWFoYW9pZjMzc2UuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MjI1NDg3NTE5NjYtdnM4NXNwOW9taXU2NDVzZHZraTVvMWFoYW9pZjMzc2UuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI1OTQzMDUxNzE4NDk2NjMxODIiLCJlbWFpbCI6ImRhbmd0dWFudGhhbmgyNjVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJWUjY1aVI5dGI2aG12ZDBmazY0WXR3IiwibmFtZSI6IsSQ4bq3bmcgVHXhuqVuIFRow6BuaCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLcFB5aGpVYkx5Y2xvdGNTdmxOQWU2TjRvNHFhSzI4cVVHWXFvd2RXNkFGU2RDNnc9czk2LWMiLCJnaXZlbl9uYW1lIjoixJDhurduZyIsImZhbWlseV9uYW1lIjoiVHXhuqVuIFRow6BuaCIsImlhdCI6MTcyODAyNjU0OCwiZXhwIjoxNzI4MDMwMTQ4fQ.Tsvf0uQMSFRTimgaeHM38a39XM3C3kkPvqOBQQpGKsgAvQIjCIVFDf4XDZSyaXBKQidPWkomeVPTcbDAN56lK14S4ube0VaG-ujwu3y2QkP9qIPJ0TI0OEIX5CEl2XOu4r9z5FJ4zSeO2G1se9sOfjFB_4ecggS8s7tPHwWJ_LrzK1zCeRTGq4kjuwg_bYCzGDFZl5uxkqMUDs1xcKS9SZskZTpwI4MLmM0NGDqOdwmuBiRpCYHUftuEev74wjUOm45KyTsYhcsU3-5X0lWN6jXfaFSy_f--uB0kb3t3anVy_FuyOY7aJXNqBqs4TAWuQFx1hsZdrwrXlA38mmtRhw'; 
describe('Test chức năng googleLogin', () => {
    // Trường hợp 1: Đăng nhập với Google thành công
    test('Đăng nhập Google thành công', async () => {
        const res = await supertest(app)
            .post('/googleLogin')
            .set('Content-type', 'application/json')
            .send({
                tokenId: googleTokenId // Sử dụng tokenId từ Google
            });

        // Kiểm tra mã trạng thái phản hồi là 200
        expect(res.status).toEqual(200);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: true,
            message: "Đăng nhập bằng Google thành công.",
            accessToken: expect.any(String), // Kiểm tra accessToken là một chuỗi
            refreshToken: expect.any(String) // Kiểm tra refreshToken là một chuỗi
        });
    });

    // Trường hợp 2: Đăng nhập với token không hợp lệ
    test('Đăng nhập Google với token không hợp lệ', async () => {
        const res = await supertest(app)
            .post('/googleLogin')
            .set('Content-type', 'application/json')
            .send({
                tokenId: 'invalidToken' // Token giả mạo
            });

        // Kiểm tra mã trạng thái phản hồi là 401 (Unauthorized)
        expect(res.status).toEqual(401);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Token không hợp lệ"
        });
    });
    // Trường hợp 3: Không gửi tokenId
    test('Đăng nhập Google mà không gửi tokenId', async () => {
        const res = await supertest(app)
            .post('/googleLogin')
            .set('Content-type', 'application/json')
            .send({}); // Gửi rỗng không có tokenId

        // Kiểm tra mã trạng thái phản hồi là 400 (Bad Request)
        expect(res.status).toEqual(400);

        // Kiểm tra phản hồi có Content-Type là JSON
        expect(res.type).toEqual(expect.stringContaining('json'));

        // Kiểm tra nội dung phản hồi
        expect(res.body).toEqual({
            success: false,
            message: "Thiếu tokenId từ Google."
        });
    });
});
