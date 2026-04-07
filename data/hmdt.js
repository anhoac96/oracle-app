const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');

// =======================
// API menus (giữ lại để hỗ trợ giao diện)
router.get('/menus', (req, res) => {
  res.json([
    { id: "checkhmdt", name: "Xuất danh sách HMDT" }
  ]);
});

// =======================
// API check hmdt 
router.post('/check-hmdt', async (req, res) => {
  let { phone, fromDate, toDate, dbName = 'all' } = req.body;
  const sites = ['VTEL', 'VNP', 'MBF'];
  let allRows = [];

  try {
    const dbsToQuery = dbName === 'all' ? sites : [dbName];

    for (const site of dbsToQuery) {
      let conn;
      try {
        conn = await getConnection(site);
        let whereClause = 'WHERE 1=1';
        const binds = {};

        if (phone) { whereClause += ' AND ca.PHONE_NUMBER = :phone'; binds.phone = phone; }
        if (fromDate) { whereClause += ' AND ht.COMPLETED_AT >= TO_DATE(:fromDate, \'YYYY-MM-DD\')'; binds.fromDate = fromDate; }
        if (toDate) { whereClause += ' AND ht.COMPLETED_AT <= TO_DATE(:toDate, \'YYYY-MM-DD\')'; binds.toDate = toDate; }

        const sql = `
          SELECT ca.PHONE_NUMBER AS PHONE, 
                 TO_CHAR(ht.COMPLETED_AT, 'YYYY-MM-DD HH24:MI:SS') AS NGAY,
                 ht.AMOUNT AS SO_TIEN_GD, 
                 ht.AFTER_BALANCE AS SO_DU_SAU_GD, 
                 ht.TRANSACTION_CODE AS MA_GD,
                 ht.TRANSACTION_REF_TYPE AS TYPE
          FROM hmdt_transaction ht
          INNER JOIN hmdt hm ON ht.hmdt_id = hm.id
          INNER JOIN customer_account ca ON hm.customer_account_id = ca.id
          ${whereClause}
          ORDER BY ht.COMPLETED_AT DESC
        `;

        const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        allRows = allRows.concat(result.rows);  // Gộp kết quả từ nhiều cơ sở dữ liệu vào allRows

      } finally {
        if (conn) try { await conn.close(); } catch (e) {}
      }
    }

    // Trả về kết quả dưới dạng JSON
    res.json({ success: true, rows: allRows });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =======================
// API download CSV (xuất dữ liệu ra CSV)
router.get('/download-hmdt-csv', async (req, res) => {
  let { dbName, phone: phoneQuery, fromDate, toDate } = req.query;  
  let allRows = [];

  // Đảm bảo dbName có giá trị hợp lệ, nếu không thì mặc định là 'all'
  dbName = dbName || 'all';

  try {
    const sites = dbName === 'all' ? ['VTEL', 'VNP', 'MBF'] : [dbName];

    for (const site of sites) {
      const conn = await getConnection(site);

      let whereClause = 'WHERE 1=1';
      const binds = {};

      if (phoneQuery) { whereClause += ' AND ca.PHONE_NUMBER = :phone'; binds.phone = phoneQuery; } 
      if (fromDate) { whereClause += ' AND ht.COMPLETED_AT >= TO_DATE(:fromDate, \'YYYY-MM-DD\')'; binds.fromDate = fromDate; }
      if (toDate) { whereClause += ' AND ht.COMPLETED_AT <= TO_DATE(:toDate, \'YYYY-MM-DD\')'; binds.toDate = toDate; }

      const sql = `
        SELECT ca.PHONE_NUMBER AS PHONE, 
               TO_CHAR(ht.COMPLETED_AT, 'YYYY-MM-DD HH24:MI:SS') AS NGAY,
               ht.AMOUNT AS SO_TIEN_GD, 
               ht.AFTER_BALANCE AS SO_DU_SAU_GD, 
               ht.TRANSACTION_CODE AS MA_GD,
               ht.TRANSACTION_REF_TYPE AS TYPE
        FROM hmdt_transaction ht
        INNER JOIN hmdt hm ON ht.hmdt_id = hm.id
        INNER JOIN customer_account ca ON hm.customer_account_id = ca.id
        ${whereClause}
        ORDER BY ht.COMPLETED_AT ASC
      `;

      const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      allRows = allRows.concat(result.rows);  // Gộp kết quả từ nhiều cơ sở dữ liệu vào allRows
    }

    // Kiểm tra nếu không có dữ liệu
    if (!allRows.length) return res.status(400).send('Không có dữ liệu để xuất CSV');
    
    // Lấy số điện thoại từ dòng đầu tiên để làm tên file
    const phone = allRows.length > 0 ? allRows[0].PHONE : 'unknown_phone';  
    
    // Lấy ngày hiện tại để tạo tên file
    const today = new Date();
    const filename = `SO_DU_HMDT_${phone}_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.csv`;

    // Cấu hình trường dữ liệu cho CSV
    const fields = Object.keys(allRows[0] || {});
    const parser = new Parser({ fields });
    const csv = parser.parse(allRows);

    // Cấu hình headers và gửi file CSV về client
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);

  } catch (err) {
    res.status(500).send('Lỗi server: ' + err.message);
  }
});


    

module.exports = router;
