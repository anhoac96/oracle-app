function showcheckpayreward() {
  document.getElementById('content').innerHTML = `
    <h2>Check GD trả thưởng tăng HMBH</h2>

    <label><b>Tải file Excel (.xlsx):</b></label>
    <span class="hint">Nếu bị lỗi không tìm thấy MA_VE mở file thêm hoặc sửa tên cột thành MA_VE</span><br>
    <input type="file" id="excelFile3" accept=".xlsx,.xls"><br><br>

    <button id="btnUpload3" class="primary-btn">Tải lên & check trạng thái</button>

    <div id="resultpayreward" class="result-box"></div>
  `;

  document.getElementById('btnUpload3').onclick = uploadExcel3Site;
}

async function uploadExcel3Site() {
  const resultDiv = document.getElementById('resultpayreward');
  const excelFile = document.getElementById('excelFile3').files[0];

  if (!excelFile) {
    resultDiv.innerHTML = '<p style="color:red;">⚠ Vui lòng chọn file Excel!</p>';
    return;
  }

  resultDiv.innerHTML = '⏳ Đang xử lý… vui lòng đợi...';

  const formData = new FormData();
  formData.append('file', excelFile);

  try {
    const res = await fetch('/import-excel', {
      method: 'POST',
      body: formData
    });

    const contentType = res.headers.get('content-type') || '';


    if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

 
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const fileName = `NOC_CHECK_TANG_HMBH_${yyyy}${mm}${dd}.xlsx`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;   // ⬅ tên file mới
  a.click();

  URL.revokeObjectURL(url);

  resultDiv.innerHTML = `<p style="color:green;">✔ Check trạng thái thành công! File đã được tải xuống.</p>`;
  return;
}


    
    const data = await res.json();

    if (data.error) {
      resultDiv.innerHTML = `<p style="color:red;">❌ ${data.error}</p>`;
      return;
    }

    if (data.data && data.data.length > 0) {
      let html = "<table border='1' cellpadding='5'><tr>";

      // Header tự động
      Object.keys(data.data[0]).forEach(key => {
        html += `<th>${key}</th>`;
      });
      html += "</tr>";

      // Rows
      data.data.forEach(row => {
        html += "<tr>";
        Object.values(row).forEach(val => {
          html += `<td>${val ?? ""}</td>`;
        });
        html += "</tr>";
      });

      html += "</table>";

      resultDiv.innerHTML = html;
      return;
    }

    // Không có dữ liệu
    resultDiv.innerHTML = "<p>⚠ Không có dữ liệu trả về.</p>";

  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">❌ Lỗi: ${err.message}</p>`;
  }
}
