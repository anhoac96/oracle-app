const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const oracledb = require("oracledb");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const { getConnection } = require("../db/dbConnections");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Upload file
const upload = multer({ dest: "uploads/" });

// Hàm lấy ngày
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

//
// 1) ĐỌC FILE EXCEL LẤY LENH_RT
//
function parseExcelLenhRT(filePath) {
  const workbook = xlsx.readFile(filePath);
  const results = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    rows.forEach((r, idx) => {
      let lenhRt =
        r["LENH_RT"] ||
        r["LENH RT"] ||
        r["Lenh_Rt"] ||
        r["lenh_rt"] ||
        "";

      if (!lenhRt) return;

      lenhRt = String(lenhRt).trim();
      console.log(`🔹 Dòng ${idx + 1}: LENH_RT="${lenhRt}"`);

      results.push({ LENH_RT: lenhRt });
    });
  });

  return results;
}

//
// 2) INSERT INTO TEMP TABLE
//
async function importWithdrawTemp(conn, tableName, rows) {
  try {
    await conn.execute(`TRUNCATE TABLE ${tableName}`);
  } catch (err) {
    if (err.errorNum === 942) { // table không tồn tại
      console.log(`⚠ Bảng ${tableName} chưa tồn tại, tạo mới...`);
      await conn.execute(`
        CREATE TABLE ${tableName} (
          LENH_RT VARCHAR2(100)
        )
      `);
    } else {
      throw err;
    }
  }

  const sql = `INSERT INTO ${tableName} (LENH_RT) VALUES (:LENH_RT)`;

  for (const r of rows) {
    await conn.execute(sql, [r.LENH_RT]);
    console.log(`   ➕ Insert LENH_RT="${r.LENH_RT}"`);
  }
  await conn.commit();
}

async function queryWithdrawRequest(conn, lenhRt, tableName) {
  const sql = `
    WITH 
    S0 AS (
      SELECT 
        id AS WITHDRAW_REQUEST_ID,
        ID || '-' || CODE AS LENH_RUT_TIEN,
        STATUS,
        TRANSACTION_RESULT
      FROM WITHDRAW_REQUEST
    )
    SELECT WITHDRAW_REQUEST_ID, LENH_RUT_TIEN, STATUS, TRANSACTION_RESULT
    FROM S0 a 
    INNER JOIN ${tableName} b ON a.LENH_RUT_TIEN = b.LENH_RT
    WHERE b.LENH_RT = :LENH_RT
  `;

  const result = await conn.execute(sql, [lenhRt]);
  return result.rows;
}



//
// 4) EXPORT TO EXCEL
//
async function exportToExcel(data, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("KET_QUA");

  sheet.columns = [
    { header: "WITHDRAW_REQUEST_ID", key: "WITHDRAW_REQUEST_ID", width: 20 },
    { header: "LENH_RUT_TIEN", key: "LENH_RUT_TIEN", width: 30 },
    { header: "STATUS", key: "STATUS", width: 15 },
    { header: "TRANSACTION_RESULT", key: "TRANSACTION_RESULT", width: 20 },
    { header: "SITE", key: "SITE", width: 10 },
  ];

  data.forEach((row) => sheet.addRow(row));

  await workbook.xlsx.writeFile(outputPath);
}

router.post("/import-withdraw", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Không có file Excel" });

    const withdrawList = parseExcelLenhRT(req.file.path);
    if (withdrawList.length === 0)
      return res.status(400).json({ error: "Không có LENH_RT hợp lệ" });

    let finalData = [];

    const sites = [
      { name: "VNP", table: "TMP_WITHDRAW_REQUEST_VNP" },
      { name: "VTEL", table: "TMP_WITHDRAW_REQUEST_VTEL" },
      { name: "MBF", table: "TMP_WITHDRAW_REQUEST_MBF" },
    ];

    for (const site of sites) {
      console.log(`\n========== SITE ${site.name} ==========`);

      try {
        const conn = await getConnection(site.name);

        await importWithdrawTemp(conn, site.table, withdrawList);

        for (const r of withdrawList) {
          // Truyền tên bảng vào hàm queryWithdrawRequest
          const rows = await queryWithdrawRequest(conn, r.LENH_RT, site.table);

          rows.forEach(row =>
            finalData.push({
              WITHDRAW_REQUEST_ID: row.WITHDRAW_REQUEST_ID,
              LENH_RUT_TIEN: row.LENH_RUT_TIEN,
              STATUS: row.STATUS,
              TRANSACTION_RESULT: row.TRANSACTION_RESULT,
              SITE: site.name
            })
          );
        }

        await conn.close();
      } catch (err) {
        console.log(`❌ Lỗi site ${site.name}:`, err.message);
      }
    }  // <-- Đóng vòng lặp for tại đây

    try { fs.unlinkSync(req.file.path); } catch {}

    return res.json({
      success: true,
      data: finalData
    });

  } catch (err) {
    console.error("❌ Lỗi API:", err);
    return res.status(500).json({ error: "Lỗi xử lý" });
  }
});

module.exports = router;
