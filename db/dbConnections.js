// db/dbConnections.js
const oracledb = require('oracledb');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config();

// ✅ [SECURITY] Credentials đọc từ biến môi trường, KHÔNG hardcode
const DB_USER = process.env.ORACLE_DB_USER || 'report';
const DB_PASSWORD = process.env.ORACLE_DB_PASSWORD;
const DB_VTEL_HOST = process.env.ORACLE_CONNECT_VTEL || '10.10.9.5:1521/report';
const DB_VNP_HOST  = process.env.ORACLE_CONNECT_VNP  || '10.15.9.5:1521/report';
const DB_MBF_HOST  = process.env.ORACLE_CONNECT_MBF  || '10.20.9.5:1521/report';

if (!DB_PASSWORD) {
  console.error('❌ [SECURITY] ORACLE_DB_PASSWORD chưa được cấu hình trong file .env!');
}

// Danh sách kết nối DB (đọc từ env)
const dbConfigs = {
  VTEL: {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_VTEL_HOST
  },
  VNP: {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_VNP_HOST
  },
  MBF: {
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_MBF_HOST
  }
};

// Whitelist các DB name hợp lệ để ngăn DB name injection
const ALLOWED_DB_NAMES = new Set(['VTEL', 'VNP', 'MBF']);

// Hàm lấy kết nối Database
async function getConnection(dbName) {
  if (!ALLOWED_DB_NAMES.has(dbName)) {
    throw new Error('Ten Database khong hop le.');
  }
  return await oracledb.getConnection(dbConfigs[dbName]);
}

module.exports = { getConnection };
