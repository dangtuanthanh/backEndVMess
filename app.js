var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var indexRoom = require('./routes/room');
var indexMessage = require('./routes/message');
var indexUsers = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// cấu hình bảo mật
//bảo mật header
const helmet = require('helmet');
app.use(helmet()); // Áp dụng bảo mật cho toàn bộ app

// bảo mật cors
const cors = require('cors');
app.use(cors());
// Cấu hình cors để chỉ cho phép một số domain nhất định truy cập
// app.use(cors({
//     origin: 'http://your-frontend-url.com',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
// }));

// bảo mật rate limit
const rateLimit = require('express-rate-limit');
// Giới hạn mỗi IP chỉ có thể gửi 100 request mỗi 15 phút
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // giới hạn 100 requests trong mỗi 15 phút
});
app.use(limiter); // Áp dụng cho toàn bộ ứng dụng

//cấu hình swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swaggerOutput.json');

// Sử dụng Swagger UI
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));




app.use('/', indexRouter,indexRoom,indexMessage,indexUsers);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
