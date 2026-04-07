function showwithdraw() {
  document.getElementById('content').innerHTML = `
    <h2>Check trạng thái GD rút tiền</h2>

    <label><b>Tải file Excel (.xlsx):</b></label>
    <input type="file" id="excelFilewithdraw" accept=".xlsx,.xls"><br><br>

    <button id="btnUploadwithdraw" class="primary-btn">Tải lên & check trạng thái</button>

    <div id="resultwithdraw" class="result-box"></div>
  `;

  document.getElementById('btnUploadwithdraw').onclick = uploadExcelwithdraw;
}

async function uploadExcelwithdraw() {
  const resultDiv = document.getElementById('resultwithdraw');
  const excelFile = document.getElementById('excelFilewithdraw').files[0];

  if (!excelFile) {
    resultDiv.innerHTML = '<p style="color:red;">⚠ Vui lòng chọn file Excel!</p>';
    return;
  }

  resultDiv.innerHTML = '⏳ Đang xử lý… vui lòng đợi...';

  const formData = new FormData();
  formData.append('file', excelFile);

  try {
    const res = await fetch('/import-withdraw', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      resultDiv.innerHTML = `<p style="color:red;">❌ ${data.error || "Lỗi server"}</p>`;
      return;
    }

    const rows = data.data;

    if (!rows || rows.length === 0) {
      resultDiv.innerHTML = "<p style='color:red;'>⚠ Không có dữ liệu.</p>";
      return;
    }

    // ---- TẠO FILE EXCEL TRỰC TIẾP ----
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KET_QUA");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const fileName = `NOC_CHECK_RUT_TIEN_${yyyy}${mm}${dd}.xlsx`;

    XLSX.writeFile(wb, fileName);

    resultDiv.innerHTML = `<p style="color:green;">✔ File Excel đã được tạo và tải xuống!</p>`;

  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">❌ Lỗi: ${err.message}</p>`;
  }
}
