const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');

router.post('/vpb-neo', async (req, res) => {

  const sites = ['VTEL', 'VNP', 'MBF'];
  let allRows = [];

  try {
    // Lấy tham số từ client
    let { p_date, limit } = req.body;

    // Nếu không nhập ngày -> lấy ngày hiện tại DDMMYYYY
    if (!p_date || p_date.trim() === "") {
      const now = new Date();
      const dd   = String(now.getDate()).padStart(2, '0');
      const mm   = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      p_date = `${dd}${mm}${yyyy}`;
    }

    // Nếu không nhập limit -> mặc định 20
    limit = parseInt(limit);
    if (!limit || isNaN(limit) || limit <= 0) limit = 20;

    for (const site of sites) {
      let conn;

      try {
        conn = await getConnection(site);

        const sql = `
          SELECT 
            MOBILE_NETWORK_PROVIDER AS mang,
            phone_number AS sdt,
            TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') AS ngay_dk_tk,
            TO_CHAR(active_at,  'DD/MM/YYYY HH24:MI:SS') AS ngay_active
          FROM customer_account
          WHERE channel = 'VPBNEO'
            AND TO_CHAR(active_at,'DDMMYYYY') = :p_date
            AND CUSTOMER_ACCOUNT_ACTIVITY_STATUS = 'NORMAL'
            AND CUSTOMER_ACCOUNT_STATUS = 'ACTIVE'
        `;

        const result = await conn.execute(sql, { p_date }, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        allRows.push(...result.rows);

      } finally {
        if (conn) try { await conn.close(); } catch(e) {}
      }
    }

    // Sắp xếp theo ngày active
    allRows.sort((a, b) => {
      const da = a.NGAY_ACTIVE
        ? new Date(a.NGAY_ACTIVE.split("/").reverse().join(" "))
        : 0;
      const db = b.NGAY_ACTIVE
        ? new Date(b.NGAY_ACTIVE.split("/").reverse().join(" "))
        : 0;
      return da - db;
    });

    // Giới hạn số dòng theo limit
    res.json({ success: true, rows: allRows.slice(0, limit) });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});


module.exports = router;
