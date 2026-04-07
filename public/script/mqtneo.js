function showCheckMQT() {
  document.getElementById('content').innerHTML = `
    <div>
      <h2>Thống kê chi tiêu của TKDT VPBANK NEO được tặng</h2>
      <button onclick="loadCheckMQT()" class="primary">Tải dữ liệu</button>

      <button onclick="copyMQT()" id="copyButton"
        style="margin-left:15px;padding:10px;cursor:pointer;opacity:0.5;">
        Copy dữ liệu
      </button>
    </div>

    <br>

    <table border="1" width="100%" id="resultTable">
      <thead>
        <tr>
          <th>SĐT</th>
          <th>SP Chi tiêu MQT</th>
          <th>DT MQT</th>
          <th>SP Chi tiêu</th>
          <th>DT Chi tiêu</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  document.getElementById("copyButton").dataset.hasData = "false";
}

async function loadCheckMQT() {
  const tbody = document.querySelector("#resultTable tbody");
  const copyButton = document.getElementById("copyButton");

  tbody.innerHTML = "<tr><td colspan='5'>Đang tải...</td></tr>";

  try {
    const res = await fetch("/mqt-check");
    const data = await res.json();

    if (!data.success || !data.data.length) {
      tbody.innerHTML = "<tr><td colspan='5'>Không có dữ liệu</td></tr>";
      copyButton.dataset.hasData = "false";
      copyButton.style.opacity = 0.5;
      return;
    }

    tbody.innerHTML = data.data.map(r => `
      <tr>
        <td>${r.phone_number || ''}</td>
        <td>${r.sp_chitieu_mqt || ''}</td>
        <td>${r.dt_mqt || '0'}</td>
        <td>${r.sp_chitieu || ''}</td>
        <td>${r.dt_chitieu || '0'}</td>
      </tr>
    `).join('');

    copyButton.dataset.hasData = "true";
    copyButton.style.opacity = 1;

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
    copyButton.dataset.hasData = "false";
    copyButton.style.opacity = 0.5;
  }
}

function copyMQT() {
  const table = document.getElementById("resultTable");
  const copyButton = document.getElementById("copyButton");

  if (copyButton.dataset.hasData !== "true") {
    alert("Chưa có dữ liệu để sao chép!");
    return;
  }

  let text = "";
  const rows = Array.from(table.rows).slice(1); // bỏ header

  rows.forEach(row => {
    text += Array.from(row.cells)
      .map(cell => cell.innerText.trim())
      .join("\t") + "\n";
  });

  // ✅ Cách copy tương thích mọi trình duyệt
  const tempArea = document.createElement("textarea");
  tempArea.value = text;
  tempArea.style.position = "fixed";
  tempArea.style.opacity = 0;
  document.body.appendChild(tempArea);

  tempArea.focus();
  tempArea.select();

  try {
    document.execCommand("copy");
    alert("Đã sao chép dữ liệu!");
  } catch (err) {
    alert("Không thể sao chép dữ liệu: " + err.message);
  }

  document.body.removeChild(tempArea);
}
