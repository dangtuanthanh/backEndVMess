const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
const { exec } = require('child_process');

console.log('Đang chạy exportResults.js...');

// Đọc file JSON kết quả kiểm thử
const jsonDataPath = path.join(__dirname, 'ctrf-report.json'); // Tạo đường dẫn tuyệt đối
const jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf-8'));

// Trích xuất dữ liệu từ jsonData.results.tests
const data = jsonData.results.tests.map(test => ({
    testName: test.name,
    status: test.status,
    duration: test.duration,
    message: test.message, // Bạn cũng có thể thêm thông điệp nếu cần
    filePath: test.filePath // Thêm đường dẫn file kiểm thử nếu cần
}));

// Tạo workbook và sheet
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(data);
xlsx.utils.book_append_sheet(wb, ws, 'Test Results');

// Hàm kiểm tra và tạo tên file mới nếu đã tồn tại
function getUniqueFileName(basePath, baseName, ext) {
    let filePath = path.join(basePath, baseName + ext);
    let counter = 0;
    
    // Kiểm tra nếu file đã tồn tại thì thêm số thứ tự vào tên file
    while (fs.existsSync(filePath)) {
        counter++;
        filePath = path.join(basePath, `${baseName}${counter}${ext}`);
    }
    
    return filePath;
}

try {
    // Tạo đường dẫn cho file Excel
    const basePath = './ctrf';
    const baseName = 'results';
    const ext = '.xlsx';

    // Kiểm tra và tạo tên file nếu cần
    const excelFilePath = getUniqueFileName(basePath, baseName, ext);
    
    // Ghi file Excel
    xlsx.writeFile(wb, excelFilePath);
    console.log('File sẽ được lưu tại:', excelFilePath);

    // Mở file Excel sau khi xuất xong
    exec(`start "" "${excelFilePath}"`);
} catch (error) {
    console.error('Lỗi khi ghi file Excel:', error);
}
