// queryRoutes.js
const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');

// =======================
// API menus (giữ lại để hỗ trợ giao diện)
router.get('/menus', (req,res)=>{
  res.json([
    { id: "checkerror", name: "Nguyên nhân trả thưởng lỗi" }
  ]);
});

// =======================
// API check nguyen nhan tra thuong 
router.post('/check-error', async (req, res) => {
  let { dbName, vtid1 } = req.body;
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

      let vtid1Arr = [];
if (vtid1) {
  vtid1Arr = vtid1
    .split(',')
    .map(x => x.trim())
    .filter(x => x !== '');
}

if (vtid1Arr.length) {
  whereClause += ` AND t.VT_ID1 IN (${vtid1Arr.map((_, i) => ':v' + i).join(',')})`;
  vtid1Arr.forEach((val, i) => binds['v' + i] = val);
}


const sql = `
  SELECT 
    to_char(rw.CREATED_AT,'dd/mm/yyyy hh24:mi:ss') AS CREATED_AT, 
    to_char(rw.UPDATED_AT,'dd/mm/yyyy hh24:mi:ss') AS UPDATED_AT, 
    t.VT_ID1,
    rw.REF_NUM, 
    rw.BANK_REFERENCE_NUMBER,
    rw.AMOUNT, 
    rw.FEE, 
    rw.PAYMENT_AMOUNT, 
    rw.STATUS, 
    rw.TRANSFER_TYPE, 
    rw.ERROR_CODE, 
    rw.ERROR_MESSAGE,
    CASE 
    	WHEN TRANSFER_TYPE='VIETTEL_PAY' THEN json_value(rw.bank_json_data, '$.errorDesc' DEFAULT 'no message' ON EMPTY)
    	ELSE json_value(rw.bank_json_data, '$.message' DEFAULT 'no message' ON EMPTY)
    END LOI
  FROM reward_transaction rw
  INNER JOIN winning_result wr ON rw.winning_result_id = wr.id
  INNER JOIN ticket t ON wr.ticket_id = t.id
  ${whereClause}
  ORDER BY rw.UPDATED_AT DESC
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
