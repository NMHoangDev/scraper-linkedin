// crmmarkeechat/crmConfig.ts — port từ chatwoot/overrides/.../components/crm/crmConfig.js
// Namespace riêng, không import/xuất chéo với services/crm-pipeline.helpers.ts.

import type { CrmDeal, DealStage } from "./types";

export const PIPELINE_COLUMNS: DealStage[] = [
  "new_lead",
  "contacted",
  "qualified",
  "requirement",
  "proposal_sent",
  "negotiation",
  "contract_sent",
];

export const TERMINAL_STAGES: DealStage[] = ["won", "lost", "on_hold"];

export const DEAL_STAGES: DealStage[] = [...PIPELINE_COLUMNS, ...TERMINAL_STAGES];

interface StageMeta {
  order: number;
  label: string;
  color: string;
  headerClass: string;
  badgeClass: string;
  description: string;
}

export const DEAL_STAGE_META: Record<DealStage, StageMeta> = {
  new_lead: {
    order: 1,
    label: "Lead mới",
    color: "#64748b",
    headerClass: "bg-slate-100 text-slate-700",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Khách hàng mới, chưa được liên hệ.",
  },
  contacted: {
    order: 2,
    label: "Đã liên hệ",
    color: "#0ea5e9",
    headerClass: "bg-sky-100 text-sky-700",
    badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
    description: "Đã liên hệ, chờ phản hồi.",
  },
  qualified: {
    order: 3,
    label: "Tiềm năng",
    color: "#6366f1",
    headerClass: "bg-indigo-100 text-indigo-700",
    badgeClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
    description: "Khách hàng tiềm năng, đã xác nhận nhu cầu.",
  },
  requirement: {
    order: 4,
    label: "Ghi nhận yêu cầu",
    color: "#8b5cf6",
    headerClass: "bg-violet-100 text-violet-700",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    description: "Đang ghi nhận yêu cầu chi tiết.",
  },
  proposal_sent: {
    order: 5,
    label: "Đã gửi báo giá",
    color: "#d946ef",
    headerClass: "bg-fuchsia-100 text-fuchsia-700",
    badgeClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    description: "Đã gửi báo giá / đề xuất.",
  },
  negotiation: {
    order: 6,
    label: "Đàm phán",
    color: "#f59e0b",
    headerClass: "bg-amber-100 text-amber-700",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Đang đàm phán điều khoản.",
  },
  contract_sent: {
    order: 7,
    label: "Đã gửi hợp đồng",
    color: "#f97316",
    headerClass: "bg-orange-100 text-orange-700",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Đã gửi hợp đồng, chờ ký.",
  },
  won: {
    order: 8,
    label: "Thắng",
    color: "#059669",
    headerClass: "bg-emerald-100 text-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    description: "Deal đã thắng.",
  },
  lost: {
    order: 9,
    label: "Thất bại",
    color: "#ef4444",
    headerClass: "bg-red-100 text-red-700",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    description: "Deal đã thất bại.",
  },
  on_hold: {
    order: 10,
    label: "Tạm giữ",
    color: "#f59e0b",
    headerClass: "bg-amber-100 text-amber-700",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Deal tạm giữ, chờ follow-up.",
  },
};

export const SOURCE_OPTIONS = [
  { value: "Manual", label: "Nhập tay" },
  { value: "Facebook", label: "Facebook" },
  { value: "Zalo", label: "Zalo" },
  { value: "Website", label: "Website" },
  { value: "Hotline", label: "Hotline" },
  { value: "Referral", label: "Giới thiệu" },
  { value: "Event", label: "Sự kiện" },
  { value: "Other", label: "Khác" },
];

export const CITY_OPTIONS = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn", "Bắc Ninh",
  "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau",
  "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên",
  "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội",
  "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn",
  "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận",
  "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh",
  "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

export const INDUSTRY_OPTIONS = [
  "Bán lẻ", "Bất động sản", "Du lịch", "F&B", "Giáo dục", "Logistics",
  "Sản xuất", "Tài chính - Ngân hàng", "Thương mại điện tử", "Xây dựng",
  "Y tế", "Khác",
];

export const SERVICE_PACKAGE_OPTIONS = [
  { value: "basic", label: "Gói Cơ bản" },
  { value: "standard", label: "Gói Tiêu chuẩn" },
  { value: "premium", label: "Gói Cao cấp" },
  { value: "enterprise", label: "Gói Doanh nghiệp" },
];

export function getServicePackageText(value?: string | null): string {
  const found = SERVICE_PACKAGE_OPTIONS.find((o) => o.value === value);
  return found ? found.label : value || "Chưa chọn";
}

export const CONTRACT_STATUS_OPTIONS = [
  { value: "", label: "-- Chưa có --" },
  { value: "pending", label: "Chờ ký" },
  { value: "signed", label: "Đã ký" },
  { value: "in_progress", label: "Đang triển khai" },
  { value: "completed", label: "Hoàn thành" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "cancelled", label: "Đã hủy" },
];

export function getContractStatusText(value?: string | null): string {
  const found = CONTRACT_STATUS_OPTIONS.find((o) => o.value === value);
  return found ? found.label : value || "Chưa cập nhật";
}

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
];

export const LOST_REASON_OPTIONS = [
  { value: "Gia", label: "Giá không phù hợp" },
  { value: "DoiThu", label: "Chọn đối thủ" },
  { value: "KhongNhuCau", label: "Không còn nhu cầu" },
  { value: "MatLienLac", label: "Mất liên lạc" },
  { value: "Khac", label: "Khác" },
];

interface StageRequirement {
  requireNote?: boolean;
  requireBudget?: boolean;
  requireDecisionMaker?: boolean;
  requireAttachment?: boolean;
  requireRejectReason?: boolean;
  requireFollowUp?: boolean;
}

export const STAGE_REQUIREMENTS: Partial<Record<DealStage, StageRequirement>> = {
  qualified: { requireDecisionMaker: true },
  proposal_sent: { requireBudget: true, requireAttachment: true },
  negotiation: { requireBudget: true },
  contract_sent: { requireAttachment: true },
  won: { requireBudget: true, requireAttachment: true },
  lost: { requireRejectReason: true },
  on_hold: { requireFollowUp: true, requireNote: true },
};

export function getCurrentStage(deal: Pick<CrmDeal, "deal_stage"> | null | undefined): DealStage {
  return (deal?.deal_stage as DealStage) || "new_lead";
}

export function getStageMeta(stage: DealStage): StageMeta {
  return DEAL_STAGE_META[stage] || DEAL_STAGE_META.new_lead;
}

export function formatVND(value: number | null | undefined): string {
  const n = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN");
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN");
}

export function validateTransition(fromStage: DealStage, _toStage: DealStage): boolean {
  if (fromStage === "won" || fromStage === "lost") return false;
  return true;
}

export function allowedNextStages(fromStage: DealStage): DealStage[] {
  if (fromStage === "won" || fromStage === "lost") return [];
  return DEAL_STAGES.filter((s) => s !== fromStage);
}
