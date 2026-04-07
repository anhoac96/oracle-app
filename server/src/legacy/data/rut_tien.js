const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');


router.post('/withdraw-request', async (req, res) => {
  const { createdFrom, createdTo, status, dbNames } = req.body;

  const sites = dbNames || ['VTEL'];  
  let allRows = [];

  try {
    for (const site of sites) {
      let conn;
      try {
        conn = await getConnection(site);

        let sql = `
          SELECT
            TO_CHAR(CREATED_AT,'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
            TO_CHAR(UPDATED_AT,'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT,
            CODE,
            PAYMENT_CHANNEL,
            REQUEST_AMOUNT,
            FEE_AMOUNT,
            FINAL_AMOUNT,
            STATUS
          FROM vietlott_sms_1.WITHDRAW_REQUEST@production
          WHERE 1=1
        `;

        const binds = {};

        if (createdFrom) {
          sql += " AND CREATED_AT >= TO_DATE(:createdFrom, 'YYYY-MM-DD')";
          binds.createdFrom = createdFrom;
        }

        if (createdTo) {
          sql += " AND CREATED_AT <= TO_DATE(:createdTo, 'YYYY-MM-DD')";
          binds.createdTo = createdTo;
        }

        if (status) {
          sql += " AND STATUS = :status";
          binds.status = status;
        }

        sql += " ORDER BY CREATED_AT DESC";

        const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        
        result.rows.forEach(row => row.SITE = site);

        allRows = allRows.concat(result.rows);  
      } finally {
        if (conn) try { await conn.close(); } catch (e) {}
      }
    }

    res.json({ success: true, rows: allRows });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});


// API xuất dữ liệu yêu cầu rút tiền dưới dạng CSV (GET)
router.get('/withdraw-request-csv', async (req, res) => {
  const { createdFrom, createdTo, status, dbNames } = req.query;

  let sites;
  try {
    sites = JSON.parse(dbNames); 
  } catch (error) {
    return res.status(400).send("Lỗi khi phân tích dữ liệu dbNames: " + error.message);
  }

  sites = sites.length > 0 ? sites : ['VTEL'];

  let allRows = [];

  try {
    for (const site of sites) {
      let conn;
      try {
        conn = await getConnection(site);

        let sql = `
          SELECT
            TO_CHAR(CREATED_AT,'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
            TO_CHAR(UPDATED_AT,'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT,
            CODE,
            PAYMENT_CHANNEL,
            REQUEST_AMOUNT,
            FEE_AMOUNT,
            FINAL_AMOUNT,
            STATUS
          FROM vietlott_sms_1.WITHDRAW_REQUEST@production
          WHERE 1=1
        `;

        const binds = {};

        if (createdFrom) {
          sql += " AND CREATED_AT >= TO_DATE(:createdFrom, 'YYYY-MM-DD')";
          binds.createdFrom = createdFrom;
        }

        if (createdTo) {
          sql += " AND CREATED_AT <= TO_DATE(:createdTo, 'YYYY-MM-DD')";
          binds.createdTo = createdTo;
        }

        if (status) {
          sql += " AND STATUS = :status";
          binds.status = status;
        }

        sql += " ORDER BY CREATED_AT DESC";

        const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // Gắn thêm thông tin site vào mỗi dòng dữ liệu
        const rowsWithSite = result.rows.map(r => ({ ...r, SITE: site }));
        allRows.push(...rowsWithSite);

      } finally {
        if (conn) try { await conn.close(); } catch (e) {}
      }
    }

    if (!allRows.length)
      return res.status(400).send("Không có dữ liệu để xuất CSV");

    const fields = Object.keys(allRows[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(allRows);

    // Lấy ngày hiện tại (Ngày T) và chuyển thành định dạng ddmmyyyy
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0'); 
    const month = String(today.getMonth() + 1).padStart(2, '0'); 
    const year = today.getFullYear();

    // Định dạng ngày là ddmmyyyy
    const dateString = `${day}${month}${year}`;
    const filename = `DANH_SACH_RUT_TIEN_${dateString}.csv`;

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "text/csv");
    res.send(csv);

  } catch (err) {
    res.status(500).send("Lỗi server: " + err.message);
  }
});


module.exports = router;
