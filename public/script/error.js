function showcheckerror() {
  document.getElementById('content').innerHTML = `
    <h2>Nguyên nhân trả thưởng lỗi</h2>

    <div class="select-wrapper">
    <label><b>Chọn Site:</b></label>
    <select id="dbName">
      <option value="VTEL">VTEL</option>
      <option value="VNP">VNP</option>
      <option value="MBF">MBF</option>
      <option value="all">Tất cả</option>
    </select><br><br>
    </div>

    <label><b>VTID1:</b></label>
    <span class="hint">Tra cứu nhiều VT_ID1 bằng dấu phẩy</span><br>
    <input id="vtid1" type="text"/><br>

    <button onclick="checkerror()">Tra cứu</button>
    <div id="result"></div>
  `;
}

async function checkerror() {
  const dbName = document.getElementById('dbName').value;
  const vtid1 = document.getElementById('vtid1').value.trim();
  const resultDiv = document.getElementById('result');

  if (!vtid1) {
    resultDiv.innerHTML = '<p style="color:red;">Vui lòng nhập VTID1!</p>';
    return;
  }

  resultDiv.innerHTML = 'Đang tra cứu...';

  try {
    const res = await fetch('/check-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbName, vtid1 })
    });

    const data = await res.json();

    if (data.success && data.rows.length > 0) {
      let html = '<table><tr>';
      for (const col in data.rows[0]) html += `<th>${col}</th>`;
      html += '</tr>';

      data.rows.forEach(r => {
        html += '<tr>';
        for (const c in r) html += `<td>${r[c] ?? ''}</td>`;
        html += '</tr>';
      });

      html += '</table>';
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = '<p>Không có dữ liệu phù hợp.</p>';
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi: ${err.message}</p>`;
  }
}
