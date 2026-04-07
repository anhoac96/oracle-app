const express = require("express");
const router = express.Router();
const { getConnection } = require("../db/dbConnections");

router.get("/sms", async (req, res) => {
  try {
    const phone = req.query.phone?.trim() || null;
    const p_date = req.query.date || null;   // ⚠️ đổi tên
    const db = req.query.db || "VTEL";

    console.log("➡️ PARAMS:", { phone, p_date, db });

    if (!phone && !p_date) {
      return res.status(400).json({ error: "Cần nhập SĐT hoặc ngày" });
    }

    const conn = await getConnection(db);

    let sql = `
      SELECT
        CREATED_AT,
        TO_CHAR(CREATED_AT,'dd/mm/yyyy hh24:mi:ss') AS CREATED_AT_STR,
        CONTENT,
        PHONE_NUMBER
      FROM (
        SELECT CREATED_AT, CONTENT, PHONE_NUMBER FROM sms_content
        UNION ALL
        SELECT CREATED_AT, CONTENT, PHONE_NUMBER FROM sms_content_hist@dbhist
      )
      WHERE 1=1
    `;

    const binds = {};

    if (phone) {
      sql += ` AND PHONE_NUMBER = :phone`;
      binds.phone = phone;
    }

    if (p_date) {
      sql += ` AND TRUNC(CREATED_AT) = TO_DATE(:p_date,'yyyy-mm-dd')`;
      binds.p_date = p_date;
    }

    console.log("📌 SQL:", sql);
    console.log("📌 BINDS:", binds);

    const result = await conn.execute(sql, binds, {
      outFormat: 4002
    });

    await conn.close();

    console.log("✅ ROWS:", result.rows.length);

    return res.json(result.rows);

  } catch (err) {
    console.error("❌ SMS API ERROR:", err);
    return res.status(500).json({
      error: "Lỗi server",
      detail: err.message
    });
  }
});

module.exports = router;
