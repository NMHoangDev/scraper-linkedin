import type { ContractStatus, Deal, DealStage, PaymentStatus } from '../types';

export const PIPELINE_COLUMNS: DealStage[] = [
  'new_lead',
  'contacted',
  'qualified',
  'requirement',
  'proposal_sent',
  'negotiation',
  'contract_sent',
];

export const TERMINAL_STAGES: DealStage[] = ['on_hold', 'won', 'lost'];
export const DEAL_STAGES: DealStage[] = [...PIPELINE_COLUMNS, ...TERMINAL_STAGES];

export const DEAL_STAGE_META: Record<
  DealStage,
  {
    order: number;
    label: string;
    color: string;
    badgeClass: string;
    description: string;
  }
> = {
  new_lead: {
    order: 1,
    label: 'Khách mới',
    color: '#2563eb',
    badgeClass: 'stage-badge-blue',
    description: 'Deal mới, chưa có tương tác',
  },
  contacted: {
    order: 2,
    label: 'Đã liên hệ',
    color: '#0891b2',
    badgeClass: 'stage-badge-cyan',
    description: 'Đã liên hệ khách hàng',
  },
  qualified: {
    order: 3,
    label: 'Đủ điều kiện',
    color: '#8b5cf6',
    badgeClass: 'stage-badge-violet',
    description: 'Có nhu cầu, ngân sách và người quyết định',
  },
  requirement: {
    order: 4,
    label: 'Lấy yêu cầu',
    color: '#c026d3',
    badgeClass: 'stage-badge-fuchsia',
    description: 'Đang thu thập yêu cầu',
  },
  proposal_sent: {
    order: 5,
    label: 'Đã báo giá',
    color: '#f59e0b',
    badgeClass: 'stage-badge-amber',
    description: 'Đã gửi báo giá',
  },
  negotiation: {
    order: 6,
    label: 'Đàm phán',
    color: '#fb923c',
    badgeClass: 'stage-badge-orange',
    description: 'Đang đàm phán',
  },
  contract_sent: {
    order: 7,
    label: 'Đã gửi hợp đồng',
    color: '#f43f5e',
    badgeClass: 'stage-badge-rose',
    description: 'Đã gửi hợp đồng',
  },
  on_hold: {
    order: 8,
    label: 'Tạm dừng',
    color: '#64748b',
    badgeClass: 'stage-badge-slate',
    description: 'Tạm dừng, cần follow-up sau',
  },
  won: {
    order: 9,
    label: 'Hoàn thành',
    color: '#059669',
    badgeClass: 'stage-badge-emerald',
    description: 'Deal đã thắng',
  },
  lost: {
    order: 10,
    label: 'Từ chối',
    color: '#dc2626',
    badgeClass: 'stage-badge-red',
    description: 'Deal đã mất',
  },
};

export const SOURCE_OPTIONS = [
  { value: 'Manual', label: 'Nhập tay' },
  { value: 'FB_Inbox', label: 'FB Inbox' },
  { value: 'FB_Group', label: 'FB Group' },
  { value: 'Zalo', label: 'Zalo' },
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Giới thiệu' },
  { value: 'MarkeeChat', label: 'Markee Chat' },
];

export const CITY_OPTIONS = [
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Bình Dương',
  'Đồng Nai',
  'Long An',
  'Khánh Hòa',
  'Lâm Đồng',
];

export const INDUSTRY_OPTIONS = [
  'Kinh doanh bất động sản',
  'Kinh doanh ô tô',
  'Kinh doanh thời trang',
  'Kinh doanh mỹ phẩm',
  'Kinh doanh thực phẩm',
  'Kinh doanh giáo dục / đào tạo',
  'Kinh doanh phần mềm / CNTT',
  'Kinh doanh xây dựng / nội thất',
  'Kinh doanh khác',
];

export const SERVICE_PACKAGE_OPTIONS = [
  { value: 'Lam_Web', label: 'Làm Web' },
  { value: 'Markee_Chat', label: 'Markee Chat' },
  { value: 'Markee_App', label: 'Markee App' },
  { value: 'Markee_CRM', label: 'Markee CRM' },
  { value: 'Marketing_Automation', label: 'Marketing Automation' },
  { value: 'Khac', label: 'Khác' },
];

export const CRM_PACKAGE_OPTIONS = [
  { value: 'Goi_co_ban', label: 'Gói cơ bản' },
  { value: 'Goi_nang_cao', label: 'Gói nâng cao' },
  { value: 'Goi_doanh_nghiep', label: 'Gói doanh nghiệp' },
];

export const CONTRACT_STATUS_OPTIONS: Array<{
  value: ContractStatus;
  label: string;
  color: string;
}> = [
  { value: 'moi_tiep_nhan', label: 'Mới tiếp nhận', color: '#2563eb' },
  { value: 'dang_xu_ly', label: 'Đang xử lý', color: '#7c3aed' },
  { value: 'da_bao_gia', label: 'Đã báo giá', color: '#0891b2' },
  { value: 'dang_dam_phan', label: 'Đang đàm phán', color: '#d97706' },
  { value: 'da_chot', label: 'Đã chốt', color: '#059669' },
  { value: 'tam_dung', label: 'Tạm dừng', color: '#64748b' },
  { value: 'khong_hoat_dong', label: 'Không hoạt động', color: '#dc2626' },
];

export const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'chua_thanh_toan', label: 'Chưa thanh toán' },
  { value: 'thanh_toan_mot_phan', label: 'Thanh toán một phần' },
  { value: 'da_thanh_toan', label: 'Đã thanh toán' },
  { value: 'qua_han', label: 'Quá hạn' },
];

