function showVnPayReconciliation3Site() {
  document.getElementById('content').innerHTML = `
    <h2>Check trạng thái vé VNPAY (3 Site)</h2>

    <label><b>Tải file CSV/Excel:</b></label>
    <input type="file" id="csvFile3" accept=".csv,.xlsx,.xls"><br><br>

    <button id="btnUpload3">Tải lên & đối soát</button>

    <div id="resultVnPay3" style="margin-top:15px;"></div>
  `;

  document.getElementById('btnUpload3').onclick = uploadCSV3Site;
}

async function uploadCSV3Site() {
  const resultDiv = document.getElementById('resultVnPay3');
  const fileInput = document.getElementById('csvFile3');
  const file = fileInput.files[0];

  if (!file) {
    resultDiv.innerHTML = '<p style="color:red;">Vui lòng chọn file!</p>';
    return;
  }

  resultDiv.innerHTML = '⏳ Đang upload & đối soát, vui lòng chờ...';
  console.log("📌 File upload:", file.name, "size:", file.size);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/import-csv-3-site', {
      method: 'POST',
      body: formData
    });

    console.log("📌 Response Status:", res.status);

    let msg = '';
    let color = 'red';

    try {
      const data = await res.json();
      if (res.ok) {
        msg = data.message || 'Đối soát thành công. File đã được gửi link qua Google Chat.';
        color = 'green';
      } else {
        msg = data.error || 'Có lỗi xảy ra!';
      }
    } catch (e) {
      msg = await res.text();
    }

    resultDiv.innerHTML = `<p style="color:${color};">${msg}</p>`;
    fileInput.value = ''; // reset file input

  } catch (err) {
    console.error("❌ Fetch error:", err);
    resultDiv.innerHTML =
      `<p style="color:red;">Lỗi kết nối server: ${err.message}</p>`;
  }
}
