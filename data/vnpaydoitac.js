// vnpay_reconcile.js (full fix)
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const oracledb = require("oracledb");
const { getConnection } = require("../db/dbConnections");
const ExcelJS = require("exceljs");
const fetch = require("node-fetch");
const FormData = require("form-data");
const { exec } = require("child_process");

const upload = multer({ dest: "uploads/" });
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// ============================================================
// HÀM CHUẨN HÓA SỐ TIỀN
function parseMoney(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;

  let text = String(value).trim();
  text = text.replace(/[^\d.,-]/g, "");

  if (text.includes(".") && text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",") && !text.includes(".")) {
    text = text.replace(/,/g, "");
  }

  const num = parseFloat(text);
  return isNaN(num) ? 0 : num;
}

// ============================================================
// HÀM ĐỌC EXCEL
function parseExcel(filePath) {
  console.log("📘 [Excel] Đang đọc file:", filePath);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`📘 [Excel] Tổng số dòng: ${rows.length}`);

  return rows.map((r) => {
    const rawMoney = r["Số tiền hóa đơn"] ?? r["SO_TIEN_HD"] ?? "";
    const money = parseMoney(rawMoney);

    const nhaCungCapRaw = r["Nhà cung cấp"] ?? r["NHA_CUNG_CAP"] ?? "";
    const nhaCungCap = String(nhaCungCapRaw).replace(/^\d+-/, "").trim();

    return {
      MA_GD: r["Mã GD"] ?? r["MA_GD"] ?? "",
      MA_BANK: r["Mã Bank"] ?? r["MA_BANK"] ?? "",
      MA_KH: r["Mã khách hàng"] ?? r["MA_KH"] ?? "",
      NHA_CUNG_CAP: nhaCungCap,
      SO_TIEN_HD: money,
      TRACE_BANK: r["Trace Bank"] ?? r["TRACE_BANK"] ?? "",
      TRACE_NCC: r["Trace NCC"] ?? r["TRACE_NCC"] ?? "",
      THOI_GIAN: r["Thời gian GD"] ?? r["THOI_GIAN"] ?? ""
    };
  });
}

