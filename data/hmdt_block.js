const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');



// API check hmdt block
router.post('/check-hmdt-block', async (req, res) => {
  let { phone, dbName = 'all' } = req.body;
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
       

        const sql = `
        WITH 
S0 AS (SELECT ID,CREATED_AT,BLOCKED_AMOUNT,BLOCKED_AT,HMDT_ID,STATUS,TRANSACTION_REF_TYPE FROM HMDT_BLOCKED_AMOUNT_HIST@dbhist
		UNION ALL 
	 SELECT ID,CREATED_AT,BLOCKED_AMOUNT,BLOCKED_AT,HMDT_ID,STATUS,TRANSACTION_REF_TYPE FROM HMDT_BLOCKED_AMOUNT)
SELECT phone_number, a.ID AS ID_HMDT_BLOCKED_AMOUNT,
to_char(a.CREATED_AT,'dd/mm/yyyy hh24:mi:ss') AS CREATED_AT
,a.BLOCKED_AMOUNT,to_char(a.BLOCKED_AT,'dd/mm/yyyy hh24:mi:ss') AS BLOCKED_AT ,
a.HMDT_ID, a.STATUS,a.TRANSACTION_REF_TYPE
FROM S0 a
INNER JOIN hmdt ht ON a.hmdt_id=ht.id
INNER JOIN customer_account ca ON ht.customer_account_id=ca.id
          ${whereClause}  AND a.STATUS='ACTIVE'
          ORDER BY a.CREATED_AT DESC 
        `;

        const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        allRows = allRows.concat(result.rows);  

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


module.exports = router;
