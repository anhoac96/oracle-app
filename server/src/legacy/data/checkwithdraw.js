
const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');

// API check nguyen nhan rut tien loi
router.post('/check-withdraw', async (req, res) => {
  let { dbName, code } = req.body;
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

      let codeArr = [];

if (code) {
  codeArr = code
    .split(',')
    .map(x => x.trim())
    .filter(x => x !== '');
}

if (codeArr.length) {
  whereClause += ` AND CODE IN (${codeArr.map((_, i) => ':v' + i).join(',')})`;
  codeArr.forEach((val, i) => binds['v' + i] = val);
}


const sql = `
SELECT CODE, b.TRANSACTION_CODE,b.TRANSACTION_RESULT, a.AMOUNT,BANK_ERROR,MESSAGE
FROM WITHDRAW_REQUEST_SETTLEMENT_DETAIL_TRANSACTION a
INNER JOIN WITHDRAW_REQUEST_SETTLEMENT_DETAIL b ON a.WITHDRAW_REQUEST_SETTLEMENT_DETAIL_ID=b.id
INNER JOIN WITHDRAW_REQUEST c ON b.WITHDRAW_REQUEST_ID=c.id
${whereClause}
`;

        const result = await conn.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const rowsWithSite = result.rows.map(r => ({ ...r, SITE: site }));
        allRows.push(...rowsWithSite);

      } finally {
        if (conn) try { await conn.close(); } catch (e) {}
      }
    }

    res.json({ success: true, rows: allRows });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
