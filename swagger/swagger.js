const swaggerAutogen = require('swagger-autogen')();

const outputFile = './swagger/swaggerOutput.json'; // File output Swagger
const endpointsFiles = ['./routes/index.js']; // Các file route của bạn

// Cấu hình Swagger tùy chỉnh
const doc = {
    info: {
        title: 'API Documentation',  // Tên API
        description: 'This is the API documentation for VMess project', // Mô tả API
        version: '1.0.0'  // Phiên bản của API
    },
    host: 'localhost:1002',  // Cổng của server mà Swagger sẽ gọi đến
    schemes: ['http'],  // Giao thức sử dụng
    basePath: '/',  // Đường dẫn cơ sở của API
    tags: [  // Thêm các phân loại cho các endpoint
        {
            name: 'Home',  // Thêm tag Home cho trang chủ
            description: 'Back-end home page'
        },
        {
            name: 'Auth',  // Tên tag
            description: 'Authentication related endpoints'  // Mô tả tag
        }
    ]
};

// Tạo file Swagger output với cấu hình tùy chỉnh
swaggerAutogen(outputFile, endpointsFiles, doc);
