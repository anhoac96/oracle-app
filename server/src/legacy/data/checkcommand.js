// queryRoutes.js
const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');


// =======================
// API check COMMAND_CODE
router.post('/check-command', async (req, res) => {
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
  whereClause += `AND d.VT_ID1 IN (${vtid1Arr.map((_, i) => ':v' + i).join(',')})`;
  vtid1Arr.forEach((val, i) => binds['v' + i] = val);
}


const sql = `
SELECT to_char(b.CREATED_AT,'dd/mm/yyyy hh24:mi:ss') Ngay_lap_lenh,
  VT_ID1,
  COMMAND_CODE,
  to_char(APPROVE_TIME,'dd/mm/yyyy hh24:mi:ss') APPROVE_TIME,
  APPROVE_STATUS,
  DECLINE_REASON,
 b.GAME_TYPE,
  b.REWARD_PAYMENT_CHANNEL
  FROM WINNING_PAYMENT_COMMAND a
  INNER JOIN WINNING_PAYMENT_COMMAND_BATCH b ON a.WINNING_PAYMENT_COMMAND_BATCH_ID=b.ID
  INNER JOIN WINNING_RESULT c ON a.WINNING_RESULT_ID=c.ID
  INNER JOIN ticket d ON c.ticket_id=d.id 
  ${whereClause}
   ORDER BY b.CREATED_AT DESC
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
