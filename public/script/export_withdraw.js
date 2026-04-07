function showWithdrawRequest() {
  document.getElementById('content').innerHTML = `
    <h2>Tra cứu yêu cầu rút tiền</h2>

       <div class="select-wrapper">
    <label><b>Chọn Site:</b></label>
    <select id="dbNameWithdraw">
      <option value="VTEL">VTEL</option>
      <option value="VNP">VNP</option>
      <option value="MBF">MBF</option>
      <option value="all">Tất cả</option>
    </select><br><br>
    </div>

    <div class="form-group">
      <label><b>Từ ngày (CREATED_AT):</b></label>
      <input type="date" id="createdFrom" class="input-box"/>
    </div>

    <div class="form-group">
      <label><b>Đến ngày:</b></label>
      <input type="date" id="createdTo" class="input-box"/>
    </div>

    <div class="select-wrapper">
      <label><b>Trạng thái:</b></label>
      <select id="status">
        <option value="">-- Tất cả --</option>
        <option value="PENDING">PENDING</option>
        <option value="PROCESSING">PROCESSING</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="REJECT">REJECT</option>
      </select>
    </div>

</div>


    <button class="btn-primary" onclick="searchWithdraw()">Tra cứu</button>
    <button class="btn-primary" onclick="downloadWithdrawCSV()">Xuất CSV</button>

    <div id="withdrawResult"></div>
  `;
}

async function searchWithdraw() {
  const createdFrom = document.getElementById('createdFrom').value;
  const createdTo = document.getElementById('createdTo').value;
  const status = document.getElementById('status').value;
  const dbName = document.getElementById('dbNameWithdraw').value;

  const resultDiv = document.getElementById('withdrawResult');
  resultDiv.innerHTML = "Đang tra cứu...";

  try {
    const dbNames = dbName === 'all' ? ['VTEL', 'VNP', 'MBF'] : [dbName];

    const res = await fetch('/withdraw-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createdFrom, createdTo, status, dbNames })
    });

    const data = await res.json();

    if (!data.success) {
      resultDiv.innerHTML = `<p style="color:red;">${data.error}</p>`;
      return;
    }

    if (!data.rows.length) {
      resultDiv.innerHTML = "<p>Không có dữ liệu.</p>";
      return;
    }

    
    let html = `<table><tr>`;
    Object.keys(data.rows[0]).forEach(col => html += `<th>${col}</th>`);
    html += `</tr>`;

    data.rows.forEach(r => {
      html += `<tr>`;
      for (const c in r) html += `<td>${r[c] ?? ''}</td>`;
      html += `</tr>`;
    });

    html += `</table>`;
    resultDiv.innerHTML = html;

  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi kết nối: ${err.message}</p>`;
  }
}



function downloadWithdrawCSV() {
  const createdFrom = document.getElementById('createdFrom').value;
  const createdTo = document.getElementById('createdTo').value;
  const status = document.getElementById('status').value;
  const dbName = document.getElementById('dbNameWithdraw').value;

  // Nếu chọn tất cả, truyền danh sách tất cả các site
  const dbNames = (dbName === 'all') ? ['VTEL', 'VNP', 'MBF'] : [dbName];

  // Tạo URL với các tham số
  const params = new URLSearchParams({
    createdFrom,
    createdTo,
    status,
    dbNames: JSON.stringify(dbNames)  
  });

  // Mở cửa sổ mới để tải file CSV
  window.open('/withdraw-request-csv?' + params.toString(), '_blank');
}
