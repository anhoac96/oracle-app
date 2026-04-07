function showVnPayReconciliation() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().slice(0, 10); 

  document.getElementById('content').innerHTML = `
    <h2>Đối soát VNPAY</h2>

    <div class="select-wrapper">
      <label><b>Chọn Site:</b></label>
      <select id="dbName">
        <option value="VTEL">VTEL</option>
        <option value="VNP">VNP</option>
        <option value="MBF">MBF</option>
      </select><br><br>
    </div>

    <label><b>Chọn ngày:</b></label>
    <input type="date" id="p_date" value="${defaultDate}"><br><br>

    <label><b>Tải file CSV:</b></label>
    <input type="file" id="csvFile" accept=".csv"><br><br>

    <button id="btnUpload">Tải lên & đối soát</button>

    <div id="resultVnPay"></div>
  `;

  document.getElementById('btnUpload').onclick = uploadCSV;
}

async function uploadCSV() {
  const dbName = document.getElementById('dbName').value;
  const csvFile = document.getElementById('csvFile').files[0];
  const dateInput = document.getElementById('p_date').value;
  const resultDiv = document.getElementById('resultVnPay');

  if (!csvFile) {
    resultDiv.innerHTML = '<p style="color:red;">Vui lòng chọn file!</p>';
    return;
  }

  // Định dạng ngày thành ddmmyyyy
  let p_date = '';
  if (dateInput) {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    p_date = `${day}${month}${year}`;
  }

  const formData = new FormData();
  formData.append('dbName', dbName);
  formData.append('csvFile', csvFile);
  formData.append('p_date', p_date); // gửi ngày lên server

  resultDiv.innerHTML = 'Đang tải lên...';

  try {
    const res = await fetch('/import-csv', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.error) {
      resultDiv.innerHTML = `<p style="color:red;">${data.error}</p>`;
    } else {
      resultDiv.innerHTML = `<p style="color:green;">Đối soát thành công! File đã được upload lên OneDrive.</p>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi: ${err.message}</p>`;
  }
}
