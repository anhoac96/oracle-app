const fs = require('fs');
const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const csv = require('csv-parser');
const multer = require('multer');
const moment = require('moment');
const ExcelJS = require('exceljs');
const { exec } = require('child_process');

const upload = multer({ dest: 'uploads/' });

function log(message) {
  const time = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log(`[${time}] ${message}`);
}

router.get('/menus', (req, res) => {
  res.json([{ id: "dsvnpay", name: "Đối soát VNPAY" }]);
});

router.post('/import-csv', upload.single('csvFile'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Vui lòng tải lên file CSV.' });

  const dbName = req.body.dbName || 'VTEL';
  const p_date_raw = req.body.p_date || null;
  
  // --- GIẢI NGÀY ---
  const p_date = p_date_raw && /^\d{8}$/.test(p_date_raw)
    ? p_date_raw
    : moment().subtract(1, 'days').format('DDMMYYYY');

  let connection = null;

  log(`--- BẮT ĐẦU ĐỐI SOÁT CHO DB: ${dbName}, DATE = ${p_date} ---`);
  log(`Nhận file CSV: ${req.file.originalname}`);

  try {
    log('Đang đọc file CSV...');
    const rows = await readCSV(req.file.path);
    log(`Đọc CSV thành công: ${rows.length} dòng.`);

    log(`Kết nối Oracle DB (${dbName})...`);
    connection = await getConnection(dbName);
    log('Kết nối thành công.');

    log('Đang import CSV vào bảng VNPAY...');
    await importCSVToOracle(connection, rows);
    log('Import CSV vào Oracle hoàn tất.');

    log('Đang chạy đối soát dữ liệu...');
    const reconcileRows = await reconcileData(connection, p_date);
    log(`Đối soát xong: ${reconcileRows.length} dòng.`);

    log('Đang tạo file Excel trong /tmp...');
    const { fileName, filePath } = await exportToXLSX(reconcileRows, dbName, p_date);
    log(`Tạo file thành công: ${filePath}`);

    log('Đang upload file lên OneDrive...');
    try {
      await uploadToOneDriveRclone(filePath, "backup:VHNV-NOC-KTDS/DS-VNPAY", p_date);
      log('Upload OneDrive thành công!');

      // XÓA FILE SAU UPLOAD THÀNH CÔNG
      await fs.promises.unlink(filePath);
      log('Đã xóa file Excel sau upload.');

    } catch (err) {
      log(`⚠️ Lỗi upload OneDrive: ${err.message}`);
    }

    // Xóa bảng VNPAY
    log('Đang truncate bảng VNPAY...');
    await truncateVnpTable(connection);
    log('Đã truncate bảng VNPAY.');

    log('--- HOÀN TẤT QUY TRÌNH ĐỐI SOÁT ---');

    return res.json({
      success: true,
      fileName,
      message: "Đối soát thành công và đã upload lên OneDrive."
    });

  } catch (err) {
    log(`❌ Lỗi xử lý tổng thể: ${err.message}`);
    console.error(err);
    return res.status(500).json({ error: 'Lỗi xử lý: ' + err.message });

  } finally {
    // Xóa file CSV upload
    try { fs.unlinkSync(req.file.path); log('Đã xóa file CSV tạm.'); } catch (e) {}

    // Đóng kết nối Oracle
    try { if (connection) { await connection.close(); log('Đã đóng kết nối Oracle.'); } } catch (e) {}
  }
});

// ============================================================================
// CSV
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// ============================================================================
// IMPORT CSV → ORACLE
async function importCSVToOracle(connection, results) {
  const sql = `
    INSERT INTO vnpay ("RecordType", "RcReconcile", "OrderID", "TranID",
      "TranDate", "PaymentCode", "Amount", "CheckSum")
    VALUES (:RecordType, :RcReconcile, :OrderID, :TranID,
      TO_TIMESTAMP(:TranDate, 'YYYY-MM-DD HH24:MI:SS'),
      :PaymentCode, :Amount, :CheckSum)
  `;

  let count = 0;
  for (const row of results) {
    try {
      const date = moment(row.TranDate, 'DD/MM/YYYY HH:mm:ss', true);
      if (!date.isValid()) continue;

      const binds = {
        RecordType: String(row.RecordType),
        RcReconcile: String(row.RcReconcile),
        OrderID: String(row.OrderID),
        TranID: String(row.TranID),
        TranDate: date.format('YYYY-MM-DD HH:mm:ss'),
        PaymentCode: String(row.PaymentCode),
        Amount: Number(row.Amount),
        CheckSum: String(row.CheckSum),
      };

      await connection.execute(sql, binds);
      count++;
    } catch (e) {
      log(`⚠️ Lỗi INSERT 1 dòng: ${e.message}`);
    }
  }
  await connection.commit();
  log(`Đã import ${count}/${results.length} dòng vào Oracle.`);
}

