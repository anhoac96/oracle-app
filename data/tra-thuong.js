const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../db/dbConnections');
const { Parser } = require('json2csv');


// =======================
// Helper: parse array an toàn
// =======================
function parseArray(val) {
  if (!val) return [];

  if (Array.isArray(val)) {
    return val.map(v => String(v).trim()).filter(Boolean);
  }

  if (typeof val === 'string') {
    if (val.startsWith('[')) {
      try {
        return JSON.parse(val).map(v => String(v).trim()).filter(Boolean);
      } catch {
        return [];
      }
    }
    return val.split(',').map(v => v.trim()).filter(Boolean);
  }

  return [];
}


// =======================
// API menus
// =======================
router.get('/menus', (req, res) => {
  res.json([
    { id: "checkReward", name: "Tra cứu trúng thưởng" }
  ]);
});


// =======================
// API check reward (paging)
// =======================
router.post('/check-reward', async (req, res) => {

  let {
    dbName,
    phone,
    vtId1,
    channel,
    draws,
    rewardStatus,
    gameType,
    fromDate,
    toDate,
    page = 1,
    pageSize = 50
  } = req.body;

  page = parseInt(page);
  pageSize = parseInt(pageSize);

  const offset = (page - 1) * pageSize;
  const maxRow = page * pageSize;

  const sites = (!dbName || dbName === 'all')
    ? ['VTEL', 'VNP', 'MBF']
    : [dbName];

  const channelArr = parseArray(channel);
  const rewardStatusArr = parseArray(rewardStatus);
  const gameTypeArr = parseArray(gameType);
  const drawArr = parseArray(draws);

  let allRows = [];
  let totalRecords = 0;

  try {

    for (const site of sites) {

      let conn;

      try {
        conn = await getConnection(site);

        let whereClause = 'WHERE 1=1';
        const binds = {};

        if (phone) {
          whereClause += ' AND b.PHONE_NUMBER = :phone';
          binds.phone = phone;
        }

        if (vtId1) {
          whereClause += ' AND t.VT_ID1 = :vtId1';
          binds.vtId1 = vtId1;
        }

        if (fromDate) {
          whereClause += " AND a.CREATED_AT >= TO_DATE(:fromDate,'YYYY-MM-DD')";
          binds.fromDate = fromDate;
        }

        if (toDate) {
          whereClause += " AND a.CREATED_AT <= TO_DATE(:toDate,'YYYY-MM-DD')";
          binds.toDate = toDate;
        }

        if (channelArr.length) {
          whereClause += ` AND (${channelArr.map((_, i) =>
            channelArr[i] === 'VNT'
              ? `a.REWARD_PAYMENT_CHANNEL LIKE :ch${i}`
              : `a.REWARD_PAYMENT_CHANNEL = :ch${i}`
          ).join(' OR ')})`;

          channelArr.forEach((ch, i) => {
            binds[`ch${i}`] = ch === 'VNT' ? `%${ch}%` : ch;
          });
        }

        if (drawArr.length) {
          whereClause += ` AND a.DRAW_ID IN (${drawArr.map((_, i) => `:d${i}`).join(',')})`;
          drawArr.forEach((d, i) => binds[`d${i}`] = d);
        }

        if (rewardStatusArr.length) {
          whereClause += ` AND a.REWARD_STATUS IN (${rewardStatusArr.map((_, i) => `:rs${i}`).join(',')})`;
          rewardStatusArr.forEach((s, i) => binds[`rs${i}`] = s);
        }

        if (gameTypeArr.length) {
          whereClause += ` AND t.GAME_TYPE IN (${gameTypeArr.map((_, i) => `:gt${i}`).join(',')})`;
          gameTypeArr.forEach((g, i) => binds[`gt${i}`] = g);
        }

        // ===== COUNT =====
        const countSql = `
          SELECT COUNT(*) AS TOTAL
          FROM WINNING_RESULT a
          JOIN TICKET t ON a.TICKET_ID = t.ID
          JOIN CUSTOMER_ACCOUNT b ON t.CUSTOMER_ACCOUNT_ID = b.ID
          ${whereClause}
        `;

        const countResult = await conn.execute(countSql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        totalRecords += countResult.rows[0].TOTAL;

        // ===== PAGING QUERY =====
        const sql = `
          SELECT *
          FROM (
            SELECT
              TO_CHAR(a.CREATED_AT,'dd/mm/yyyy hh24:mi:ss') AS CREATED_AT,
              TO_CHAR(a.UPDATED_AT,'dd/mm/yyyy hh24:mi:ss') AS UPDATED_AT,
              a.DRAW_ID,
              t.VT_ID1,
              b.PHONE_NUMBER,
              t.GAME_TYPE,
              a.REWARD_STATUS,
              a.REWARD_PAYMENT_CHANNEL,
              a.WINNING_AMOUNT,
              TO_CHAR(a.PAYMENT_AT,'dd/mm/yyyy hh24:mi:ss') AS PAYMENT_AT,
              a.PAY_TICKET_BGT_STATUS,
              ROW_NUMBER() OVER (ORDER BY a.CREATED_AT DESC) rn
            FROM WINNING_RESULT a
            JOIN TICKET t ON a.TICKET_ID = t.ID
            JOIN CUSTOMER_ACCOUNT b ON t.CUSTOMER_ACCOUNT_ID = b.ID
            ${whereClause}
          )
          WHERE rn > :offset AND rn <= :maxRow
        `;

        binds.offset = offset;
        binds.maxRow = maxRow;

        const result = await conn.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const rowsWithSite = result.rows.map(r => ({
          ...r,
          SITE: site
        }));

        allRows.push(...rowsWithSite);

      } finally {
        if (conn) {
          try { await conn.close(); } catch {}
        }
      }
    }

    res.json({
      success: true,
      rows: allRows,
      total: totalRecords,
      page,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize)
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// =======================
// API download CSV
// =======================
router.get('/download-csv', async (req, res) => {

  const { dbName, phone, vtId1, channel, draws, rewardStatus, gameType, fromDate, toDate } = req.query;

  const sites = (!dbName || dbName === 'all')
    ? ['VTEL','VNP','MBF']
    : [dbName];

  const channelArr = parseArray(channel);
  const rewardStatusArr = parseArray(rewardStatus);
  const gameTypeArr = parseArray(gameType);
  const drawArr = parseArray(draws);

  let allRows = [];

  try {

    for (const site of sites) {

      let conn;

      try {

        conn = await getConnection(site);

        let sql = `
          SELECT
            TO_CHAR(a.CREATED_AT,'dd/mm/yyyy hh24:mi:ss') AS CREATED_AT,
            a.DRAW_ID,
            t.VT_ID1,
            b.PHONE_NUMBER,
            t.GAME_TYPE,
            a.WINNING_AMOUNT,
            a.REWARD_PAYMENT_CHANNEL,
            a.REWARD_STATUS
          FROM WINNING_RESULT a
          JOIN TICKET t ON a.TICKET_ID = t.ID
          JOIN CUSTOMER_ACCOUNT b ON t.CUSTOMER_ACCOUNT_ID = b.ID
          WHERE 1=1
        `;

        const binds = {};

        if (phone) {
          sql += ` AND b.PHONE_NUMBER = :phone`;
          binds.phone = phone;
        }

        if (vtId1) {
          sql += ` AND t.VT_ID1 = :vtId1`;
          binds.vtId1 = vtId1;
        }

        if (fromDate) {
          sql += " AND a.CREATED_AT >= TO_DATE(:fromDate,'YYYY-MM-DD')";
          binds.fromDate = fromDate;
        }

        if (toDate) {
          sql += " AND a.CREATED_AT <= TO_DATE(:toDate,'YYYY-MM-DD')";
          binds.toDate = toDate;
        }

        if (channelArr.length) {
          sql += ` AND (${channelArr.map((_, i) =>
            channelArr[i] === 'VNT'
              ? `a.REWARD_PAYMENT_CHANNEL LIKE :ch${i}`
              : `a.REWARD_PAYMENT_CHANNEL = :ch${i}`
          ).join(' OR ')})`;

          channelArr.forEach((ch, i) => {
            binds[`ch${i}`] = ch === 'VNT' ? `%${ch}%` : ch;
          });
        }

        if (drawArr.length) {
          sql += ` AND a.DRAW_ID IN (${drawArr.map((_, i) => `:d${i}`).join(',')})`;
          drawArr.forEach((d, i) => binds[`d${i}`] = d);
        }

        if (rewardStatusArr.length) {
          sql += ` AND a.REWARD_STATUS IN (${rewardStatusArr.map((_, i) => `:rs${i}`).join(',')})`;
          rewardStatusArr.forEach((s, i) => binds[`rs${i}`] = s);
        }

        if (gameTypeArr.length) {
          sql += ` AND t.GAME_TYPE IN (${gameTypeArr.map((_, i) => `:gt${i}`).join(',')})`;
          gameTypeArr.forEach((g, i) => binds[`gt${i}`] = g);
        }

        sql += ` ORDER BY a.CREATED_AT DESC`;

        const result = await conn.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        const rowsWithSite = result.rows.map(r => ({ ...r, SITE: site }));
        allRows.push(...rowsWithSite);

      } finally {
        if (conn) {
          try { await conn.close(); } catch {}
        }
      }
    }

    if (!allRows.length) {
      return res.status(400).send('Không có dữ liệu để xuất CSV');
    }

    const today = new Date();
    const filename = `DANH_SACH_TRA_THUONG_${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}.csv`;

    const parser = new Parser({ fields: Object.keys(allRows[0]) });
    const csv = parser.parse(allRows);

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv); // fix lỗi font Excel

  } catch (err) {
    res.status(500).send('Lỗi server: ' + err.message);
  }
});


module.exports = router;