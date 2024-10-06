// mock/sqlMock.js
module.exports = {
    register: async () => {
      // Giả lập việc trả về lỗi kết nối cơ sở dữ liệu
      throw new Error('Không thể kết nối đến cơ sở dữ liệu');
    }
  };
  