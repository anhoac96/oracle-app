// db/dbConnections.js
const oracledb = require('oracledb');

//Danh sach ket noi DB
const dbConfigs = {
  VTEL: {
    user: "report",
    password: "report123",
    connectString: "10.10.9.5:1521/report"
  },
  VNP: {
    user: "report",
    password: "report123",
    connectString: "10.15.9.5:1521/report"
  },
  MBF: {
    user: "report",
    password: "report123",
    connectString: "10.20.9.5:1521/report"
  }
};

//Ham lay ket noi Database 
async function getConnection(dbName) {
  if (!dbConfigs[dbName]) throw new Error("Ten Database khong ton tai: " + dbName);
  return await oracledb.getConnection(dbConfigs[dbName]);
}

module.exports = { getConnection };
