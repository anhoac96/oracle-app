function showCheckRoleBK() {
  document.getElementById('content').innerHTML = `
    <div>
      <h2>Kiểm tra quyền của tài khoản web admin</h2>

           <div class="select-wrapper">
    <label><b>Chọn Site:</b></label>
    <select id="role_db">
      <option value="VTEL">VTEL</option>
      <option value="VNP">VNP</option>
      <option value="MBF">MBF</option>
    </select><br><br>
    </div>


      <button onclick="truncateInsert()" class="primary">Truncate & Insert</button>
      <button onclick="updaterole()" class="primary">Check quyền sau khi update</button>
    </div>

    <br>
    <div id="role_result"></div>
  `;
}

async function truncateInsert() {
  const db = document.getElementById("role_db").value;
  const resultDiv = document.getElementById("role_result");

  resultDiv.innerHTML = `<b style="color:blue">Đang truncate & insert trên ${db}...</b>`;

  try {
    const res = await fetch("/api/truncate-insert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ db })
    });

    const data = await res.json();

    if (!data.rows || data.rows.length === 0) {
      resultDiv.innerHTML = `<b style="color:red">ROLE_BK không có dữ liệu</b>`;
      return;
    }

    let html = `
      <b style="color:green">${data.message}</b><br>
      <b>Tổng số bản ghi: ${data.total}</b>
      <br><br>

      <table border="1" cellpadding="5">
        <thead>
          <tr>
            <th>USERNAME</th>
            <th>DESCRIPTION</th>
            <th>PERMISSIONS</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.rows.forEach(r => {
      html += `
        <tr>
          <td>${r.USERNAME}</td>
          <td>${r.DESCRIPTION}</td>
          <td>${r.PERMISSIONS}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    resultDiv.innerHTML = html;

  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<b style="color:red">Lỗi khi truncate & insert</b>`;
  }
}


async function updaterole() {
  const db = document.getElementById("role_db").value;
  const resultDiv = document.getElementById("role_result");
  resultDiv.innerHTML = `<b style="color:blue">Đang so sánh dữ liệu trên ${db}...</b>`;

  try {
    const res = await fetch(`/api/updaterole?db=${db}`);
    const data = await res.json();

    if (!data.rows || data.rows.length === 0) {
      resultDiv.innerHTML = `<b style="color:red">Không có dữ liệu khác nhau trên ${db}</b>`;
      return;
    }

    let html = `
      <table border="1" cellpadding="5">
        <thead>
          <tr>
            <th>USERNAME (OLD)</th>
            <th>TITLE_OLD</th>
            <th>PERMISSIONS (OLD)</th>
            <th>TITLE_NEW</th>
            <th>USERNAME (NEW)</th>
            <th>PERMISSIONS (NEW)</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.rows.forEach(r => {
      html += `
        <tr>
          <td style="background-color:#ffe0e0">${r.QUYEN_OLD ? r.USERNAME : ''}</td>
          <td style="background-color:#ffe0e0">${r.TITLE_OLD || ''}</td>
          <td style="background-color:#ffe0e0">${r.QUYEN_OLD || ''}</td>
          <td style="background-color:#e0ffe0">${r.TITLE_NEW || ''}</td>
          <td style="background-color:#e0ffe0">${r.QUYEN_NEW ? r.USERNAME_NEW : ''}</td>
          <td style="background-color:#e0ffe0">${r.QUYEN_NEW || ''}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    resultDiv.innerHTML = html;

  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<b style="color:red">Lỗi khi so sánh dữ liệu</b>`;
  }
}
