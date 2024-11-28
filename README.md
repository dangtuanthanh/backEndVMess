# ỨNG DỤNG NHẮN TIN VMESS
#### Link Github Front-end: https://github.com/dangtuanthanh/frontEndVMess
#### Website: http://3.nhahang.xyz

## Công nghệ
### Cơ sở dữ liệu
- MS SQL Server 2019
### Back-end
- Main: Node.js, Express.js, Socket.io, Express generator
- Security: Jwt, Google OAuth, cors, bcrypt, express-rate-limit, helmet, dotenv, cookie-parser
- Test: Jest, supertest, jest-ctrf-json-reporter
- File & Media: multer, sharp, xlsx
- Deployment: Render.com
- Other: swagger, mssql, nodemailer
### Front-end
- Main: React.js, Create react app, Socket.io
- State Management: Redux, Redux Toolkit
- Styling: Bootstrap, React-Icons
- Other: Google OAuth, Axios, Lazy load, React-Router-Dom
## Chức năng 
### Hệ thống (Auth)
- Đăng ký
- Đăng nhập
- Đăng nhập bằng tài khoản google
- Xác thực tài khoản thông qua email
- Quên mật khẩu
- Đăng xuất
- Kiểm tra phiên đăng nhập
### Phòng nhắn tin (Room)
- Hiển thị danh sách các phòng nhắn tin
- Tìm kiếm người dùng (thông qua tên người dùng hoặc email)
- Tạo phòng nhắn tin
- Lấy danh sách tin nhắn trong phòng
- Trạng thái hoạt động của người dùng
### Tin nhắn (Message)
- Sửa tin nhắn
- Xoá tin nhắn
### Người dùng (User Profile)
- Đổi tên người dùng
- Đổi ảnh người dùng
- Đổi mật khẩu
