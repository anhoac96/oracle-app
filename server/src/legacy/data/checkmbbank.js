const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');

router.post('/mbbank', async (req, res) => {

  const sites = ['VTEL', 'VNP', 'MBF'];
  let allRows = [];

  try {
    let { p_date } = req.body;

// Nếu không nhập -> lấy ngày T-1
if (!p_date || p_date.trim() === "") {
  const now = new Date();
  now.setDate(now.getDate() - 1); // trừ 1 ngày => T-1
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  p_date = `${dd}${mm}${yyyy}`;
} else {
  p_date = p_date.trim();
}


    for (const site of sites) {
      let conn;

      try {
        conn = await getConnection(site);

        const sql = `
WITH 
S0 AS (
SELECT SOURCE_NUMBER,
       TO_CHAR(tos.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') THOI_GIAN_MV,
       t.game_type,
       ticket_cost,
       row_number() over( partition BY SOURCE_NUMBER order by tos.CREATED_AT ASC) stt
FROM ticket t 
INNER JOIN ORDER_ITEM oi ON t.order_item_id=oi.id
INNER JOIN ORDER_TABLE ot ON oi.order_id=ot.id
INNER JOIN ticket_order_sms tos ON oi.TICKET_SMS_ID=tos.id
WHERE ISSUE_RESULT='SUCCESS'
  AND to_char(t.CREATED_AT,'ddmmyyyy') = :p_date
  AND EMBEDDED_CHANEL='MB'
),
S1 AS (
SELECT phone_number,
       MOBILE_NETWORK_PROVIDER NHA_MANG,
       TO_CHAR(ca.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') THOI_GIAN_DK,
       sum(ticket_cost) TONG_CHI_TIEU
FROM customer_account ca
INNER JOIN ticket t ON ca.id=t.customer_account_id
WHERE ISSUE_RESULT='SUCCESS'
  AND to_char(t.CREATED_AT,'ddmmyyyy') = :p_date
  AND to_char(ca.CREATED_AT,'ddmmyyyy') = :p_date
  AND channel='VNT_MB' AND CUSTOMER_ACCOUNT_STATUS='ACTIVE'
	AND CUSTOMER_ACCOUNT_ACTIVITY_STATUS='NORMAL'
GROUP BY phone_number, MOBILE_NETWORK_PROVIDER, ca.CREATED_AT
)
SELECT phone_number, NHA_MANG, THOI_GIAN_DK, THOI_GIAN_MV, game_type, TONG_CHI_TIEU
FROM s1 a
INNER JOIN S0 b ON a.phone_number=b.SOURCE_NUMBER
WHERE STT='1'
        `;

        const result = await conn.execute(sql, { p_date }, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        allRows.push(...result.rows);

      } finally {
        if (conn) try { await conn.close(); } catch(e) {}
      }
    }

    // Sắp xếp theo ngày CREATED_AT
    allRows.sort((a, b) => {
      const da = a.THOI_GIAN_DK
        ? new Date(a.THOI_GIAN_DK.split("/").reverse().join(" "))
        : 0;
      const db = b.THOI_GIAN_DK
        ? new Date(b.THOI_GIAN_DK.split("/").reverse().join(" "))
        : 0;
      return da - db;
    });

      // Format TONG_CHI_TIEU thành có dấu phẩy
    allRows = allRows.map(row => ({
      ...row,
      TONG_CHI_TIEU: row.TONG_CHI_TIEU ? Number(row.TONG_CHI_TIEU).toLocaleString('en-US') : '0'
    }));

    res.json({ success: true, rows: allRows.slice(0, 40) });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
