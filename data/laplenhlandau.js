const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function runLaplenhlandau() {
  try {
    // Kết nối SSH tới server
    await ssh.connect({
      host: '172.16.13.103',
      username: 'root',
      port: 22,
      password: 'noc@2021'
    });

    // Chạy script laplenhlandau
    const result = await ssh.execCommand('/root/noc/laplenhlandau/bc_lenh_tt.sh');

    ssh.dispose(); // đóng kết nối

    // Trả về kết quả
    return { success: true, output: result.stdout || result.stderr };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { runLaplenhlandau };
