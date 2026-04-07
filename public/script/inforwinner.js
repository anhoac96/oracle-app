function showcheckinfor() {
  document.getElementById('content').innerHTML = `
    <h2>Thông tin khách hàng trúng Jackpot</h2>

    <div class="search-box">
        <input id="searchDate" 
               type="text" 
               placeholder="ddmmyyyy hoặc chọn ngày..." 
               autocomplete="off">
        <button id="btnSearch">Tra cứu</button>
    </div>

    <div id="result"></div>
  `;

  const input = document.getElementById("searchDate");
  const btn = document.getElementById("btnSearch");

  input.addEventListener("input", () => {
      let raw = input.value.replace(/\D/g, "");
      if (raw.length > 8) raw = raw.slice(0, 8);

      if (raw.length === 8) {
          input.value = raw.replace(/(\d{2})(\d{2})(\d{4})/, "$1/$2/$3");
          input.dataset.formatted = raw;
      } else {
          delete input.dataset.formatted;
      }
  });

  flatpickr("#searchDate", {
      dateFormat: "d/m/Y",
      maxDate: "today",
      allowInput: true,
      defaultDate: new Date(),
      onChange: function(selectedDates, dateStr) {
          const p = dateStr.split("/");
          if (p.length === 3) {
              input.dataset.formatted = p[0] + p[1] + p[2];
          }
      }
  });

  btn.addEventListener("click", loadWinnerInfor);
  input.addEventListener("keydown", e => { if (e.key === "Enter") loadWinnerInfor(); });
}



// =============================================================
//  FORMAT FUNCTIONS
// =============================================================
function formatDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;

    return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

function formatBirthDate(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d)) return str;

    return d.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

function formatMoney(num) {
    if (num === null || num === undefined || num === "") return "";
    const n = Number(String(num).replace(/[., ]+/g, ""));
    if (isNaN(n)) return num;

    return n.toLocaleString("en-US");
}



// =============================================================
//  LOAD WINNER INFO
// =============================================================
async function loadWinnerInfor() {
  
    const input = document.getElementById("searchDate");
    let sendDate = input.dataset.formatted;

    if (!sendDate || sendDate.trim() === "") {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();

        sendDate = dd + mm + yyyy;
        input.value = `${dd}/${mm}/${yyyy}`;
        input.dataset.formatted = sendDate;
    }

    const result = document.getElementById("result");
    result.innerHTML = "<p>Đang tải dữ liệu...</p>";

    try {
        const res = await fetch(`/api/winner-info?date=${sendDate}`);
        if (!res.ok) {
            result.innerHTML = `<p>Lỗi server: ${res.status}</p>`;
            return;
        }

        let data = await res.json();
        if (!Array.isArray(data)) data = [data];

        if (!data || data.length === 0 || data[0].message) {
            result.innerHTML = `<p>Không có bản ghi nào</p>`;
            return;
        }

        result.innerHTML = "";
        data.forEach((item, idx) => {
            const div = document.createElement("div");
            div.className = "record";

            
div.innerHTML = `
<div class="jackpot-card">

  <div class="jackpot-header">

    <div class="header-top">
        <div class="record-sub">
            Site: <span class="badge-site">${item.SITE || ""}</span>
        </div>
        <button class="copy-btn" onclick="copyRecord(this)">Copy</button>
    </div>

    <div class="noc-header">
        <div>Dear Anh/Chị!</div>
        <div>NOC gửi thông tin MKT yêu cầu</div>
    </div>

    <div class="record-title">
        Thông tin khách hàng trúng thưởng ${item.GIAI_THUONG || ""} site ${item.SITE || ""} mã vé: ${item.MA_VE || ""}
    </div>

  </div>

  <!-- ✅ GRID PHẢI NẰM TRONG CARD -->
  <div class="jackpot-grid">
        
      <div class="label">Ngày</div>
      <div class="value">${item.NGAY || ""}</div>

      <div class="label">Giới tính</div>
      <div class="value">${item.GIOITINH || ""}</div>

      <div class="label">Năm sinh</div>
      <div class="value">${formatBirthDate(item.NAMSINH)}</div>

      <div class="label">Sản phẩm</div>
      <div class="value">${item.SANPHAM || ""}</div>

      <div class="label">Kỳ quay</div>
      <div class="value">${item.KYQUAY || ""}</div>

      <div class="label">Giải thưởng</div>
      <div class="value">${item.GIAI_THUONG || ""}</div>

      <div class="label">Giá trị trước thuế</div>
      <div class="value money">${formatMoney(item.TRUOC_THUE)}</div>

      <div class="label">Giá trị trả thưởng</div>
      <div class="value money">${formatMoney(item.SAU_THUE)}</div>

      <div class="label">Thời gian mua vé</div>
      <div class="value">${formatDate(item.THOI_GIAN_MUA_VE)}</div>

      <div class="label">Bộ số KH mua</div>
      <div class="value">${item.BO_SO || ""}</div>

      <div class="label">Kênh mua vé</div>
      <div class="value">${item.KENH_MUA_VE || ""}</div>

      <div class="label">Hình thức mua</div>
      <div class="value">${item.HINH_THUC_MUA || ""}</div>

      <div class="label">Giá trị KH mua</div>
      <div class="value money">${formatMoney(item.GIA_TRI_VE)}</div>

      <div class="label">Nơi đăng ký TKDT</div>
      <div class="value">${item.NOI_DANG_KY_TKDT || ""}</div>

      <div class="label">Thời gian kích hoạt TKDT</div>
      <div class="value">${formatDate(item.THOI_GIAN_KICH_HOAT_TKDT)}</div>

  </div>

</div>
`;

            result.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        result.innerHTML = `<p>Lỗi: ${err.message}</p>`;
    }
}


function copyRecord(btn) {

    const card = btn.closest(".jackpot-card");

    const labels = card.querySelectorAll(".label");
    const values = card.querySelectorAll(".value");

    let arr = [];

    // HEADER
    arr.push("Dear Anh/Chị!");
    arr.push("NOC gửi thông tin MKT yêu cầu");
    arr.push("");

    // Lấy SITE
    const site = card.querySelector(".badge-site")?.textContent.trim() || "";

    // Lấy MÃ VÉ từ title
    const title = card.querySelector(".record-title")?.textContent || "";
    const maVeMatch = title.match(/mã vé:\s*(\S+)/i);
    const maVe = maVeMatch ? maVeMatch[1] : "";

    // Lấy GIẢI THƯỞNG
    const giaiThuong = [...labels].find(lb => lb.textContent.trim() === "Giải thưởng")
        ?.nextElementSibling?.textContent.trim() || "";

    // Title dòng chính
    arr.push(`Thông tin khách hàng trúng thưởng ${giaiThuong} site ${site} mã vé: ${maVe}`);

    // Data
    labels.forEach((lb, i) => {
        const key = lb.textContent.trim();
        const val = values[i]?.textContent.trim() || "";
        arr.push(`${key}: ${val}`);
    });

    const output = arr.join("\n");

   if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(output)
        .then(() => alert("Đã copy bản ghi!"))
        .catch(err => {
            console.error(err);
            fallbackCopy(output);
        });
} else {
    fallbackCopy(output);
}

function fallbackCopy(text) {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    alert("Đã copy bản ghi!");
}
}