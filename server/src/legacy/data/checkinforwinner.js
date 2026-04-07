const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

router.get('/api/winner-info', async (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: "Thiếu tham số date (ddmmyyyy)" });
    }

    const sql = `
WITH   
bs AS (
   SELECT TICKET_ID, PANELS,
     CASE 
     	WHEN BET_TYPE='SYSTEM6' THEN 'Mua vé lẻ'
     	ELSE  'Mua vé bao' ||' - '|| BET_TYPE
     END KIEU_CHOI
   FROM vietlott_sms_1.G655_TICKET@production 
   UNION ALL 
   SELECT TICKET_ID, PANELS,
        CASE 
     	WHEN BET_TYPE='SYSTEM6' THEN 'Mua vé lẻ'
     	ELSE  'Mua vé bao' ||' - '|| BET_TYPE
     END KIEU_CHOI
   FROM vietlott_sms_1.G645_TICKET@production 
   UNION ALL 
   SELECT TICKET_ID, PANELS, 'Mua vé lẻ' AS KIEU_CHOI
   FROM vietlott_sms_1.GMAX3D_PLUS_TICKET@production 
   UNION ALL 
   SELECT TICKET_ID, PANELS,
    CASE 
     	WHEN BET_TYPE='STRAIGHT' THEN 'Mua vé lẻ'
     	ELSE  'Mua vé bao' ||' - '|| BET_TYPE
     END KIEU_CHOI
   FROM vietlott_sms_1.GMAX3D_PRO_TICKET@production
   UNION ALL 
   SELECT TICKET_ID, PANELS, 'Mua vé lẻ' AS KIEU_CHOI
   FROM vietlott_sms_1.GMAX3D_TICKET@production
   UNION ALL 
   SELECT TICKET_ID, PANELS,
   CASE 
     	WHEN BET_TYPE='G535_STRAIGHT' THEN 'Mua vé lẻ'
     	ELSE  'Mua vé bao' ||' - '|| BET_TYPE
     END KIEU_CHOI
   FROM vietlott_sms_1.G535_TICKET@production
),

jp AS (
   SELECT * FROM (
       SELECT 'G645' AS game, CODE, DRAW_AT, JACKPOT_AMOUNT, JACKPOT_COUNT,
              NULL AS JACKPOT2AMOUNT, NULL AS JACKPOT2COUNT
       FROM vietlott_sms_1.G645_DRAW@production
       UNION ALL 
       SELECT 'G655', CODE, DRAW_AT, JACKPOT_AMOUNT, JACKPOT_COUNT,
              JACKPOT2AMOUNT, JACKPOT2COUNT
       FROM vietlott_sms_1.G655_DRAW@production 
       UNION ALL 
       SELECT 'G3D_PLUS', CODE, DRAW_AT, JACKPOT_AMOUNT, JACKPOT_COUNT,
              NULL, NULL
       FROM vietlott_sms_1.G3D_PLUS_DRAW@production 
       UNION ALL 
       SELECT 'G3D_PRO', CODE, DRAW_AT, JACKPOT_AMOUNT, JACKPOT_COUNT,
              NULL, NULL
       FROM vietlott_sms_1.G3D_PRO_DRAW@production 
       UNION ALL 
       SELECT 'G535', CODE, DRAW_AT, JACKPOT_AMOUNT, JACKPOT_COUNT,
              NULL, NULL
       FROM vietlott_sms_1.G535_DRAW@production
   )
   WHERE (NVL(JACKPOT_COUNT,0) > 0 OR NVL(JACKPOT2COUNT,0) > 0)
)
SELECT 
    TO_CHAR(r.CREATED_AT,'dd/mm/yyyy') AS NGAY,
    cp.GENDER AS GIOITINH,
    cp.DATE_OF_BIRTH AS NAMSINH,
    t.game_type AS SANPHAM,
    r.DRAW_ID AS KYQUAY,
    CASE 
    WHEN NVL(jp.JACKPOT_COUNT,0) > 0 
         AND r.WINNING_AMOUNT = jp.JACKPOT_AMOUNT / jp.JACKPOT_COUNT
         AND jp.game LIKE 'G3D%' 
    THEN 'Giải Đặc biệt'
    WHEN NVL(jp.JACKPOT_COUNT,0) > 0 
         AND r.WINNING_AMOUNT = jp.JACKPOT_AMOUNT / jp.JACKPOT_COUNT
         AND jp.game IN ('G645','G655') 
    THEN 'Jackpot'
    WHEN NVL(jp.JACKPOT_COUNT,0) > 0 
         AND r.WINNING_AMOUNT = (jp.JACKPOT_AMOUNT / jp.JACKPOT_COUNT)
         AND jp.game = 'G535' 
    THEN 'Giải Độc Đắc'
    WHEN NVL(jp.JACKPOT2COUNT,0) > 0 
         AND r.WINNING_AMOUNT = jp.JACKPOT2AMOUNT / jp.JACKPOT2COUNT
    THEN 'Jackpot 2'
END AS GIAI_THUONG,
    r.WINNING_AMOUNT AS TRUOC_THUE, 
    r.PAYMENT_AMOUNT AS SAU_THUE,
    t.CREATED_AT AS THOI_GIAN_MUA_VE,
    bs.PANELS AS BO_SO,
    DECODE(ts.EMBEDDED_CHANEL, NULL, 'APP', ts.EMBEDDED_CHANEL) AS KENH_MUA_VE,
    bs.KIEU_CHOI AS HINH_THUC_MUA,
    t.ticket_cost AS GIA_TRI_VE,
    pr.NAME AS NOI_DANG_KY_TKDT,
    ca.active_at AS THOI_GIAN_KICH_HOAT_TKDT,
    t.VT_ID1 AS MA_VE,
    pm.PAYMENT_METHOD KENH_THANH_TOAN
FROM vietlott_sms_1.result_file_detail@production r
LEFT JOIN vietlott_sms_1.ticket@production t ON r.TICKET_ID=t.id
LEFT JOIN vietlott_sms_1.order_item@production oi ON t.order_item_id=oi.id
LEFT JOIN vietlott_sms_1.ticket_order_sms@production ts ON oi.TICKET_SMS_ID=ts.id
LEFT JOIN vietlott_sms_1.payment_transaction@production pm ON oi.order_id=pm.order_id
LEFT JOIN bs ON r.ticket_id=bs.ticket_id
LEFT JOIN vietlott_sms_1.customer_account@production ca ON r.CUSTOMER_ACCOUNT_ID=ca.id
LEFT JOIN vietlott_sms_1.customer_profile@production cp ON ca.PROFILE_ID = cp.id
LEFT JOIN vietlott_sms_1.province@production pr ON cp.REWARD_ADDRESS = pr.CODE
LEFT JOIN jp ON r.DRAW_ID = jp.CODE AND r.game_type=jp.game
WHERE TO_CHAR(r.CREATED_AT,'ddmmyyyy') = :p_date
  AND r.WINNING_AMOUNT >= 1000000000
  AND r.game_type != 'GBINGO'
`;

    const SITES = ["VTEL", "VNP", "MBF"];
    const allResults = [];

    await Promise.all(
        SITES.map(async (site) => {
            let conn = null;
            try {
                conn = await getConnection(site);
                const result = await conn.execute(sql, { p_date: date });
                
            result.rows.forEach(row => {
    allResults.push({
        SITE: site, 
        ...Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k.toUpperCase(), v])
        )
    });
});


            } catch (err) {
                console.error(`Lỗi ở site ${site}:`, err.message);
            } finally {
                if (conn) await conn.close();
            }
        })
    );

    if (allResults.length === 0) {
        return res.json({ message: "Không có dữ liệu ở cả 3 site" });
    }

    res.json(allResults);
});

module.exports = router;
