function showcheckwithdraw() {
  document.getElementById('content').innerHTML = `
    <h2>Nguyên nhân rút tiền lỗi</h2>

    <div class="select-wrapper">
      <label><b>Chọn Site:</b></label>
      <select id="dbName">
        <option value="VTEL">VTEL</option>
        <option value="VNP">VNP</option>
        <option value="MBF">MBF</option>
        <option value="all">Tất cả</option>
      </select>
    </div>
    <br>

    <label><b>Mã rút tiền (nhiều mã cách nhau bằng dấu phẩy):</b></label>
    <span class="hint" style="font-size:12px;color:#777;">
      Ví dụ: WITHDRAW-NAPAS-50683876-20251121070854878
    </span><br>
   <input id="code" type="text"/><br>

    <button onclick="checkwithdraw()" class="primary-btn">Tra cứu</button>

    <div id="result" style="margin-top:20px;"></div>
  `;
}

async function checkwithdraw() {
  const dbName = document.getElementById('dbName').value;
  const codeRaw = document.getElementById('code').value.trim();
  const resultDiv = document.getElementById('result');

  if (!codeRaw) {
    resultDiv.innerHTML = '<p style="color:red;">Vui lòng nhập ít nhất 1 mã rút tiền!</p>';
    return;
  }

  // Tách thành từng dòng
  const codeList = codeRaw
    .split('\n')
    .map(x => x.trim())
    .filter(x => x !== '');

  const code = codeList.join(','); 
  resultDiv.innerHTML = `
    <p style="color:blue;">Đang tra cứu, vui lòng đợi...</p>
  `;

  try {
    const res = await fetch('/check-withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbName, code })
    });

    const data = await res.json();

    if (data.success && data.rows.length > 0) {

      let html = `
      <table border="1" cellpadding="6" cellspacing="0" style="
        border-collapse: collapse;
        background: #fff;
      ">
        <thead style="background:#007bff; color:white;">
          <tr>
      `;

      // header
      for (const col in data.rows[0]) {
        html += `<th>${col}</th>`;
      }

      html += `</tr></thead><tbody>`;

      // body
      data.rows.forEach(r => {
        html += `<tr>`;
        for (const c in r) {
          html += `<td>${r[c] ?? ''}</td>`;
        }
        html += `</tr>`;
      });

      html += `</tbody></table>`;

      resultDiv.innerHTML = html;

    } else {
      resultDiv.innerHTML = '<p style="color:red;">Không tìm thấy dữ liệu phù hợp.</p>';
    }

  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi: ${err.message}</p>`;
  }
}
