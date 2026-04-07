function showcheckpayment() {
  document.getElementById('content').innerHTML = `
    <h2>Tra cứu thanh toán mua vé</h2>

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
    <input id="phone" type="text"/><br>

    <label><b>Mã đối tác:</b></label>
    <input id="partner" type="text"/><br>

    <label><b>Mã Vietlott:</b></label>
    <input id="vietlott" type="text"/><br>

    <label><b>Ngày giờ:</b></label>
    <input type="text" id="fromDate" placeholder="DDMMYYYY HH24:MI" />
    -
    <input type="text" id="toDate" placeholder="DDMMYYYY HH24:MI" /><br><br>

    <button onclick="checkpayment()">Tra cứu</button>
    <div id="result"></div>
  `;

  flatpickr("#fromDate", {
    enableTime: true,
    dateFormat: "dmY H:i",
    time_24hr: true
  });

  flatpickr("#toDate", {
    enableTime: true,
    dateFormat: "dmY H:i",
    time_24hr: true
  });
}

function showcheckpayment() {
  document.getElementById('content').innerHTML = `
    <h2>Tra cứu thanh toán mua vé</h2>

    <div class="select-wrapper">
      <label><b>Chọn Site:</b></label>
      <select id="dbName">
        <option value="VTEL">VTEL</option>
        <option value="VNP">VNP</option>
        <option value="MBF">MBF</option>
        <option value="all">Tất cả</option>
      </select>
      <br><br>
    </div>

    <label><b>SĐT:</b></label>
    <input id="phone" type="text"/><br>

    <label><b>Mã đối tác:</b></label>
    <input id="partner" type="text"/><br>

    <label><b>Mã Vietlott:</b></label>
    <input id="vietlott" type="text"/><br>

    <label><b>Ngày giờ:</b></label>
    <input type="text" id="fromDate" placeholder="DDMMYYYY HH24:MI" />
    -
    <input type="text" id="toDate" placeholder="DDMMYYYY HH24:MI" /><br><br>

    <button onclick="checkpayment()">Tra cứu</button>
    <div id="result"></div>
  `;

  // === DATE PICKER CHO NHẬP TAY + CHỌN LỊCH ===
  flatpickr("#fromDate", {
    enableTime: true,
    dateFormat: "d/m/Y H:i",
    time_24hr: true,
    allowInput: true,
    parseDate: (datestr) => parseInputDate(datestr)
  });

  flatpickr("#toDate", {
    enableTime: true,
    dateFormat: "d/m/Y H:i",
    time_24hr: true,
    allowInput: true,
    parseDate: (datestr) => parseInputDate(datestr)
  });
}

/* ===============================
   HÀM CHUYỂN ĐỔI INPUT NGÀY GIỜ
   =============================== */
function parseInputDate(str) {
  const d = str.replace(/\D/g, ""); // bỏ hết ký tự ngoài số

  // Nếu chưa đủ ký tự -> trả về ngày hiện tại
  if (d.length < 12) return new Date();

  return new Date(
    d.slice(4, 8),                  // Năm
    Number(d.slice(2, 4)) - 1,     // Tháng
    d.slice(0, 2),                  // Ngày
    d.slice(8, 10),                 // Giờ
    d.slice(10, 12)                 // Phút
  );
}

/* ===============================
   CHUẨN HÓA NGÀY: DDMMYYYY HH:MI
   =============================== */
function normalizeDateForSend(str) {
  if (!str) return "";

  const d = str.replace(/\D/g, "");

  if (d.length !== 12) return "";

  return (
    d.slice(0, 2) +                // DD
    d.slice(2, 4) +                // MM
    d.slice(4, 8) +                // YYYY
    " " +
    d.slice(8, 10) +               // HH
    ":" +
    d.slice(10, 12)                // MI
  );
}

/* ===============================
    FORMAT NGÀY HIỆN TẠI
   =============================== */
function nowOracleFormat() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  return `${dd}${mm}${yyyy} ${hh}:${mi}`;
}

/* ===============================
         GỌI API CHÍNH
   =============================== */
async function checkpayment() {
  const dbName = document.getElementById('dbName').value;
  const phone = document.getElementById('phone').value.trim();
  const partner = document.getElementById('partner').value.trim();
  const vietlott = document.getElementById('vietlott').value.trim();

  let fromDate = document.getElementById('fromDate').value.trim();
  let toDate = document.getElementById('toDate').value.trim();

  const resultDiv = document.getElementById('result');

  // Nếu tất cả đều trống
  if (!phone && !partner && !vietlott && !fromDate && !toDate) {
    resultDiv.innerHTML = `<p style="color:red;">Nhập ít nhất 1 trường!</p>`;
    return;
  }

  // ❌ Không tự điền ngày — chỉ chuẩn hóa nếu nhập
  if (fromDate) fromDate = normalizeDateForSend(fromDate);
  else fromDate = "";

  if (toDate) toDate = normalizeDateForSend(toDate);
  else toDate = "";

  resultDiv.innerHTML = "Đang tra cứu...";

  try {
    const res = await fetch('/check-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbName, phone, partner, fromDate, toDate, vietlott })
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
      resultDiv.innerHTML = "<p>Không có dữ liệu.</p>";
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi: ${err.message}</p>`;
  }
}
