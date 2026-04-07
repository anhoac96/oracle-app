// =============================
// CONFIG DATA
// =============================

const rewardStatuses = [
  'EXPIRED',
  'WAITING_FOR_CHANGE_DEFAULT_REWARD_ACCOUNT',
  'NEED_TO_PAY',
  'NEED_VERIFY_DEFAULT_REWARD_ACCOUNT',
  'WAITING_FOR_SMS_CONFIRM_HMDT',
  'WAITING_FOR_SMS_CONFIRM_CURRENT_DEFAULT_REWARD_ACCOUNT',
  'PAYMENT_DONE',
  'PAYMENT_PROCESSING',
  'HIGH_WINNING',
  'NEED_TO_PAY_AGAIN'
];

const gameTypes = [
  'G535', 'G3D', 'G3D_PLUS',
  'G655', 'G645', 'GBINGO', 'G3D_PRO'
];

const channels = [
  'VNT', 'VNPAY', 'VP_BANK', 'MOMO',
  'ZALO_PAY', 'NAPAS', 'MANUAL_BANK',
  'VIETTEL_PAY', 'HMDT', 'VNPT_PAY'
];

// =============================
// STATE
// =============================

const state = {
  currentPage: 1,
  pageSize: 50,
  totalRecords: 0,
  totalPages: 1
};

// =============================
// RENDER UI
// =============================

function showCheckReward() {

  const content = document.getElementById('content');

  content.innerHTML = `
    <h2>Tra cứu trúng thưởng</h2>

    <div class="section-box">

      ${renderFilters()}

      <div class="form-row">
  <div class="form-group">
    <label>Hiển thị</label>
    <select id="pageSizeSelect" class="input-box">
      <option value="50">50</option>
      <option value="100">100</option>
      <option value="200">200</option>
    </select>
    <span>dòng</span>

    <!-- Buttons nằm ngay dưới -->
    <div class="button-group">
      <button id="btnSearch" class="btn-primary">Tra cứu</button>
      <button id="btnCSV" class="btn-primary">Xuất CSV</button>
    </div>
  </div>
</div>

      <div id="result" style="margin-top:20px;"></div>

    </div>
  `;

  bindEvents();
}

// =============================
// FILTER TEMPLATE
// =============================

