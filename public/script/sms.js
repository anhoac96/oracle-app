function showCheckSMS() {
  document.getElementById('content').innerHTML = `
    <div>
      <h2>Tra cứu SMS</h2>

        <div class="select-wrapper">
    <label><b>Chọn Site:</b></label>
    <select id="sms_db">
      <option value="VTEL">VTEL</option>
      <option value="VNP">VNP</option>
      <option value="MBF">MBF</option>
    </select><br><br>
    </div>


      <label><b>Số điện thoại:</b></label>
      <input type="text" id="sms_phone">

      <label><b>Ngày:</b></label>
      <input type="date" id="sms_date">

      <button onclick="loadSMS()">Tra cứu</button>
    </div>

    <br>
    <div id="sms_result"></div>
  `;
}

async function loadSMS() {
  const phone = document.getElementById("sms_phone").value.trim();
  const date = document.getElementById("sms_date").value;
  const db = document.getElementById("sms_db").value;

  if (!phone && !date) {
    alert("Nhập SĐT hoặc ngày");
    return;
  }

  const resultDiv = document.getElementById("sms_result");
  resultDiv.innerHTML = `<b style="color:blue">Đang tra cứu...</b>`;

  try {
    const params = new URLSearchParams({ phone, date, db });
    const res = await fetch(`/api/sms?${params.toString()}`);
    const data = await res.json();

    if (!data || data.length === 0) {
      resultDiv.innerHTML = `<b style="color:red">Không có dữ liệu</b>`;
      return;
    }

    // ✅ SORT SAU KHI CÓ DỮ LIỆU
    data.sort((a, b) => new Date(b.CREATED_AT) - new Date(a.CREATED_AT));

    let html = `
      <table border="1" cellpadding="5">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Nội dung</th>
            <th>SĐT</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(r => {
      html += `
        <tr>
          <td>${r.CREATED_AT_STR}</td>
          <td>${r.CONTENT}</td>
          <td>${r.PHONE_NUMBER}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    resultDiv.innerHTML = html;

  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<b style="color:red">Lỗi gọi API</b>`;
  }
}