// ============================================================
// HÀM ĐỌC CSV
function parseCSV(filePath) {
  console.log("📗 [CSV] Đang đọc file:", filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((x) => x.trim() !== "");

  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  console.log(`📗 [CSV] Header: ${headers.join(" | ")}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = cols[idx]?.trim() ?? ""));

    const rawMoney = obj["Số tiền hóa đơn"] ?? obj["SO_TIEN_HD"] ?? "";
    const money = parseMoney(rawMoney);

    const nhaCungCapRaw = obj["Nhà cung cấp"] ?? obj["NHA_CUNG_CAP"] ?? "";
    const nhaCungCap = String(nhaCungCapRaw).replace(/^\d+-/, "").trim();

    rows.push({
      MA_GD: obj["Mã GD"] ?? obj["MA_GD"] ?? "",
      MA_BANK: obj["Mã Bank"] ?? obj["MA_BANK"] ?? "",
      MA_KH: obj["Mã khách hàng"] ?? obj["MA_KH"] ?? "",
      NHA_CUNG_CAP: nhaCungCap,
      SO_TIEN_HD: money,
      TRACE_BANK: obj["Trace Bank"] ?? obj["TRACE_BANK"] ?? "",
      TRACE_NCC: obj["Trace NCC"] ?? obj["TRACE_NCC"] ?? "",
      THOI_GIAN: obj["Thời gian GD"] ?? obj["THOI_GIAN"] ?? ""
    });
  }

  console.log(`📗 [CSV] Tổng số dòng parse thành công: ${rows.length}`);
  return rows;
}

// ============================================================
// HELPER ORACLE / ExcelJS / Telegram / Discord
async function createReconcileTable(conn, tableName) {
  const sql = `
    BEGIN
      EXECUTE IMMEDIATE '
        CREATE TABLE ${tableName} (
          MA_GD VARCHAR2(100),
          MA_BANK VARCHAR2(50),
          MA_KH VARCHAR2(50),
          NHA_CUNG_CAP VARCHAR2(200),
          SO_TIEN_HD NUMBER,
          TRACE_BANK VARCHAR2(100),
          TRACE_NCC VARCHAR2(100),
          THOI_GIAN VARCHAR2(50)
        )
      ';
    EXCEPTION WHEN OTHERS THEN
      IF SQLCODE != -955 THEN RAISE; END IF;
    END;
  `;
  await conn.execute(sql);
}

async function insertExcelToSite(conn, tableName, rows) {
  await conn.execute(`TRUNCATE TABLE ${tableName}`);
  const sql = `
    INSERT INTO ${tableName} (
      MA_GD, MA_BANK, MA_KH, NHA_CUNG_CAP,
      SO_TIEN_HD, TRACE_BANK, TRACE_NCC, THOI_GIAN
    ) VALUES (
      :MA_GD, :MA_BANK, :MA_KH, :NHA_CUNG_CAP,
      :SO_TIEN_HD, :TRACE_BANK, :TRACE_NCC, :THOI_GIAN
    )
  `;
  for (const r of rows) {
    await conn.execute(sql, r);
  }
  await conn.commit();
}

async function sendToTelegram(filePath) {
  try {
    const botToken = "2020768804:AAFt6pxFTlc_GcKHHP9O8g8r3UPBymgA0g0";
    const chatId = "-1001747170599";
    const caption = "Kết quả đối soát VNPAY với file đối tác gửi";
    if (!fs.existsSync(filePath)) return;

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    form.append("document", fs.createReadStream(path.resolve(filePath)));

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: form,
      headers: form.getHeaders()
    });
    const data = await resp.json();
    console.log("sendToTelegram:", data && data.ok ? "OK" : "FAILED", data);
  } catch (err) {
    console.error("sendToTelegram error:", err.message);
  }
}

async function sendToDiscord(filePath) {
  try {
    const webhookUrl = "https://discord.com/api/webhooks/1376392337256874055/S3ZMQPY2R9HStnFXYZahRPlkW2n1z1Rojk4xGkjpU58BFE6EYq0eBv4jOv6i4EFeGfkd";
    if (!fs.existsSync(filePath)) return;

    const form = new FormData();
    form.append("payload_json", JSON.stringify({ content: "Kết quả tra soát GD VNPAY với đối tác" }));
    form.append("file", fs.createReadStream(filePath), path.basename(filePath));

    const resp = await fetch(webhookUrl, { method: "POST", body: form });
    if (!resp.ok) console.warn("sendToDiscord failed:", await resp.text());
    else console.log("sendToDiscord: OK");
  } catch (err) {
    console.error("sendToDiscord error:", err.message);
  }
}

// ============================================================
// HÀM SCP FILE SANG MÁY KHÁC + SSH GỌI send.py (KHÔNG TRUYỀN THAM SỐ)
async function sendFileToRemoteServer(filePath) {
  return new Promise((resolve, reject) => {
    const remoteHost = "172.16.13.103";
    const remoteUser = "root";
    const remotePass = "noc@2021";
    const remotePort = 22;

    const remoteBaseDir = "/root/noc/vnpay_result";
    const remoteFileDir = `${remoteBaseDir}/file`;

    const fileName = path.basename(filePath);

    const cmd = `
sshpass -p '${remotePass}' scp -P ${remotePort} \
"${filePath}" \
${remoteUser}@${remoteHost}:"${remoteFileDir}/" && \
sshpass -p '${remotePass}' ssh -p ${remotePort} ${remoteUser}@${remoteHost} \
"python3 ${remoteBaseDir}/send.py"
    `.trim();

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ SCP/SSH error:", stderr || err.message);
        return reject(err);
      }
      console.log("✅ Đã gửi file & chạy send.py trên server remote");
      resolve(stdout);
    });
  });
}

// ============================================================
// MAIN API — IMPORT + ĐỐI SOÁT 3 SITE
router.post("/import-csv-3-site", upload.single("file"), async (req, res) => {
  console.log("========================================");
  console.log("📥 BẮT ĐẦU IMPORT FILE 3 SITE...");
  console.log("========================================");

  if (!req.file) return res.status(400).json({ error: "Vui lòng chọn file để import." });

  console.log("📄 File nhận:", req.file.originalname);
  console.log("📁 Lưu tạm tại:", req.file.path);

  const ext = path.extname(req.file.originalname).toLowerCase();
  let rows = [];

  try {
    if (ext === ".xlsx" || ext === ".xls") rows = parseExcel(req.file.path);
    else if (ext === ".csv") rows = parseCSV(req.file.path);
    else return res.status(400).json({ error: "File không hợp lệ! Chỉ hỗ trợ CSV, XLSX, XLS." });

    console.log(`📊 Tổng số dòng cần đối soát: ${rows.length}`);

    const sites = ["VTEL", "VNP", "MBF"];
    const tableNameMap = {
      VTEL: "VN_PAY_RECONCILE_VTEL",
      VNP: "VN_PAY_RECONCILE_VNP",
      MBF: "VN_PAY_RECONCILE_MBF",
    };

    for (const site of sites) {
      console.log(`----------------------------------------`);
      console.log(`🔁 IMPORT -> SITE: ${site}`);
      const conn = await getConnection(site);
      const table = tableNameMap[site];
      console.log(`   → Tạo/chuẩn bị table ${table}`);
      await createReconcileTable(conn, table);
      console.log(`   → Insert ${rows.length} dòng vào ${table}`);
      await insertExcelToSite(conn, table, rows);
      await conn.close();
      console.log(`   → Hoàn tất import cho ${site}`);
    }

    // SQL đối soát giữ nguyên
    const reconSQL = (tableName) => `
      WITH S0 AS (
        SELECT vnp.UPDATED_AT Ngay,
               vnp.TRANSACTION_REF_TYPE,
               vnp.PARTNER_TRANSACTION_ID,
               vnp.CONFIRM_TRANSACTION_ID,
               vnp.AMOUNT,
               CASE
                 WHEN vnp.transaction_ref_type = 'DEBIT_PURCHASE_TICKET' THEN t.issue_result
                 WHEN vnp.transaction_ref_type = 'DEBIT_COMBO' THEN cpt.status
                 ELSE gr.pay_status
               END tt_ve_or_gift,
               CASE
                 WHEN vnp.transaction_ref_type = 'DEBIT_PURCHASE_TICKET' THEN t.vt_id1
                 WHEN vnp.transaction_ref_type = 'DEBIT_COMBO' THEN cpt.transaction_code
                 ELSE g.gift_code
               END mave_or_giftcode,
               VIETLOTT_TRANSACTION
        FROM vietlott_sms_1.vnpay_payment_transaction@production vnp
        LEFT JOIN vietlott_sms_1.order_table@production ot ON vnp.order_id=ot.id
        LEFT JOIN vietlott_sms_1.order_item@production oi ON vnp.order_id=oi.order_id
        LEFT JOIN vietlott_sms_1.ticket@production t ON oi.id=t.order_item_id
        LEFT JOIN vietlott_sms_1.gift_group@production gr ON vnp.order_id=gr.order_id
        LEFT JOIN vietlott_sms_1.gift@production g ON gr.id=g.gift_group_id
        LEFT JOIN vietlott_sms_1.combo_payment_transaction@production cpt ON vnp.order_id=cpt.order_id
      )
      SELECT
        b.MA_GD AS "Mã GD",
        b.MA_BANK AS "Mã Bank",
        b.MA_KH  AS "Mã khách hàng",
        b.NHA_CUNG_CAP AS "Nhà cung cấp",
        b.SO_TIEN_HD AS "Số tiền hóa đơn",
        b.TRACE_BANK AS "Trace Bank",
        b.TRACE_NCC AS "Trace NCC",
        b.THOI_GIAN AS "Thời gian GD",
        CASE
          WHEN mave_or_giftcode IS NULL THEN 'Không xuất vé'
          WHEN a.CONFIRM_TRANSACTION_ID != b.MA_GD AND mave_or_giftcode IS NOT NULL THEN 'Không xuất vé'
          ELSE mave_or_giftcode
        END AS "NOC_CHECK"
      FROM S0 a
      INNER JOIN ${tableName} b
        ON a.CONFIRM_TRANSACTION_ID = b.MA_GD
        OR a.VIETLOTT_TRANSACTION = b.TRACE_NCC
    `;

    console.log("🔎 Bắt đầu chạy đối soát...");
    let merged = [];
    for (const site of sites) {
      console.log(`   → Đối soát site: ${site}`);
      const conn = await getConnection(site);
      const result = await conn.execute(reconSQL(tableNameMap[site]));
      console.log(`     → Số dòng trả về: ${result.rows.length}`);
      merged.push(...result.rows);
      await conn.close();
    }

    // Xuất Excel kết quả
    console.log("💾 Xuất file Excel kết quả...");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");

    if (merged.length > 0) {
      const headers = Object.keys(merged[0]);
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true };
      merged.forEach((r) => sheet.addRow(Object.values(r)));

      const moneyCol = headers.findIndex((h) => h.toLowerCase().includes("số tiền"));
      if (moneyCol >= 0) sheet.getColumn(moneyCol + 1).numFmt = "#,##0";

      sheet.columns.forEach((col) => {
        let maxLength = 0;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? String(cell.value).length : 10;
          if (len > maxLength) maxLength = len;
        });
        col.width = maxLength < 15 ? 15 : maxLength;
      });
    } else {
      sheet.addRow(["Không có dữ liệu trả về"]);
    }

    const d = new Date();
    d.setDate(d.getDate() - 1);
    const outputFile = `vietlot ${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}_NOC_CHECK.xlsx`;

    await workbook.xlsx.writeFile(outputFile);
    console.log("💾 File kết quả tạo:", outputFile);

    await sendToTelegram(outputFile).catch(err => console.warn("Telegram send failed:", err.message));
    await sendToDiscord(outputFile).catch(err => console.warn("Discord send failed:", err.message));
	await sendFileToRemoteServer(outputFile)
	.catch(err => console.warn("Remote send failed:", err.message));

    try { fs.unlinkSync(outputFile); console.log("🧹 Đã xóa file tạm:", outputFile); } catch(e) {}

    res.json({ message: "File đã xử lý và gửi (nếu có dữ liệu)." });

  } catch (err) {
    console.error("❌ Lỗi import/đối soát:", err);
    res.status(500).json({ error: err.message });
  } finally {
    try { fs.unlinkSync(req.file.path); console.log("🧹 Đã xóa file upload tạm."); } catch(e) {}
  }
});

module.exports = router;
