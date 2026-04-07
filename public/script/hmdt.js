function showCheckHmdt() {
  document.getElementById('content').innerHTML = `
    <h2>Xuất danh sách HMDT</h2>

    <div class="select-wrapper">
    <label><b>Chọn Site:</b></label>
    <select id="dbName">
      <option value="VTEL">VTEL</option>
      <option value="VNP">VNP</option>
      <option value="MBF">MBF</option>
      <option value="all">Tất cả</option>
    </select><br><br>
    </div>

    <label><b>SĐT:</b></label>
    <input id="phone" type="text"><br>

    <label><b>Ngày bắt đầu:</b></label>
    <input type="date" id="fromDate"><br>

    <label><b>Ngày kết thúc:</b></label>
    <input type="date" id="toDate"><br><br>

    <button onclick="checkHmdt()">Tra cứu</button>
    <button onclick="downloadhmdtCSV()">Xuất CSV</button>

    <div id="resultHmdt"></div>
  `;
}

async function checkHmdt() {
  const dbName = document.getElementById('dbName').value;
  const phone = document.getElementById('phone').value.trim();
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;

  const resultDiv = document.getElementById('resultHmdt');

   // Kiểm tra xem có ít nhất một trường thông tin được nhập không
      if (!phone && !fromDate && !toDate) {
        resultDiv.innerHTML = '<p style="color:red;">Vui lòng nhập ít nhất một trường để tra cứu!</p>';
        return;
      }
      
  resultDiv.innerHTML = 'Đang tra cứu...';

  try {
    const res = await fetch('/check-hmdt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbName, phone, fromDate, toDate })
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

function downloadhmdtCSV() {
  const dbName = document.getElementById('dbName').value;
  const phone = document.getElementById('phone').value;
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;

  if (!phone && !fromDate && !toDate) {
    alert("Vui lòng nhập đủ thông tin!");
    return;
  }

  const query = new URLSearchParams({ dbName, phone, fromDate, toDate });
  window.open('/download-hmdt-csv?' + query.toString(), '_blank');
}
