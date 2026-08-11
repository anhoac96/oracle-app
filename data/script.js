// data/script.js
const express = require('express');
const { NodeSSH } = require('node-ssh');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config();
const ssh = new NodeSSH();

const router = express.Router();

// ✅ [SECURITY] SSH config đọc từ biến môi trường, KHÔNG hardcode
const SSH_CONFIG = {
  host: process.env.SSH_HOST,
  username: process.env.SSH_USER || 'root',
  port: parseInt(process.env.SSH_PORT || '22'),
  password: process.env.SSH_PASSWORD,
};

if (!SSH_CONFIG.host || !SSH_CONFIG.password) {
  console.warn('⚠️ [SECURITY] SSH_HOST hoặc SSH_PASSWORD chưa được cấu hình trong .env');
}

// ✅ [SECURITY] Middleware xác thực internal API token
function requireInternalToken(req, res, next) {
  const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;
  if (!INTERNAL_TOKEN) {
    // Nếu chưa cấu hình token → block toàn bộ để an toàn
    return res.status(503).json({ success: false, error: 'Endpoint chưa được cấu hình bảo mật. Liên hệ admin.' });
  }

  const token = req.headers['x-internal-token'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!token || token !== INTERNAL_TOKEN) {
    console.warn(`[SECURITY] Truy cập /run-script bị từ chối. IP: ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized: Token không hợp lệ.' });
  }
  next();
}

const SCRIPTS = { 
  laplenhlandau: '/root/noc/laplenhlandau/bc_lenh_tt.sh',
  ruttien: '/root/noc/rut-tien/rt.sh',
  dsmomo: '/root/noc/dsthanhtoan/momo.sh',
  dsvtelpay: '/root/noc/dsthanhtoan/viettelpay.sh',
  dszalopay: '/root/noc/dsthanhtoan/zalopay.sh',
  jackpot: '/root/noc/jackpot/jackpot.sh',
  jackpotkq: '/root/noc/jackpot/jackpot2.sh',
  mttrathuong: '/root/noc/NOC_THONGKE/MT_trathuong/mt-trathuong.sh',
  cycle: '/root/noc/cycle/cycle.sh',
  hmbh: '/root/noc/noc-ktds/noc-hmbh.sh',
  tamhoa: '/root/noc/spec_monitor/tamhoa.sh',
  chia535: 'python3 /root/noc/check_sodu/checkChi535.py',
  checkpdc_drc: 'python3 /root/noc/NOC_CHECK/checkPDC_DRC/checkPDC_DRC.py',
  chiviettelpay: '/root/noc/noc-ktds/chiviettelpay.sh',
  mttrungthuong535: '/root/noc/tra-thuong/mt-trathuong535.sh',
  trungthuong: '/root/noc/NOC_THONGKE/wt/wt_final.py'
};

async function runRemoteScript(scriptName) {
  const scriptPath = SCRIPTS[scriptName];
  if (!scriptPath) {
    return { success: false, error: `Script "${scriptName}" không tồn tại!` };
  }

  try {
    console.log(`🔌 Đang kết nối SSH để chạy: ${scriptPath}`);
    await ssh.connect(SSH_CONFIG);

    // Chạy đúng script (KHÔNG ép bash vào tất cả)
    let commandToRun = scriptPath;

    // Nếu là file .sh → thêm bash
    if (scriptPath.endsWith('.sh')) {
      commandToRun = `bash ${scriptPath}`;
    }

    const result = await ssh.execCommand(commandToRun);
    ssh.dispose();

    return { success: true, output: result.stdout || result.stderr || 'Đã chạy xong script.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


// ✅ Route chính - BẮT BUỘC có token xác thực
router.post('/run-script', requireInternalToken, async (req, res) => {
  try {
    const { script } = req.body || {};
    console.log(`📩 [${req.ip}] Nhận yêu cầu chạy script: ${script}`);

    const result = await runRemoteScript(script);
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    console.error('❌ Lỗi không mong muốn:', err);
    res.status(500).json({ success: false, error: 'Lỗi server nội bộ.' });
  }
});


module.exports = router;
