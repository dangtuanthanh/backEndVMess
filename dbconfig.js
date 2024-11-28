// dbconfig.js
const sql = require('mssql');
require('dotenv').config();
const config = {
  user: process.env.user,
  password: process.env.password,
  server: process.env.server,
  database: process.env.database,
  options: {
    trustedconnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    instancename: "",
  },
  port: parseInt(process.env.port, 10)
};

let pool;

async function connect() {
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('\x1b[32mĐã kết nối tới Cơ Sở Dữ Liệu\x1b[0m');
  } catch (err) {
    console.error('\x1b[31mKhông thể kết nối đến cơ sở dữ liệu:\x1b[0m', err.message);
    pool = null;
    throw new Error('Không thể kết nối đến cơ sở dữ liệu');
  }
}

connect();

module.exports = {
  getPool: () => {
    if (!pool) {
      throw new Error('Kết nối cơ sở dữ liệu chưa được thiết lập');
    }
    return pool;
  },
}

