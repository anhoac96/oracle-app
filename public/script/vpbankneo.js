function showVPBNeo() {
  document.getElementById('content').innerHTML = `
    <div>
      <h2>Danh sách TKDT VPBANK NEO đủ điều kiện</h2>

      <label><b>Chọn ngày Active:</b> (Không chọn mặc định là ngày hôm nay)</label>
      <input type="date" id="p_date" style="width:180px; padding:5px">

      <label><b>Số lượng TKDT:</b>(Không điền mặc định 20 TKDT)</label>
      <input type="number" id="p_limit" style="width:60px; padding:5px" placeholder="20" min="1" max="50">

      <button onclick="loadVPBNeo()" class="primary">Tải dữ liệu</button>

      <!-- Nút Copy luôn hiển thị nhưng mờ lúc đầu -->
      <button onclick="copyToClipboard()" id="copyButton" 
              style="margin-left:15px; padding:10px; cursor:pointer; opacity:0.5;">
        Copy Dữ Liệu
      </button>
    </div>

    <br>

    <table border="1" width="100%" id="resultTable">
      <thead>
        <tr>
          <th>Mạng</th>
          <th>SĐT</th>
          <th>Ngày ĐK TK</th>
          <th>Ngày Active</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  // đánh dấu chưa có dữ liệu
  document.getElementById("copyButton").dataset.hasData = "false";
}

async function loadVPBNeo() {
  const tbody = document.querySelector("#resultTable tbody");
  const copyButton = document.getElementById("copyButton");
  let p_date = document.getElementById("p_date").value; 
  let limit  = document.getElementById("p_limit").value;

  tbody.innerHTML = "<tr><td colspan='4'>Đang tải...</td></tr>";

  if (p_date) {
    const parts = p_date.split("-");
    p_date = parts[2] + parts[1] + parts[0]; 
  }

  limit = parseInt(limit);
  if (!limit || limit <= 0) limit = 20;

  try {
    const res = await fetch("/vpb-neo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_date, limit })  
    });

    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="4">${data.error}</td></tr>`;
      copyButton.dataset.hasData = "false";
      copyButton.style.opacity = 0.5;
      return;
    }

    const rows = data.rows;

    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='4'>Không có dữ liệu</td></tr>";
      copyButton.dataset.hasData = "false";
      copyButton.style.opacity = 0.5;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td>${r.MANG}</td>
          <td>${r.SDT}</td>
          <td>${r.NGAY_DK_TK}</td>
          <td>${r.NGAY_ACTIVE}</td>
        </tr>
      `
      )
      .join("");

    // đánh dấu có dữ liệu → bật opacity
    copyButton.dataset.hasData = "true";
    copyButton.style.opacity = 1;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='4'>${err.message}</td></tr>`;
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