function renderFilters() {
  return `
    <div class="form-grid-3">
      <div class="form-item">
        <label>Chọn Site</label>
        <select id="dbName" class="input-box">
          <option value="all">Tất cả</option>
          <option value="VTEL">VTEL</option>
          <option value="VNP">VNP</option>
          <option value="MBF">MBF</option>
        </select>
      </div>

      <div class="form-item">
        <label>SĐT</label>
        <input id="phone" class="input-box" type="text"/>
      </div>

      <div class="form-item">
        <label>VTID1</label>
        <input id="vtId1" class="input-box" type="text"/>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-item">
        <label>Kỳ quay</label>
        <input id="draws" class="input-box" type="text"/>
      </div>

      <div class="form-item">
        <label>Từ ngày</label>
        <input type="date" id="fromDate" class="input-box">
      </div>

      <div class="form-item">
        <label>Đến ngày</label>
        <input type="date" id="toDate" class="input-box">
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-item">
        <label>Kênh</label>
        <select id="channelSelect" class="input-box">
          <option value="all">Tất cả</option>
          ${channels.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>

      <div class="form-item">
        <label>Trạng thái trả thưởng</label>
        <select id="rewardStatusSelect" class="input-box">
          <option value="all">Tất cả</option>
          ${rewardStatuses.map(r => `<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>

      <div class="form-item">
        <label>Loại game</label>
        <select id="gameTypeSelect" class="input-box">
          <option value="all">Tất cả</option>
          ${gameTypes.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
}

// =============================
// EVENT BINDING
// =============================

function bindEvents() {

  document.getElementById("btnSearch")
    .addEventListener("click", () => search(false));

  document.getElementById("btnCSV")
    .addEventListener("click", downloadCSV);

  document.getElementById("pageSizeSelect")
    .addEventListener("change", e => {
      state.pageSize = parseInt(e.target.value);
      state.currentPage = 1;
      search(true);
    });
}

// =============================
// HELPERS
// =============================

function getSelectValue(id) {
  const val = document.getElementById(id)?.value;
  return (!val || val === "all") ? undefined : val;
}

function parseDraws(drawStr) {
  if (!drawStr) return [];
  return drawStr.split(',').map(d => d.trim()).filter(Boolean);
}

function buildPayload() {

  const payload = {
    page: state.currentPage,
    pageSize: state.pageSize
  };

  const dbName = getSelectValue('dbName');
  const phone = document.getElementById('phone').value.trim();
  const vtId1 = document.getElementById('vtId1').value.trim();
  const draws = parseDraws(document.getElementById('draws').value.trim());
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  const channel = getSelectValue('channelSelect');
  const rewardStatus = getSelectValue('rewardStatusSelect');
  const gameType = getSelectValue('gameTypeSelect');

  if (dbName) payload.dbName = dbName;
  if (phone) payload.phone = phone;
  if (vtId1) payload.vtId1 = vtId1;
  if (draws.length) payload.draws = draws;
  if (fromDate) payload.fromDate = fromDate;
  if (toDate) payload.toDate = toDate;
  if (channel) payload.channel = channel;
  if (rewardStatus) payload.rewardStatus = rewardStatus;
  if (gameType) payload.gameType = gameType;

  return payload;
}

// =============================
// MAIN SEARCH
// =============================

async function search(isPaging = false) {

  if (!isPaging) state.currentPage = 1;

  const resultDiv = document.getElementById('result');
  const btn = document.getElementById("btnSearch");

  btn.disabled = true;
  resultDiv.innerHTML = "Đang tra cứu...";

  try {

    const res = await fetch('/check-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    });

    const data = await res.json();

    if (!data.success) {
      resultDiv.innerHTML = `<p style="color:red;">${data.error}</p>`;
      return;
    }

    state.totalRecords = data.total || 0;

    if (!data.rows?.length) {
      resultDiv.innerHTML = '<p>Không có dữ liệu phù hợp.</p>';
      return;
    }

    resultDiv.innerHTML =
      buildTable(data.rows) +
      buildPagination();

  } catch (err) {
    resultDiv.innerHTML = `<p style="color:red;">Lỗi kết nối: ${err.message}</p>`;
  } finally {
    btn.disabled = false;
  }
}

// =============================
// TABLE
// =============================

function buildTable(rows) {

  const headers = Object.keys(rows[0]).filter(h => h !== 'RN');

  let html = '<div style="overflow-x:auto">';
  html += '<table border="1" cellspacing="0" cellpadding="6" width="100%"><thead><tr>';

  headers.forEach(h => html += `<th>${h}</th>`);
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';

    headers.forEach(h => {
      let value = row[h] ?? '';
      if (h === 'WINNING_AMOUNT' && value)
        value = Number(value).toLocaleString('vi-VN');
      html += `<td>${value}</td>`;
    });

    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// =============================
// PAGINATION
// =============================

function buildPagination() {

  state.totalPages =
    Math.ceil(state.totalRecords / state.pageSize);

  return `
    <div style="margin-top:15px; text-align:center;">
      <div style="margin-bottom:10px; font-weight:600;">
        Trang ${state.currentPage} / ${state.totalPages}
        (${state.totalRecords.toLocaleString('vi-VN')} bản ghi)
      </div>
      <button id="prevBtn" ${state.currentPage === 1 ? 'disabled' : ''}>◀ Trước</button>
      <button id="nextBtn" ${state.currentPage === state.totalPages ? 'disabled' : ''}>Sau ▶</button>
    </div>
  `;
}

// pagination event delegation
document.addEventListener("click", function (e) {

  if (e.target.id === "prevBtn" && state.currentPage > 1) {
    state.currentPage--;
    search(true);
  }

  if (e.target.id === "nextBtn" && state.currentPage < state.totalPages) {
    state.currentPage++;
    search(true);
  }

});

// =============================
// DOWNLOAD CSV
// =============================

function downloadCSV() {

  const params = buildPayload();
  delete params.page;
  delete params.pageSize;

  const query = new URLSearchParams(params);
  window.open('/download-csv?' + query.toString(), '_blank');
}