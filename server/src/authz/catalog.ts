export type CatalogTask = {
  id: string;
  name: string;
};

export type CatalogMenuGroup = {
  name: string;
  children?: CatalogTask[];
};

export type CatalogMenu = {
  id: string;
  name: string;
  children: Array<CatalogMenuGroup | CatalogTask>;
};

export const LEGACY_MENU_CATALOG: CatalogMenu[] = [
  {
    id: 'reward_withdraw',
    name: 'Trúng/Trả thưởng-Rút tiền',
    children: [
      { name: 'Lập lệnh', children: [{ id: 'script_laplenhlandau', name: 'Lệnh trả thưởng' }, { id: 'script_ruttien', name: 'Lệnh rút tiền' }] },
      { name: 'Trả thưởng', children: [{ id: 'checkerror', name: 'Nguyên nhân trả thưởng lỗi' }, { id: 'checkcommand', name: 'Tra cứu mã lập lệnh trả thưởng' }, { id: 'script_chia535', name: 'Thống kê tổng tiền trả thưởng' }, { id: 'script_chiviettelpay', name: 'Check trả thưởng ViettelPay trạng thái WAIT_DISB' }] },
      { name: 'Rút tiền', children: [{ id: 'checkwithdraw', name: 'Nguyên nhân lỗi rút tiền' }, { id: 'withdrawrq', name: 'Check trạng thái rút tiền' }, { id: 'exportwithdraw', name: 'Xuất danh sách rút tiền' }] },
      { name: 'Trúng thưởng', children: [{ id: 'checkReward', name: 'Tra cứu trúng thưởng' }, { id: 'script_trungthuong', name: 'Check file trúng thưởng' }, { id: 'script_mttrathuong', name: 'Thống kê MT trúng thưởng' }, { id: 'script_mttrungthuong535', name: 'Check MT trúng thưởng game 535' }] },
    ],
  },
  {
    id: 'hmdt_hmbh',
    name: 'HMDT-HMBH',
    children: [
      { id: 'checkhmdt', name: 'Xuất danh sách HMDT' },
      { id: 'checkhmdtblock', name: 'Check block HMDT' },
      { id: 'script_hmbh', name: 'HMBH' },
      { id: 'checkpayreward', name: 'Check tăng HMBH' },
    ],
  },
  {
    id: 'doisoat',
    name: 'Đối soát',
    children: [
      { id: 'dsvnpay', name: 'Đối soát VNPAY' },
      { id: 'script_dsmomo', name: 'Đối soát MOMO' },
      { id: 'script_dsvtelpay', name: 'Đối soát ViettelPay' },
      { id: 'script_dszalopay', name: 'Đối soát ZaloPay' },
    ],
  },
  {
    id: 'jackpot',
    name: 'Kết quả Jackpot',
    children: [
      { id: 'script_jackpot', name: 'Jackpot ước tính' },
      { id: 'script_jackpotkq', name: 'Jackpot kết quả' },
      { id: 'inforwinner', name: 'Thông tin khách hàng trúng Jackpot' },
    ],
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
      { id: 'dsvnpay3site', name: 'Check trạng thái vé VNPAY' },
    ],
  },
];
