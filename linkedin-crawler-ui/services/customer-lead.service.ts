import { API_BASE_URL, API_KEY } from "@/lib/env";

/* =============================================================
   CRM Customer Interface — full schema
   ============================================================= */

export type ContractStatus = "active" | "completed" | "maintenance";
export type ActivityStatus = "active" | "paused" | "churned";
export type LeadStatus = "pending" | "closed" | "rejected";
export type ReviewResult = "Qualify" | "Disqualify" | "Chua_xem_xet";
export type SourcePlatform = "FB_Inbox" | "FB_Group" | "Zalo" | "Manual";
export type RejectReasonType =
  | "Khong_lien_lac_duoc"
  | "Chua_co_nhu_cau"
  | "Cham_trai_nghiem"
  | "Thieu_nhan_su"
  | "Chia_tay_doi_tac_cu"
  | "Khong_du_tai_chinh"
  | "Chua_phu_hop_thoi_diem"
  | "Khac";

export interface Customer {
  id: string;
  customer_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  industry: string | null;
  tax_code: string | null;
  leaded_by: string | null;
  conv_id: string | null;
  source_platform: SourcePlatform;
  is_assigned: boolean;
  sdr_id: string | null;
  status: LeadStatus;
  activity_status: ActivityStatus;
  customer_since: string | null;
  service_package: string | null;
  lifetime_value: number | null;
  contract_signed_at: string | null;
  contract_status: ContractStatus;
  warranty_expires_at: string | null;
  care_note: string | null;
  last_care_at: string | null;
  tags: string[];
  has_budget: boolean;
  note: string | null;
  reject_reason: string | null;
  reject_reason_type: RejectReasonType | null;
  review_result: ReviewResult | null;
  created_at: string;
  updated_at: string;
  leader_name?: string | null;
  sdr_name?: string | null;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export interface SDRUser {
  id: string;
  name: string;
  role: string;
}

/* =============================================================
   Option lists (from UI screenshots)
   ============================================================= */

export const SOURCE_PLATFORM_OPTIONS: { value: SourcePlatform; label: string }[] = [
  { value: "FB_Inbox", label: "FB Inbox" },
  { value: "FB_Group", label: "FB Group" },
  { value: "Zalo", label: "Zalo" },
  { value: "Manual", label: "Nhập tay" },
];

export const INDUSTRY_OPTIONS = [
  "Kinh doanh bất động sản",
  "Kinh doanh ô tô",
  "Kinh doanh thời trang",
  "Kinh doanh mỹ phẩm",
  "Kinh doanh thực phẩm",
  "Kinh doanh điện máy / điện thoại",
  "Kinh doanh nội thất / trang trí",
  "Kinh doanh nha khoa",
  "Kinh doanh phòng khám / bệnh viện",
  "Kinh doanh giáo dục / đào tạo",
  "Kinh doanh logistics / vận chuyển",
  "Kinh doanh du lịch / lữ hành",
  "Kinh doanh tài chính / bảo hiểm",
  "Kinh doanh phần mềm / CNTT",
  "Kinh doanh xây dựng / nội thất",
  "Kinh doanh khác",
];

export const CITY_OPTIONS = [
  "Hà Nội",
  "Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "An Giang",
  "Bà Rịa – Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

export const HAS_BUDGET_OPTIONS: { value: boolean; label: string }[] = [
  { value: true, label: "Có ngân sách" },
  { value: false, label: "Chưa có ngân sách" },
];

export const CARE_NOTE_OPTIONS = [
  "Gọi lại sau 1 tuần",
  "Gọi lại sau 2 tuần",
  "Gọi lại sau 1 tháng",
  "Gửi báo giá qua email",
  "Gửi báo giá qua Zalo",
  "Hẹn gặp trực tiếp",
  "Chuyển nhân sự phụ trách",
  "Gia hạn hợp đồng",
  "Tư vấn upsell",
  "Theo dõi bảo hành",
  "Đã chốt đơn",
  "Khách từ chối — theo dõi lại sau",
];

export const REJECT_REASON_TYPE_OPTIONS: { value: RejectReasonType; label: string }[] = [
  { value: "Khong_lien_lac_duoc", label: "Không liên lạc được" },
  { value: "Chua_co_nhu_cau", label: "Chưa có nhu cầu" },
  { value: "Cham_trai_nghiem", label: "Chấm trái nghiệm" },
  { value: "Thieu_nhan_su", label: "Thiếu nhân sự" },
  { value: "Chia_tay_doi_tac_cu", label: "Chia tay đối tác cũ" },
  { value: "Khong_du_tai_chinh", label: "Không đủ tài chính" },
  { value: "Chua_phu_hop_thoi_diem", label: "Chưa phù hợp thời điểm" },
  { value: "Khac", label: "Khác" },
];

export const REVIEW_RESULT_OPTIONS: { value: ReviewResult; label: string }[] = [
  { value: "Qualify", label: "Qualify ✓" },
  { value: "Disqualify", label: "Disqualify ✗" },
  { value: "Chua_xem_xet", label: "Chưa xem xét" },
];

/* =============================================================
   API helpers
   ============================================================= */

function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  return headers;
}

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: getDefaultHeaders(),
    ...options,
  });
  return res.json();
}

export const customerLeadService = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    city?: string;
    industry?: string;
    source_platform?: string;
    page?: number;
    page_size?: number;
  }): Promise<CustomerListResponse> => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.city) q.set("city", params.city);
    if (params?.industry) q.set("industry", params.industry);
    if (params?.source_platform) q.set("source_platform", params.source_platform);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString() ? `?${q.toString()}` : "";
    const data = await apiFetch(`/api/all-platform/customer-leads${qs}`);
    return data?.data as CustomerListResponse ?? { items: [], total: 0, page: 1, page_size: 50 };
  },

  getByConvId: async (convId: string): Promise<Customer | null> => {
    const data = await apiFetch(`/api/all-platform/customer-leads/by-conv/${encodeURIComponent(convId)}`);
    return data?.data ?? null;
  },

  getSdrs: async (): Promise<SDRUser[]> => {
    const data = await apiFetch(`/api/all-platform/customer-leads/sdrs`);
    return (data?.data as SDRUser[]) ?? [];
  },

  create: async (payload: Partial<Customer>): Promise<any> => {
    return apiFetch("/api/all-platform/customer-leads", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: Partial<Customer>): Promise<any> => {
    return apiFetch(`/api/all-platform/customer-leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<any> => {
    return apiFetch(`/api/all-platform/customer-leads/${id}`, {
      method: "DELETE",
    });
  },
};
