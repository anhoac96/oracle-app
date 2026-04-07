const SCRIPT_INFO = {
  laplenhlandau: { title: 'Lập lệnh trả thưởng (chạy lệnh 247)', desc: 'Thống kê lệnh trả thưởng trạng thái đang chờ phê duyệt' },
  ruttien: { title: 'Rút tiền (chạy lệnh 247)', desc: 'Thống kê lệnh rút tiền trạng thái đang chờ phê duyệt' },
  trungthuong: { title: 'Check file trúng thưởng (chạy lệnh 247)', desc: 'Kiểm tra file trúng thưởng' },
  dsmomo: { title: 'Đối soát MOMO (chạy lệnh 247)', desc: 'Đối soát giao dịch thanh toán qua MoMo' },
  dsvtelpay: { title: 'Đối soát ViettelPay (chạy lệnh 247)', desc: 'Đối soát giao dịch thanh toán qua ViettelPay' },
  dszalopay: { title: 'Đối soát ZaloPay (chạy lệnh 247)', desc: 'Đối soát giao dịch thanh toán qua ZaloPay' },
  jackpot: { title: 'Jackpot ước tính (chạy lệnh 247)', desc: 'So sánh giá trị Jackpot so với trang chủ Vietlott' },
  jackpotkq: { title: 'Jackpot kết quả (chạy lệnh 247)', desc: 'So sánh giá trị kết quả so với trang chủ Vietlott' },
  mttrathuong: { title: 'Thống kê MT trúng thưởng (chạy lệnh 247)', desc: 'Thống kê số lượng MT thông báo trúng thưởng' },
  cycle: { title: 'Thống kê cấu hình kỳ quay (chạy lệnh 247)', desc: 'Thống kê số lượng kỳ quay VHNV đã cấu hình' },
  hmbh: { title: 'HMBH (chạy lệnh trên 247)', desc: 'HMBH hiện tại của các site' },
  tamhoa: { title: 'Thống kê tam hoa ngày T-1 (chạy lệnh 247)', desc: 'Thống kê số lần về tam hoa của ngày hôm qua' },
  chia535: { title: 'Thống kê tổng tiền cần trả thưởng (chạy lệnh 247)', desc: 'Thống kê tổng tiền cần trả thưởng cho game 535' },
  checkpdc_drc: { title: 'Check hệ thống sau chuyển PDC-DRC (chạy lệnh 247)', desc: 'NOC kiểm tra hệ thống sau khi chuyển PDC-DRC' },
  chiviettelpay: { title: 'Check trả thưởng ViettelPay WAIT_DISB (chạy lệnh 247)', desc: 'Kiểm tra số lượng và số tiền trả thưởng ViettelPay trạng thái WAIT_DISB' },
  mttrungthuong535: { title: 'Check MT trúng thưởng game 535 (chạy lệnh 247)', desc: 'Kiểm tra số lượng MT gửi trúng thưởng game 535' }
};

function showSingleScript(cmd) {
  const info = SCRIPT_INFO[cmd] || { title: 'Chạy lệnh 247', desc: 'Thực thi script trên hệ thống 247' };

  document.getElementById('content').innerHTML = `
    <h2>${info.title}</h2>
    
    <div class="script-item" style="max-width: 600px; margin: 30px auto; display:block; text-align:center;">
      <h3 style="margin-bottom: 25px; color: var(--primary-color);">Giao diện điều khiển Script</h3>
      <button class="script-btn" style="display:block; width:100%; font-size: 16px; padding: 15px; margin-bottom:15px;" data-script="${cmd}">${info.title}</button>
      <div class="script-desc" style="font-size: 14px; color: #6b7280; line-height: 1.5; text-align:center; margin-bottom: 25px;">${info.desc}</div>
      <div class="script-result" style="text-align:left;"></div>
    </div>
  `;

  const btn = document.querySelector('.script-btn');
  btn.addEventListener('click', async () => {
    const parentItem = btn.closest('.script-item');
    const resultDiv = parentItem.querySelector('.script-result');

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Đang chạy...';

    if (resultDiv) {
      resultDiv.innerHTML = `<p style="color:#888;">⏳ Đang chạy quá trình: <b>${info.title}</b>...</p>`;
    }

    try {
      const res = await fetch('/run-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: cmd })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      if (resultDiv) {
        const data = await res.json();
        const output = data.output || '';

        if (cmd === 'chia535') {
          const filteredLines = output
            .split('\n')
            .filter(line => !line.startsWith('[OK]') && line.trim() !== '');

          if (filteredLines.length > 0) {
            const headers = filteredLines[0].split('|').map(h => h.trim());
            const rows = filteredLines.slice(1).map(line =>
              line.split('|').map(cell => cell.trim())
            );

            let tableHtml = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;"><thead><tr>';
            headers.forEach(h => tableHtml += `<th>${h}</th>`);
            tableHtml += '</tr></thead><tbody>';

            rows.forEach(r => {
              tableHtml += '<tr>';
              r.forEach(cell => tableHtml += `<td>${cell}</td>`);
              tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            resultDiv.innerHTML = tableHtml;
          } else {
            resultDiv.innerHTML = '<p>Không có dữ liệu.</p>';
          }
        } else {
          const cleanOutput = output.trim().replace(/\n/g, '<br>');
          resultDiv.innerHTML = cleanOutput || 'Đã chạy xong script.';
        }
      }

    } catch (err) {
      if (resultDiv) {
        resultDiv.innerHTML = `<p style="color:red;">⚠️ Lỗi khi chạy script</p>`;
      }
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}