export const STAGE_CONTRACT_STATUS: Record<DealStage, ContractStatus> = {
  new_lead: 'moi_tiep_nhan',
  contacted: 'dang_xu_ly',
  qualified: 'dang_xu_ly',
  requirement: 'dang_xu_ly',
  proposal_sent: 'da_bao_gia',
  negotiation: 'dang_dam_phan',
  contract_sent: 'da_bao_gia',
  on_hold: 'tam_dung',
  won: 'da_chot',
  lost: 'khong_hoat_dong',
};

export const LOST_REASON_OPTIONS = [
  { value: 'no_budget', label: 'Khách chưa có ngân sách' },
  { value: 'competitor', label: 'Chọn đối thủ' },
  { value: 'timing', label: 'Chưa phù hợp thời điểm' },
  { value: 'no_response', label: 'Không phản hồi' },
  { value: 'other', label: 'Khác' },
];

export const WON_REASON_OPTIONS = [
  { value: 'solution_fit', label: 'Giải pháp phù hợp' },
  { value: 'trust_case_study', label: 'Uy tín / case study thuyết phục' },
  { value: 'competitive_price', label: 'Giá hợp lý' },
  { value: 'fast_response', label: 'Phản hồi nhanh' },
  { value: 'other', label: 'Khác' },
];

export const STAGE_REQUIREMENTS: Partial<
  Record<
    DealStage,
    {
      requireDecisionMaker?: boolean;
      requireBudget?: boolean;
      requireNote?: boolean;
      requireWonReason?: boolean;
      requireRejectReason?: boolean;
    }
  >
> = {
  qualified: { requireDecisionMaker: true, requireBudget: true },
  requirement: { requireNote: true },
  proposal_sent: { requireBudget: true },
  negotiation: { requireNote: true },
  won: { requireWonReason: true },
  lost: { requireRejectReason: true },
};

export function getCurrentStage(deal?: Pick<Deal, 'stage'> | null): DealStage {
  return deal?.stage && DEAL_STAGES.includes(deal.stage) ? deal.stage : 'new_lead';
}

export function getStageMeta(stage: DealStage) {
  return DEAL_STAGE_META[stage] || DEAL_STAGE_META.new_lead;
}

export function formatVND(value?: number | string | null) {
  if (!Number(value || 0)) return null;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatCompactVND(value?: number | string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return '0 đ';
  if (numeric >= 1000000000) {
    return `${(numeric / 1000000000).toFixed(numeric >= 10000000000 ? 0 : 1)} tỷ`;
  }
  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toFixed(numeric >= 10000000 ? 0 : 1)} triệu`;
  }
  return formatVND(numeric) || '0 đ';
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('vi-VN');
}

export function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getContractLabel(deal?: Pick<Deal, 'contract' | 'quote'> | null) {
  return deal?.contract?.code || deal?.quote?.number || deal?.contract?.title || deal?.quote?.id || '';
}

export function isCrmDocumentUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return false;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const googleDocumentHosts = new Set([
      'drive.google.com',
      'docs.google.com',
      'sheets.google.com',
    ]);
    if (googleDocumentHosts.has(hostname) || hostname.endsWith('.googleusercontent.com')) {
      return true;
    }
    if (hostname === 'example.com' || hostname.endsWith('.example.com')) return false;
    return /\.(pdf|doc|docx|xls|xlsx|csv)(\?|#|$)/i.test(`${pathname}${url.search}${url.hash}`);
  } catch {
    return false;
  }
}

export function getContractUrl(deal?: Pick<Deal, 'contract' | 'quote'> | null) {
  const url = deal?.contract?.url || deal?.quote?.url || '';
  return isCrmDocumentUrl(url) ? url : '';
}

export function getServicePackageText(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return SERVICE_PACKAGE_OPTIONS.find(option => option.value === raw)?.label || raw;
}

export function getPackageText(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return CRM_PACKAGE_OPTIONS.find(option => option.value === raw)?.label || raw;
}

export function getContractStatusForStage(stage: DealStage): ContractStatus {
  return STAGE_CONTRACT_STATUS[stage] || '';
}

export function getContractStatusText(value?: ContractStatus | string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return CONTRACT_STATUS_OPTIONS.find(option => option.value === raw)?.label || raw;
}

export function getPaymentStatusText(value?: PaymentStatus | string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return PAYMENT_STATUS_OPTIONS.find(option => option.value === raw)?.label || raw;
}

export function allowedNextStages(currentStage: DealStage): DealStage[] {
  const transitions: Record<DealStage, DealStage[]> = {
    new_lead: ['contacted', 'lost'],
    contacted: ['qualified', 'proposal_sent', 'on_hold', 'lost'],
    qualified: ['requirement', 'proposal_sent', 'on_hold', 'lost'],
    requirement: ['proposal_sent', 'on_hold', 'lost'],
    proposal_sent: ['negotiation', 'on_hold', 'lost'],
    negotiation: ['contract_sent', 'on_hold', 'lost'],
    contract_sent: ['won', 'lost'],
    on_hold: ['contacted', 'qualified', 'requirement', 'proposal_sent', 'negotiation', 'contract_sent', 'won', 'lost'],
    won: [],
    lost: [],
  };
  return transitions[currentStage] || [];
}

export function parseMoney(value: string | number | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    const parts = cleaned.split(',');
    normalized =
      parts.length > 2 || parts.at(-1)?.length === 3
        ? cleaned.replace(/,/g, '')
        : cleaned.replace(',', '.');
  } else {
    normalized = cleaned.replace(/\.(?=\d{3}(\D|$))/g, '');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
