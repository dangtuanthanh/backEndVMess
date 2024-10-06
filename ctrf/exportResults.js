const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
console.log('Đang chạy exportResults.js...'); // Thêm dòng này
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
try {
// Ghi file Excel
const excelFilePath = './ctrf/results.xlsx';
xlsx.writeFile(wb, excelFilePath);
console.log('File sẽ được lưu tại:', excelFilePath);

// Mở file Excel sau khi xuất xong
const { exec } = require('child_process');
exec(`start "" "${excelFilePath}"`);
} catch (error) {
    console.error('Lỗi khi ghi file Excel:', error);
}