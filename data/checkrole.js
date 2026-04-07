const express = require("express");
const router = express.Router();
const { getConnection } = require("../db/dbConnections");
const oracledb = require("oracledb");
const dayjs = require("dayjs");

/**
 * POST /api/truncate-insert
 */
router.post("/truncate-insert", async (req, res) => {
  let conn;
  const db = req.body.db || "VTEL";

  const todayTable = `ROLE_BK_${dayjs().format("YYYYMMDD")}`;
  const yesterdayTable = `ROLE_BK_${dayjs().subtract(1, "day").format("YYYYMMDD")}`;

  try {
    conn = await getConnection(db);

    /* ========= 1. DROP BACKUP HÔM TRƯỚC ========= */
    const dropCheck = await conn.execute(
      `SELECT COUNT(*) CNT FROM USER_TABLES WHERE TABLE_NAME = :t`,
      [yesterdayTable.toUpperCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (dropCheck.rows[0].CNT > 0) {
      await conn.execute(`DROP TABLE ${yesterdayTable} PURGE`);
    }

    /* ========= 2. CHECK BACKUP HÔM NAY ========= */
    const checkToday = await conn.execute(
      `SELECT COUNT(*) CNT FROM USER_TABLES WHERE TABLE_NAME = :t`,
      [todayTable.toUpperCase()],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkToday.rows[0].CNT === 0) {
      /* ===== CREATE BACKUP ===== */
      await conn.execute(`
        CREATE TABLE ${todayTable} AS
        SELECT * FROM ROLE_BK
      `);
    } else {
      /* ===== UPDATE BACKUP ===== */
      await conn.execute(`TRUNCATE TABLE ${todayTable}`);
      await conn.execute(`
        INSERT INTO ${todayTable}
        SELECT * FROM ROLE_BK
      `);
    }

    /* ========= 3. TRUNCATE ROLE_BK ========= */
    await conn.execute(`TRUNCATE TABLE ROLE_BK`);

    /* ========= 4. INSERT DỮ LIỆU MỚI ========= */
    const insertSQL = `
      INSERT INTO ROLE_BK (USERNAME, DESCRIPTION, PERMISSIONS)
      SELECT 
        a.USERNAME,
        c.DESCRIPTION,
        d.PERMISSIONS
      FROM BACK_OFFICE_MEMBER a
      JOIN BACK_OFFICE_ROLE_ASSIGNMENT b ON a.ID = b.MEMBER_ID
      JOIN BACK_OFFICE_ROLE c ON b.ROLE_ID = c.ID
      JOIN BACK_OFFICE_ROLE_PERMISSIONS d
        ON c.ID = d.BACK_OFFICE_ROLE_ENTITY_ID
    `;

    await conn.execute(insertSQL, [], { autoCommit: true });

    /* ========= 5. RETURN DATA ========= */
    const result = await conn.execute(
      `SELECT * FROM ROLE_BK ORDER BY USERNAME`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      message: "Backup + truncate + insert thành công",
      backupTable: todayTable,
      total: result.rows.length,
      rows: result.rows
    });

  } catch (err) {
    console.error("❌ truncate-insert error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

/**
 * GET /api/updaterole
 */
router.get("/updaterole", async (req, res) => {
  let conn;
  const db = req.query.db || "VTEL";

  try {
    conn = await getConnection(db);

    const updateroleSQL = `
      SELECT 
        rb.USERNAME,
        'Dữ liệu quyền cũ' AS TITLE_OLD,
        rb.PERMISSIONS AS QUYEN_OLD,
        'Dữ liệu quyền mới' AS TITLE_NEW,
        d.USERNAME AS USERNAME_NEW,
        d.PERMISSIONS AS QUYEN_NEW
      FROM ROLE_BK rb
      FULL OUTER JOIN (
        SELECT a.USERNAME, d.PERMISSIONS
        FROM BACK_OFFICE_MEMBER a
        JOIN BACK_OFFICE_ROLE_ASSIGNMENT b ON a.ID = b.MEMBER_ID
        JOIN BACK_OFFICE_ROLE c ON b.ROLE_ID = c.ID
        JOIN BACK_OFFICE_ROLE_PERMISSIONS d
          ON c.ID = d.BACK_OFFICE_ROLE_ENTITY_ID
      ) d
        ON rb.USERNAME = d.USERNAME
       AND rb.PERMISSIONS = d.PERMISSIONS
      WHERE rb.PERMISSIONS IS NULL
         OR d.PERMISSIONS IS NULL
      ORDER BY rb.USERNAME
    `;

    const result = await conn.execute(
      updateroleSQL,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, rows: result.rows });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
