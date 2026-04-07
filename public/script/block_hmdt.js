function showCheckHmdtblock() {
  document.getElementById('content').innerHTML = `
    <h2>Check block HMDT</h2>

    <div class="form-grid-3">

      <div class="form-item">
        <label>Chọn Site:</label>
        <select id="dbName" class="input-box">
          <option value="VTEL">VTEL</option>
          <option value="VNP">VNP</option>
          <option value="MBF">MBF</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      <div class="form-item">
        <label>SĐT:</label>
        <input id="phone" type="text" class="input-box">
      </div>

    </div>

    <div class="btn-group">
      <button class="btn-primary" onclick="checkHmdtblock()">Tra cứu</button>
    </div>

    <div id="resultHmdt" style="margin-top:20px;"></div>
  `;
}

async function checkHmdtblock() {
  const dbName = document.getElementById('dbName').value;
  const phone = document.getElementById('phone').value.trim();

  const resultDiv = document.getElementById('resultHmdt');

   // Kiểm tra xem có ít nhất một trường thông tin được nhập không
      if (!phone) {
        resultDiv.innerHTML = '<p style="color:red;">Vui lòng nhập ít nhất một trường để tra cứu!</p>';
        return;
      }
      
  resultDiv.innerHTML = 'Đang tra cứu...';

  try {
    const res = await fetch('/check-hmdt-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbName, phone})
    });

    const data = await res.json();

    if (data.success && data.rows.length > 0) {
      let html = '<table><tr>';

      // Header
      for (const col in data.rows[0]) {
        html += `<th>${col}</th>`;
      }
      html += '</tr>';

      // Rows
      data.rows.forEach(r => {
        html += '<tr>';
        for (const c in r) html += `<td>${r[c] ?? ''}</td>`;
        html += '</tr>';
      });

      html += '</table>';

      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = '<p>Không có dữ liệu.</p>';
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi: ${err.message}</p>`;
  }
}

