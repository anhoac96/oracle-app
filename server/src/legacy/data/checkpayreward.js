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

// ===============================
// Upload config
// ===============================
const upload = multer({ dest: "uploads/" });

// ===============================
// Utils
// ===============================
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

// ===============================
// Parse Excel chỉ lấy MA_VE
// ===============================
function parseExcelOnlyMaVe(filePath) {
  const workbook = xlsx.readFile(filePath);
  const results = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    rows.forEach((row) => {
      const normalizedRow = {};
      Object.keys(row).forEach((k) => {
        normalizedRow[k.trim().toUpperCase().replace(/\s+/g, "_")] = row[k];
      });

      let mv = normalizedRow["MA_VE"];
      if (!mv) return;

      mv = String(mv).trim().toUpperCase();

      if (mv.length === 16) {
        results.push({ MA_VE: mv });
      }
    });
  });

  return results;
}

// ===============================
// Insert bulk vào bảng temp
// ===============================
async function importMaVeToTemp(conn, tableName, rows) {
  await conn.execute(`TRUNCATE TABLE ${tableName}`);

  const binds = rows.map((r) => [r.MA_VE]);

  await conn.executeMany(
    `INSERT INTO ${tableName} (MA_VE) VALUES (:1)`,
    binds
  );

  await conn.commit();
}

// ===============================
// Query dữ liệu từng site
// ===============================
async function querySite(conn, tableName) {
  const sql = `
    SELECT 
      t.vt_id1 AS MA_VE,
      wr.game_type,
      wr.reward_payment_status AS TT_CHITRA,
      wr.pay_ticket_bgt_status AS TT_HMBH,
      wr.reward_status AS TT_TT,
      wr.reward_payment_channel AS KENH_TT
    FROM ticket t
    LEFT JOIN winning_result wr ON t.id = wr.ticket_id
    WHERE t.vt_id1 IN (SELECT MA_VE FROM ${tableName})
  `;

  const result = await conn.execute(sql);
  return result.rows;
}

// ===============================
// Export Excel
// ===============================
async function exportToExcel(data, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("KET_QUA");

  sheet.columns = [
    { header: "MA_VE", key: "MA_VE", width: 20 },
    { header: "GAME_TYPE", key: "GAME_TYPE", width: 15 },
    { header: "TT_CHITRA", key: "TT_CHITRA", width: 15 },
    { header: "TT_HMBH", key: "TT_HMBH", width: 15 },
    { header: "TT_TT", key: "TT_TT", width: 15 },
    { header: "KENH_TT", key: "KENH_TT", width: 15 },
    { header: "SITE", key: "SITE", width: 10 },
  ];

  data.forEach((row) => sheet.addRow(row));

  await workbook.xlsx.writeFile(outputPath);
}

// ===============================
// API Import Excel
// ===============================
router.post("/import-excel", upload.single("file"), async (req, res) => {
  let uploadedFilePath = null;
  let outputFile = null;

  try {
    if (!req.file)
      return res.status(400).json({ error: "Không có file Excel" });

    uploadedFilePath = req.file.path;

    const maVeList = parseExcelOnlyMaVe(uploadedFilePath);

    if (maVeList.length === 0)
      return res.status(400).json({ error: "Không có MA_VE hợp lệ" });

    let finalData = [];

    const sites = [
      { name: "VNP", table: "TMP_MA_VE_VNP" },
      { name: "VTEL", table: "TMP_MA_VE_VTEL" },
      { name: "MBF", table: "TMP_MA_VE_MBF" },
    ];

    // ===== Loop từng site =====
    for (const s of sites) {
      let conn;
      try {
        conn = await getConnection(s.name);

        await importMaVeToTemp(conn, s.table, maVeList);

        const rows = await querySite(conn, s.table);

        rows.forEach((r) =>
          finalData.push({
            MA_VE: r.MA_VE,
            GAME_TYPE: r.GAME_TYPE,
            TT_CHITRA: r.TT_CHITRA,
            TT_HMBH: r.TT_HMBH,
            TT_TT: r.TT_TT,
            KENH_TT: r.KENH_TT,
            SITE: s.name,
          })
        );

      } catch (err) {
        console.log(`❌ Lỗi site ${s.name}:`, err.message);
      } finally {
        if (conn) await conn.close();
      }
    }

    // ===== Export =====
    const today = getTodayString();
    const fileName = `NOC_CHECK_TANG_HMBH_${today}.xlsx`;
    outputFile = path.join(process.cwd(), fileName);

    await exportToExcel(finalData, outputFile);

    // ===== Xóa file upload =====
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
      console.log("🗑 Đã xóa file upload");
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    return res.sendFile(outputFile, (err) => {
      if (!err && outputFile && fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
        console.log("🗑 Đã xóa file export");
      }
    });

  } catch (err) {
    console.error("❌ Lỗi API:", err);

    // Xóa file upload nếu lỗi
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    if (outputFile && fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }

    return res.status(500).json({ error: "Lỗi xử lý" });
  }
});

module.exports = router;