// ============================================================================
// ĐỐI SOÁT
async function reconcileData(connection, p_date) {
  const sql = `
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
        END mave_or_giftcode
      FROM vietlott_sms_1.vnpay_payment_transaction@production vnp
      LEFT JOIN vietlott_sms_1.order_item@production oi ON vnp.order_id=oi.order_id
      LEFT JOIN vietlott_sms_1.ticket@production t ON oi.id=t.order_item_id
      LEFT JOIN vietlott_sms_1.gift_group@production gr ON vnp.order_id=gr.order_id
      LEFT JOIN vietlott_sms_1.gift@production g ON gr.id=g.gift_group_id
      LEFT JOIN vietlott_sms_1.combo_payment_transaction@production cpt ON vnp.order_id=cpt.order_id
      WHERE to_char(vnp.CREATED_AT,'ddmmyyyy') = :p_date
        AND vnp.STATUS='COMPLETED'
    )
    SELECT "RecordType","RcReconcile","OrderID",
      TO_CHAR(a."TranID") AS "TranID",
      TO_CHAR(TO_TIMESTAMP("TranDate", 'DD-MON-RR HH.MI.SSXFF AM'),'DD/MM/YYYY HH24:MI:SS') AS TranDate,
      "PaymentCode","Amount","CheckSum",
      CASE 
        WHEN tt_ve_or_gift='FAILED' AND c.status='WAIT' THEN 'Chờ hoàn vào ' || REFUND_METHOD
        WHEN tt_ve_or_gift='FAILED' AND c.status='SUCCESS' THEN 'Đã hoàn vào ' || REFUND_METHOD
        ELSE tt_ve_or_gift
      END NOC_CHECK,
      mave_or_giftcode
    FROM vnpay a
    LEFT JOIN S0 b ON a."OrderID"=b.PARTNER_TRANSACTION_ID
    LEFT JOIN vietlott_sms_1.refund_transaction@production c 
      ON a."TranID"=c.transaction_ref_id
     AND to_char(c.CREATED_AT,'ddmmyyyy') = :p_date
     AND c.PAYMENT_METHOD_TYPE='VN_PAY'
  `;

  const rs = await connection.execute(
    sql,
    { p_date },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return rs.rows || [];
}

// ============================================================================
// EXCEL
async function exportToXLSX(data, dbName, p_date) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reconcile');

  const headers = Object.keys(data[0] || {});
  sheet.addRow(headers);
  data.forEach(row => sheet.addRow(headers.map(h => row[h])));

  const fileName = `${moment(p_date, 'DDMMYYYY').format('YYYYMMDD')}_${dbName}_TRANS_DETAIL_VDI_Billing.xlsx`;
  const filePath = `/tmp/${fileName}`;

  await workbook.xlsx.writeFile(filePath);
  return { fileName, filePath };
}

// ============================================================================
// TRUNCATE
async function truncateVnpTable(connection) {
  await connection.execute('TRUNCATE TABLE vnpay');
  await connection.commit();
}

// ============================================================================
// UPLOAD RCLONE
async function uploadToOneDriveRclone(localFilePath, remoteFolder, p_date) {
  return new Promise((resolve, reject) => {
    const day = moment(p_date, 'DDMMYYYY');
    const remotePath = `${remoteFolder}/${day.format('YYYY')}/${day.format('MMYYYY')}/${day.format('DDMMYYYY')}`;

    exec(`rclone mkdir "${remotePath}"`, () => {});

    const cmd = `rclone copy "${localFilePath}" "${remotePath}" --progress`;
    log(`Chạy lệnh: ${cmd}`);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        log(`❌ Lỗi rclone: ${stderr}`);
        return reject(stderr);
      }
      log(stdout);
      resolve(stdout);
    });
  });
}

module.exports = router;
