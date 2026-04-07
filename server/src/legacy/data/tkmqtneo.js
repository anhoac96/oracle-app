const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');

router.get('/mqt-check', async (req, res) => {

  // 🔥 chạy đủ 3 site
  const sites = ['VTEL', 'VNP', 'MBF'];
  let allRows = [];

  const sql = `
WITH
s0 AS (
    SELECT
        ca.id                AS customer_account_id,
        ca.phone_number,
        t.VT_ID1             AS ma_ve,
        t.ticket_cost,
        t.game_type,
        t.CREATED_AT         AS ngay_su_dung_mqt
    FROM vietlott_sms_1.GIFT_IMPORT_FILE@production a
    JOIN vietlott_sms_1.gift_group@production b
        ON a.GIFT_GROUP_ID = b.id
    JOIN vietlott_sms_1.gift@production c
        ON b.id = c.GIFT_GROUP_ID
    JOIN vietlott_sms_1.GIFT_GROUP_USE_GIFT_CODE@production d
        ON c.GIFT_CODE = d.GIFT_CODE
    JOIN vietlott_sms_1.GIFT_GROUP_USE_TICKET@production e
        ON d.GROUP_USE_ID = e.GROUP_USE_ID
    JOIN vietlott_sms_1.ticket@production t
        ON e.TRANS_ID = t.transaction_id
    JOIN customer_account ca
        ON t.customer_account_id = ca.id
    WHERE a.CREATED_AT >= TO_DATE('2025-11-20 00:00:00','YYYY-MM-DD HH24:MI:SS')
      AND a.CREATED_AT <  TO_DATE('2026-01-20 00:00:00','YYYY-MM-DD HH24:MI:SS')
      AND t.ISSUE_RESULT = 'SUCCESS'
      AND UPPER(a.NOTE) LIKE '%VPBANK%'
),
mqt_base AS (
    SELECT
        customer_account_id,
        phone_number,
        MIN(ngay_su_dung_mqt) AS ngay_su_dung_mqt,
        SUM(ticket_cost)      AS dt_mqt
    FROM s0
    GROUP BY customer_account_id, phone_number
),
mqt_game AS (
    SELECT
        customer_account_id,
        LISTAGG(game_type, ',') 
            WITHIN GROUP (ORDER BY game_type) AS sp_chitieu_mqt
    FROM (
        SELECT DISTINCT customer_account_id, game_type FROM s0
    )
    GROUP BY customer_account_id
),
chitieu_money AS (
    SELECT
        m.customer_account_id,
        SUM(t.ticket_cost) AS dt_chitieu
    FROM mqt_base m
    JOIN vietlott_sms_1.ticket@production t
        ON t.customer_account_id = m.customer_account_id
    WHERE t.CREATED_AT >= m.ngay_su_dung_mqt
      AND t.CREATED_AT <  TO_DATE('2026-01-19 00:00:00','YYYY-MM-DD HH24:MI:SS')
      AND t.ISSUE_RESULT = 'SUCCESS'
      AND NOT EXISTS (
          SELECT 1 FROM s0 WHERE s0.ma_ve = t.VT_ID1
      )
    GROUP BY m.customer_account_id
),
chitieu_game AS (
    SELECT
        customer_account_id,
        LISTAGG(game_type, ',') 
            WITHIN GROUP (ORDER BY game_type) AS sp_chitieu
    FROM (
        SELECT DISTINCT m.customer_account_id, t.game_type
        FROM mqt_base m
        JOIN vietlott_sms_1.ticket@production t
            ON t.customer_account_id = m.customer_account_id
        WHERE t.CREATED_AT >= m.ngay_su_dung_mqt
          AND t.CREATED_AT <  TO_DATE('2026-01-19 00:00:00','YYYY-MM-DD HH24:MI:SS')
          AND t.ISSUE_RESULT = 'SUCCESS'
          AND NOT EXISTS (
              SELECT 1 FROM s0 WHERE s0.ma_ve = t.VT_ID1
          )
    )
    GROUP BY customer_account_id
)
SELECT
    m.phone_number,
    g1.sp_chitieu_mqt,
    m.dt_mqt,
    cg.sp_chitieu,
    cm.dt_chitieu
FROM mqt_base m
LEFT JOIN mqt_game g1
    ON m.customer_account_id = g1.customer_account_id
LEFT JOIN chitieu_money cm
    ON m.customer_account_id = cm.customer_account_id
LEFT JOIN chitieu_game cg
    ON m.customer_account_id = cg.customer_account_id
ORDER BY m.phone_number
`;

  try {
    for (const site of sites) {
      let connection;
      try {
        connection = await getConnection(site);

        const result = await connection.execute(sql, [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        // ✅ map + gắn site + FIX NULL
        const rows = result.rows.map(r => ({
          site,
          phone_number: r.PHONE_NUMBER || '',
          sp_chitieu_mqt: r.SP_CHITIEU_MQT || '',
          dt_mqt: r.DT_MQT != null ? Number(r.DT_MQT).toLocaleString('en-US') : '0',
          sp_chitieu: r.SP_CHITIEU || '',
          dt_chitieu: r.DT_CHITIEU != null ? Number(r.DT_CHITIEU).toLocaleString('en-US') : '0'
        }));

        allRows.push(...rows);

        console.log(`✅ Site ${site}: ${rows.length} dòng`);

      } catch (siteErr) {
        // ❗ site lỗi không làm hỏng API
        console.error(`❌ Lỗi site ${site}:`, siteErr.message);
      } finally {
        if (connection) await connection.close();
      }
    }

    res.json({
      success: true,
      total: allRows.length,
      data: allRows
    });

  } catch (err) {
    console.error('❌ API /mqt-check error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
