function showMBbank() {
  document.getElementById('content').innerHTML = `
    <div>
      <h2>Danh sách TKDT MBBANK đủ điều kiện (40 khách hàng)</h2>

      <label><b>Chọn ngày Active:</b> (Không chọn mặc định là ngày hôm qua)</label>
      <input type="date" id="p_date" style="width:180px; padding:5px">
      <button onclick="loadMBbank()" class="primary">Tải dữ liệu</button>

      <!-- Nút Copy luôn hiển thị -->
      <button onclick="copyToClipboard()" id="copyButton" 
              style="margin-left:15px; padding:10px; cursor:pointer; opacity:0.5;">
        Copy Dữ Liệu
      </button>
    </div>

    <br>

    <table border="1" width="100%" id="resultTable">
      <thead>
        <tr>
          <th>SĐT</th>
          <th>MẠNG</th>
          <th>Thời gian đăng ký</th>
          <th>Thời gian mua vé</th>
          <th>Sản phẩm mua vé</th>
          <th>Tổng chi tiêu trong ngày đăng ký</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
}

async function loadMBbank() {
  const tbody = document.querySelector("#resultTable tbody");
  const copyButton = document.getElementById("copyButton");
  let p_date = document.getElementById("p_date").value; 

  tbody.innerHTML = "<tr><td colspan='6'>Đang tải...</td></tr>";

  if (p_date) {
    const parts = p_date.split("-"); 
    p_date = parts[2] + parts[1] + parts[0]; 
  }

  try {
    const res = await fetch("/mbbank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_date })  
    });

    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="6">${data.error}</td></tr>`;
      copyButton.dataset.hasData = "false";
      copyButton.style.opacity = 0.5;
      return;
    }

    const rows = data.rows;

    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='6'>Không có dữ liệu</td></tr>";
      copyButton.dataset.hasData = "false";
      copyButton.style.opacity = 0.5;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td>${r.PHONE_NUMBER}</td>
          <td>${r.NHA_MANG}</td>
          <td>${r.THOI_GIAN_DK}</td>
          <td>${r.THOI_GIAN_MV}</td>
          <td>${r.GAME_TYPE}</td>
          <td>${r.TONG_CHI_TIEU}</td>
        </tr>
      `
      )
      .join("");

    // Đánh dấu đã có dữ liệu
    copyButton.dataset.hasData = "true";
    copyButton.style.opacity = 1;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='6'>${err.message}</td></tr>`;
    copyButton.dataset.hasData = "false";
    copyButton.style.opacity = 0.5;
  }
}

function copyToClipboard() {
  const table = document.getElementById("resultTable");
  const copyButton = document.getElementById("copyButton");

  // Nếu chưa có dữ liệu
  if (copyButton.dataset.hasData !== "true") {
    alert("Chưa có dữ liệu để sao chép!");
    return;
  }

  let text = "";
  const rows = Array.from(table.rows).slice(1); // bỏ thead

  for (let row of rows) {
    text += Array.from(row.cells).map(cell => cell.textContent.trim()).join("\t") + "\n";
  }

  const tempArea = document.createElement("textarea");
  tempArea.value = text;
  document.body.appendChild(tempArea);
  tempArea.select();

  try {
    document.execCommand("copy");
    alert("Đã sao chép dữ liệu (không gồm tiêu đề)!");
  } catch (err) {
    alert("Không thể sao chép dữ liệu: " + err.message);
  }

  document.body.removeChild(tempArea);
}
