// data/script.js
const express = require('express');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const router = express.Router(); 


const SSH_CONFIG = {
  host: '172.16.13.103',
  username: 'root',
  port: 22,
  password: 'noc@2021'
};

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


// ✅ Route chính
router.post('/run-script', async (req, res) => {
  try {
    const { script } = req.body || {};
    console.log(`📩 Nhận yêu cầu chạy script: ${script}`);

    const result = await runRemoteScript(script);
    res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    console.error('❌ Lỗi không mong muốn:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
