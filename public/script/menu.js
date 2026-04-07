const menus = [
  {
    id: 'reward_withdraw',
    name: 'Trúng/Trả thưởng-Rút tiền',
    children: [
      {
        name: 'Lập lệnh',
        children: [
          { id: 'script_laplenhlandau', name: 'Lệnh trả thưởng' },
          { id: 'script_ruttien', name: 'Lệnh rút tiền' }
        ]
      },
      {
        name: 'Trả thưởng',
        children: [
          { id: 'checkerror', name: 'Nguyên nhân trả thưởng lỗi' },
          { id: 'checkcommand', name: 'Tra cứu mã lập lệnh trả thưởng' },
          { id: 'script_chia535', name: 'Thống kê tổng tiền trả thưởng' },
          { id: 'script_chiviettelpay', name: 'Check trả thưởng ViettelPay trạng thái WAIT_DISB' }
        ]
      },
      {
        name: 'Rút tiền',
        children: [
          { id: 'checkwithdraw', name: 'Nguyên nhân lỗi rút tiền' },
          { id: 'withdrawrq', name: 'Check trạng thái rút tiền' },
          { id: 'exportwithdraw', name: 'Xuất danh sách rút tiền' }
        ]
      },
      {
        name: 'Trúng thưởng',
        children: [
          { id: 'checkReward', name: 'Tra cứu trúng thưởng' },
          { id: 'script_trungthuong', name: 'Check file trúng thưởng' },
          { id: 'script_mttrathuong', name: 'Thống kê MT trúng thưởng' },
          { id: 'script_mttrungthuong535', name: 'Check MT trúng thưởng game 535' }
        ]
      }
    ]
  },
  {
    id: 'hmdt_hmbh',
    name: 'HMDT-HMBH',
    children: [
      { id: 'checkhmdt', name: 'Xuất danh sách HMDT' },
      { id: 'checkhmdtblock', name: 'Check block HMDT' },
      { id: 'script_hmbh', name: 'HMBH' },
      { id: 'checkpayreward', name: 'Check tăng HMBH' }
    ]
  },
  {
    id: 'doisoat',
    name: 'Đối soát',
    children: [
      { id: 'dsvnpay', name: 'Đối soát VNPAY' },
      { id: 'script_dsmomo', name: 'Đối soát MOMO' },
      { id: 'script_dsvtelpay', name: 'Đối soát ViettelPay' },
      { id: 'script_dszalopay', name: 'Đối soát ZaloPay' }
    ]
  },
  {
    id: 'jackpot',
    name: 'Kết quả Jackpot',
    children: [
      { id: 'script_jackpot', name: 'Jackpot ước tính' },
      { id: 'script_jackpotkq', name: 'Jackpot kết quả' },
      { id: 'inforwinner', name: 'Thông tin khách hàng trúng Jackpot' }
    ]
  },
  {
    id: 'thongke',
    name: 'Tra soát - Thống kê',
    children: [
      { id: 'payment', name: 'Kênh thanh toán mua vé' },
      { id: 'script_cycle', name: 'Thống kê cấu hình kỳ quay' },
      { id: 'script_tamhoa', name: 'Thống kê tam hoa ngày T-1' },
      { id: 'script_checkpdc_drc', name: 'Check hệ thống sau khi chuyển PDC-DRC' },
      { id: 'checksms', name: 'Tra cứu SMS của khách hàng' },
      { id: 'checkrole', name: 'Check phân quyền tài khoản web admin' },
      { id: 'dsvnpay3site', name: 'Check trạng thái vé VNPAY' }
    ]
  }
];

// ================== LẤY ELEMENT ==================
const toggleBtn = document.getElementById("toggleBtn");
const navbar    = document.getElementById("navbar");
const homeContent = document.getElementById("homeContent");
const topBar = document.getElementById("top-bar");
const menuHomeBtn = document.getElementById("menuHomeBtn");

function renderTile(item) {
  return `
    <button type="button" class="dashboard-tile" onclick="handleMenu('${item.id}')">
      <span class="dashboard-tile__label">${item.name}</span>
    </button>
  `;
}

function createDashboardTile(item) {
  return renderTile(item);
}

window.showHomePage = function() {
  const content = document.getElementById("content");
  homeContent.style.display = "block";
  content.style.display = "none";
  content.innerHTML = "";
  if (topBar) topBar.style.display = "none";
  window.currentCategory = null;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
}

