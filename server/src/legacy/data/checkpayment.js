// queryRoutes.js
const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');

// =======================
// API menus
router.get('/menus', (req,res)=>{
  res.json([
    { id: "payment", name: "Thanh toán mua vé" }
  ]);
});

// =======================
// API check payment
router.post('/check-payment', async (req, res) => {
  console.log("===== REQUEST BODY =====");
  console.log(req.body);  // Log request đầu vào

  let { dbName, phone, partner, vietlott, fromDate, toDate } = req.body;

  const sites = ['VTEL', 'VNP', 'MBF'];
  let allRows = [];

  try {
    const dbsToQuery = dbName === 'all' ? sites : [dbName];

    for (const site of dbsToQuery) {
      let conn;
      try {
        console.log(`\n===== ĐANG KẾT NỐI SITE: ${site} =====`);

        conn = await getConnection(site);

        let whereClause = 'WHERE 1=1';
        const binds = {};

        if (phone) { 
          whereClause += ' AND ca.phone_number = :phone';
          binds.phone = phone; 
        }

        if (partner) { 
          whereClause += ' AND ot.partner_transaction = :partner';
          binds.partner = partner; 
        }

        if (vietlott) { 
          whereClause += ' AND ot.vietlott_transaction = :vietlott';
          binds.vietlott = vietlott; 
        }

        if (fromDate) {
          whereClause += ' AND pt.created_at >= TO_DATE(:fromDate, \'DD-MM-YYYY HH24:MI\')';
          binds.fromDate = fromDate;
        }

        if (toDate) {
          whereClause += ' AND pt.created_at <= TO_DATE(:toDate, \'DD-MM-YYYY HH24:MI\')';
          binds.toDate = toDate;
        }

        // LOG SQL + BINDS
        console.log("\n===== SQL QUERY =====");
        console.log(whereClause);
        console.log("BINDS:", binds);

        const sql = `
          SELECT
            ca.phone_number AS TKDT,
            to_char(pt.created_at,'dd/mm/yyyy hh24:mi:ss') AS tg_thanhtoan,
            pt.TO_PAY_AMOUNT AS so_tientt,
            pt.PAYMENT_STATUS AS tt_thanhtoan,
            pt.PAYMENT_METHOD AS kenh_thanhtoan,
            ot.partner_transaction AS ma_doitac,
            ot.vietlott_transaction AS ma_vietlott,
            CASE 
              WHEN t.VT_ID1 IS NULL THEN 'Không xuất vé'
              ELSE t.VT_ID1
            END AS tt_xuatve,
            CASE 
              WHEN  t.VT_ID1 IS NOT NULL AND rf.STATUS IS NULL THEN  NULL
              WHEN rf.STATUS IS NULL THEN 'Chưa hoàn tiền'
              WHEN rf.STATUS ='SUCCESS' THEN 'Đã hoàn tiền ' || rf.REFUND_METHOD
              WHEN rf.STATUS ='WAIT' THEN 'Chờ hoàn tiền ' || rf.REFUND_METHOD
              ELSE 'Trạng thái khởi tạo hoàn tiền'
            END AS tt_hoantien,
            rf.ACTUAL_REFUND_TO_PAYER AS tien_hoan
          FROM vietlott_sms_1.order_table@production ot
          LEFT JOIN vietlott_sms_1.payment_transaction@production pt ON ot.id = pt.order_id
          LEFT JOIN vietlott_sms_1.order_item@production oi ON oi.order_id = ot.id
          LEFT JOIN vietlott_sms_1.ticket@production t ON t.order_item_id = oi.id
          LEFT JOIN vietlott_sms_1.refund_transaction@production rf ON ot.id = rf.order_id
          LEFT JOIN vietlott_sms_1.customer_account@production ca ON ca.id = ot.customer_id
          ${whereClause}
          ORDER BY pt.created_at DESC
        `;

        const result = await conn.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        console.log(`→ SITE ${site} trả về: ${result.rows.length} dòng`);

        const rowsWithSite = result.rows.map(r => ({ ...r, SITE: site }));
        allRows.push(...rowsWithSite);

      } catch (err) {
        console.log(`❌ LỖI SITE ${site}:`, err.message);
      } finally {
        if (conn) try { await conn.close(); } catch (e) {}
      }
    }

    console.log("\n===== TỔNG SỐ DÒNG TRẢ VỀ =====");
    console.log(allRows.length);

    res.json({ success: true, rows: allRows });

  } catch (err) {
    console.log("❌ LỖI TỔNG QUÁT:", err.message);
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