// ================== TÍNH NĂNG MỞ DASHBOARD THEO NHÓM ==================
window.showCategoryDashboard = function(menu) {
  window.currentCategory = menu;
  homeContent.style.display = "none";
  const content = document.getElementById("content");
  content.style.display = "block";
  if (topBar) topBar.style.display = "block";
  
  let html = `<section class="dashboard-section">`;
  html += `<div class="section-heading">`;
  html += `<p class="section-heading__eyebrow">Danh mục chức năng</p>`;
  html += `<h2 class="section-heading__title">${menu.name}</h2>`;
  html += `</div>`;
  
  // Kiểm tra xem menu này có phân cấp con bên trong nữa không
  const hasSubgroups = menu.children.some(c => c.children);
  
  if (hasSubgroups) {
    menu.children.forEach(group => {
      if (group.children) {
        html += `<section class="subsection-block">`;
        html += `<h3 class="subsection-block__title">${group.name}</h3>`;
        html += `<div class="dashboard-grid">`;
        group.children.forEach(child => {
          html += createDashboardTile(child);
        });
        html += `</div></section>`;
      } else {
        html += `<div class="dashboard-grid">`;
        html += createDashboardTile(group);
        html += `</div>`;
      }
    });
  } else {
    // Menu 1 cấp thông thường
    html += `<div class="dashboard-grid">`;
    menu.children.forEach(child => {
      html += createDashboardTile(child);
    });
    html += `</div>`;
  }
  
  html += `</section>`;
  content.innerHTML = html;
}

// ================== LOAD MENU ==================
function loadMenus() {
  const nav = document.getElementById("navButtons");
  if (!nav) return;

  nav.innerHTML = "";

  menus.forEach(menu => {
    if (menu.children) {
      // Nhóm có submenu -> Hiển thị Dashboard
      const btn = createMenuButton(menu.name, () => showCategoryDashboard(menu));
      nav.appendChild(btn);
    } else {
      // MENU KHÔNG CÓ SUBMENU
      const btn = createMenuButton(menu.name, () => handleMenu(menu.id));
      nav.appendChild(btn);
    }
  });
}

// ================== TẠO BUTTON ==================
function createMenuButton(label, fn) {
  const btn = document.createElement("button");
  btn.className = "nav-btn";
  btn.innerHTML = label;

  if (fn) {
    btn.onclick = () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      fn();
    };
  }
  return btn;
}

// ================== XỬ LÝ ROUTER ==================
window.handleMenu = function(id) {
  homeContent.style.display = "none";
  const content = document.getElementById("content");
  content.style.display = "block";
  if (topBar) topBar.style.display = "block";
  content.innerHTML = "";

  if (id.startsWith('script_')) {
    const scriptCmd = id.replace('script_', '');
    if (typeof showSingleScript === 'function') {
      showSingleScript(scriptCmd);
    } else {
      content.innerHTML = "<p style='color:red;'>Lỗi: Chưa load được module script.</p>";
    }
    return;
  }

  if (id === 'checkReward') showCheckReward();
  else if (id === 'checkhmdt') showCheckHmdt();
  else if (id === 'dsvnpay') showVnPayReconciliation();
  else if (id === 'checkerror') showcheckerror();
  else if (id === 'checkcommand') showcheckcommand();
  else if (id === 'payment') showcheckpayment();
  else if (id === 'dsvnpay3site') showVnPayReconciliation3Site();
  else if (id === 'script') { if(typeof showscript === 'function') showscript(); }
  else if (id === 'inforwinner') showcheckinfor();
  else if (id === 'checkpayreward') showcheckpayreward();
  else if (id === 'vpbankneo') showVPBNeo();
  else if (id === 'mqtneo') showCheckMQT();
  else if (id === 'checkwithdraw') showcheckwithdraw();
  else if (id === 'withdrawrq') showwithdraw();
  else if (id === 'mbbank') showMBbank();
  else if (id === 'exportwithdraw') showWithdrawRequest();   
  else if (id === 'checkhmdtblock') showCheckHmdtblock(); 
  else if (id === 'checksms') showCheckSMS(); 
  else if (id === 'checkrole') showCheckRoleBK(); 
  else if (id === 'ncbank') showNCB();
}

// ================== NÚT ☰ ==================
toggleBtn.addEventListener("click", () => {
  navbar.classList.toggle("hidden");
  document.body.classList.toggle("sidebar-open");
});

if (menuHomeBtn) {
  menuHomeBtn.addEventListener("click", showHomePage);
}

// ================== TẢI MENU ==================
window.onload = loadMenus;
