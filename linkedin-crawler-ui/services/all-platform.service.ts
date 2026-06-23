/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type {
  UnifiedPost,
  SeedingMark,
  SeedingCountResult,
  KpiMember,
  KpiAssignment,
  Category,
  FacebookGroup,
  LinkedInGroup,
  ApiResponse,
  AppUser,
  AuthLoginResponse,
  SocialAccount,
  SocialAccountSummary,
} from "@/types/unified.types";
import { API_BASE_URL, API_KEY } from "@/lib/env";

const BASE = `${API_BASE_URL}/api/all-platform`;
const authHeaders = () => ({});
const AUTH_SUBMIT_TIMEOUT_MS = 12000;

/**
 * Trả về header mặc định cho mọi request — bao gồm:
 *  - X-API-Key: backend yêu cầu (verify_zalo_api_key), đọc từ NEXT_PUBLIC_LINKEDIN_CRAWLER_API_KEY
 *  - Có thể bị override bởi `init.headers` nếu caller cần custom
 */
function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }
  return headers;
}

async function requestJson<T = any>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        ...getDefaultHeaders(),
        ...(init?.headers || {}),
      },
    });
    return res.json();
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

async function requestJsonWithTimeout<T = any>(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await requestJson<T>(path, {
      ...init,
      signal: controller.signal,
    });
    if (!res.success && controller.signal.aborted) {
      return {
        ...res,
        message: timeoutMessage,
      };
    }
    return res;
  } finally {
    window.clearTimeout(timer);
  }
}

// ── SEEDING (Facebook) ────────────────────────────────────────────────────────

export const allPlatformSeedingService = {
  mark: (payload: {
    email_member: string;
    link_post: string;
    platform: string;
    name?: string;
    link_comment?: string;
    name_profile?: string;
    content?: string;
    profile_id?: string;
    facebook_name?: string;
    current_day?: string;
  }): Promise<ApiResponse<SeedingMark>> => {
    return requestJson(`${BASE}/facebook/seeding-mark/save`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verify: (payload: {
    email_member: string;
    link_post: string;
    platform: string;
    name?: string;
    link_comment?: string;
    name_profile?: string;
    content?: string;
    profile_id?: string;
    facebook_name?: string;
  }): Promise<ApiResponse<SeedingMark>> => {
    return requestJson(`${BASE}/facebook/seeding-mark/verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAll: (
    email_member: string,
  ): Promise<ApiResponse<SeedingMark[]>> => {
    return requestJson(`${BASE}/facebook/seeding-mark/get-all`, {
      method: "POST",
      body: JSON.stringify({ email_member }),
    });
  },

  getUnverified: (
    email_member: string,
  ): Promise<ApiResponse<SeedingMark[]>> => {
    return requestJson(`${BASE}/facebook/seeding-mark/get-unverified`, {
      method: "POST",
      body: JSON.stringify({ email_member }),
    });
  },

  getActualCount: (payload: {
    email_member: string;
    date_from?: string;
    date_to?: string;
    profile_id?: string;
    facebook_name?: string;
    platform: string;
  }): Promise<ApiResponse<SeedingCountResult>> => {
    return requestJson(
      `${BASE}/${payload.platform}/seeding-mark/get-actual-count`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  },

  getKpiTarget: (payload: {
    email_member: string;
    date_from?: string;
    date_to?: string;
    platform: string;
  }): Promise<ApiResponse<SeedingCountResult>> => {
    return requestJson(
      `${BASE}/${payload.platform}/seeding-mark/get-kpi-target`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  },
};

// ── KPI ───────────────────────────────────────────────────────────────────────

export const allPlatformKpiService = {
  assign: (payload: {
    leader_role: string;
    role: string;
    email: string;
    profile_slug: string;
    email_leader: string;
    id_team?: string;
    kpi: Array<{
      start_day: string;
      end_day: string;
      kpi_comment?: number;
      kpi_post?: number;
      kpi_lead?: number;
      kpi_inbox?: number;
      total_reaction?: number;
      total_comment?: number;
      total_post_crawl?: number;
      total_session_crawl?: number;
      platform?: string;
    }>;
    platform: string;
  }): Promise<ApiResponse<KpiAssignment>> => {
    return requestJson(`${BASE}/kpi/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAll: (leader_email: string, id_team?: string, start_date?: string, end_date?: string): Promise<ApiResponse<{ total: number; members: KpiMember[] }>> => {
    return requestJson(`${BASE}/kpi/get-all`, {
      method: "POST",
      body: JSON.stringify({ leader_email, id_team, start_date, end_date }),
    });
  },

  getByEmail: (email: string): Promise<ApiResponse<KpiMember>> => {
    return requestJson(`${BASE}/kpi/get-by-email`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  getZaloInboxProgress: (
    email: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<{
    kpi_inbox_current: number;
    account_ids: string[];
    range: { start: string; end: string };
  }>> => {
    return requestJson(`${BASE}/kpi/zalo-inbox-progress`, {
      method: "POST",
      body: JSON.stringify({ email, start_date: startDate, end_date: endDate }),
    });
  },

  getFbInboxProgress: (
    email: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<{
    kpi_fb_inbox_count: number;
    range: { start: string; end: string };
  }>> => {
    return requestJson(`${BASE}/kpi/fb-inbox-progress`, {
      method: "POST",
      body: JSON.stringify({ email, start_date: startDate, end_date: endDate }),
    });
  },

  getFbPostKpiSummary: (
    email: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<{
    post_count: number;
    profile_count: number;
    group_count: number;
    page_count: number;
    posts: Array<{
      id: string;
      job_id: string;
      post_url: string | null;
      content: string | null;
      target_type: string;
      target_id: string | null;
      posted_at: string;
    }>;
    range: { start: string; end: string };
  }>> => {
    return requestJson(`${BASE}/fb/post-kpi/summary`, {
      method: "POST",
      body: JSON.stringify({ email, start_date: startDate, end_date: endDate }),
    });
  },

  syncAll: (
    email: string,
    posts: Array<{ post_url: string; reactions?: number; comments?: number; shares?: number }>,
  ): Promise<ApiResponse<{ updated: number }>> => {
    return requestJson(`${BASE}/kpi/sync-all`, {
      method: "POST",
      body: JSON.stringify({ email, posts }),
    });
  },

  checkPermission: (email: string): Promise<ApiResponse<{ role: string; email_leader?: string; name?: string }>> => {
    return requestJson(`${BASE}/kpi/auth/check-permission`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyLeaderCode: (code: string): Promise<ApiResponse<{ valid: boolean }>> => {
    return requestJson(`${BASE}/kpi/auth/verify-leader-code`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Đếm/tính inbox KPI cho 1 hoặc nhiều hội thoại FB.
   * Gọi khi leader/admin bấm nút "Tính Inbox" trên hộp thoại FB.
   * @param is_lead - đánh dấu là lead tiềm năng
   */
  syncFbInbox: (payload: {
    leader_email: string;
    member_email: string;
    conv_ids: string[];
    user_id: string;
    is_lead?: boolean;
  }): Promise<ApiResponse<{ synced: number; lead: number; member_email: string }>> => {
    return requestJson(`${BASE}/kpi/fb-inbox-sync`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy tổng hợp inbox KPI từ bảng fb_inbox_kpi (Supabase).
   * Chỉ lấy inbox ĐÃ XÁC NHẬN (is_confirmed=True).
   */
  getFbInboxSummary: (
    email: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<{
    inbox_count: number;
    lead_count: number;
    conv_ids: string[];
    range: { start: string; end: string };
  }>> => {
    return requestJson(`${BASE}/kpi/fb-inbox-summary`, {
      method: "POST",
      body: JSON.stringify({ email, start_date: startDate, end_date: endDate }),
    });
  },

  /**
   * Lấy danh sách inbox KPI CHƯA XÁC NHẬN từ bảng fb_inbox_kpi (Supabase).
   * Dùng cho filter "Chưa xác minh" - hiển thị inbox member đã đề xuất
   * nhưng leader/admin chưa duyệt (is_confirmed=False).
   */
  getPendingFbInbox: (
    email: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<{
    pending_count: number;
    pending_conv_ids: string[];
    range: { start: string; end: string };
  }>> => {
    return requestJson(`${BASE}/kpi/fb-inbox-pending`, {
      method: "POST",
      body: JSON.stringify({ email, start_date: startDate, end_date: endDate }),
    });
  },

  /**
   * Lấy danh sách conv_ids đã xác nhận KPI inbox trong tuần hiện tại.
   * Dùng cho frontend filter "Chưa tính KPI" trong inbox page.
   * Trả về cả confirmed (đã duyệt) và pending (chờ duyệt).
   */
  getVerifiedConvIds: (
    leaderEmail: string,
    idTeam?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<{
    confirmed_conv_ids: string[];
    pending_conv_ids: string[];
    range: { start: string; end: string };
    member_count: number;
  }>> => {
    return requestJson(`${BASE}/kpi/fb-inbox-verified-ids`, {
      method: "POST",
      body: JSON.stringify({
        leader_email: leaderEmail,
        id_team: idTeam,
        start_date: startDate || "",
        end_date: endDate || "",
      }),
    });
  },

  /**
   * Member tự đề xuất KPI inbox cho mình.
   */
  suggestFbInbox: (payload: {
    member_email: string;
    conv_ids: string[];
    user_id: string;
  }): Promise<ApiResponse<{
    synced: number;
    member_email: string;
    conv_ids: string[];
    message: string;
  }>> => {
    return requestJson(`${BASE}/kpi/fb-inbox-suggest`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ── Zalo Inbox Share (Tin nhắn KPI verification) ─────────────────────────────

export const zaloInboxShareService = {
  /**
   * Member bật/tắt share cho 1 conversation.
   * @param is_active true = bật, false = tắt
   */
  toggle: (payload: {
    account_id: string;
    conversation_id: string;
    member_email: string;
    is_active: boolean;
    shared_role?: "leader" | "admin";
    note?: string;
  }): Promise<ApiResponse<{ is_active: boolean; row: any }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/toggle`, {
      method: "POST",
      body: JSON.stringify({
        shared_role: "leader",
        ...payload,
      }),
    });
  },

  /** Liệt kê conversations mà member này đã share. */
  listMine: (
    member_email: string,
    is_active: boolean | null = true,
  ): Promise<ApiResponse<{ items: any[]; total: number }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/list`, {
      method: "POST",
      body: JSON.stringify({ member_email, is_active }),
    });
  },

  /** Liệt kê conversations mà leader có quyền xem (đã join account info). */
  leaderView: (
    leader_email: string,
    member_email?: string,
  ): Promise<ApiResponse<{ items: any[]; total: number }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/leader-view`, {
      method: "POST",
      body: JSON.stringify({ leader_email, member_email }),
    });
  },

  /** Bulk sync (khi member thay đổi nhiều tick cùng lúc). */
  bulkSync: (
    member_email: string,
    shares: Array<{ account_id: string; conversation_id: string; is_active: boolean; note?: string }>,
  ): Promise<ApiResponse<{ synced: number; failed: number; errors: string[] }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/bulk-sync`, {
      method: "POST",
      body: JSON.stringify({ member_email, shares }),
    });
  },

  /** Leader xác minh 1 share → tính KPI inbox. */
  verify: (row_id: number, leader_email: string, note?: string): Promise<ApiResponse<{ row: any }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/verify`, {
      method: "POST",
      body: JSON.stringify({ row_id, leader_email, note }),
    });
  },

  /** Leader thu hồi verify (set verified_at = NULL). */
  unverify: (row_id: number): Promise<ApiResponse<{ row: any }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/unverify`, {
      method: "POST",
      body: JSON.stringify({ row_id }),
    });
  },

  /** Leader đánh dấu tiềm năng (is_lead) */
  toggleLead: (row_id: number, leader_email: string, is_lead: boolean): Promise<ApiResponse<{ row: any }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/toggle-lead`, {
      method: "POST",
      body: JSON.stringify({ row_id, leader_email, is_lead }),
    });
  },

  /** Đếm số share đã verify trong khoảng [start_date, end_date]. */
  countVerified: (
    member_email: string,
    start_date: string,
    end_date: string,
  ): Promise<ApiResponse<{ count: number; items: any[] }>> => {
    return requestJson(`${BASE}/zalo/inbox-share/count-verified`, {
      method: "POST",
      body: JSON.stringify({ member_email, start_date, end_date }),
    });
  },
};

// ── UNIFIED POSTS (Tong-hop — no cache, all server-side) ─────────────────────

export const allPlatformPostsService = {
  /** Fetch + filter in one call — server-side, no cache */
  getAll: (payload: {
    email: string;
    platform: string;
    date_from?: string;
    date_to?: string;
    intent?: string;
    industry?: string;
    team?: string;
    tier?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ posts: UnifiedPost[]; total: number; page: number; page_size: number; total_pages: number }>> => {
    return requestJson(`${BASE}/unified/posts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Full filter — server-side, no client-side merge */
  filter: (payload: {
    email: string;
    platform: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    intent?: string;
    industry?: string;
    team?: string;
    tier?: string;
    icp?: string;
    content_type?: string;
    product_seeding?: string;
    search?: string;
    sort?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ posts: UnifiedPost[]; total: number; page: number; page_size: number; total_pages: number }>> => {
    return requestJson(`${BASE}/unified/posts/filter`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Stats from database — no cache */
  getStats: (payload: {
    email: string;
    platform: string;
  }): Promise<ApiResponse<{
    totalPostsToday: number;
    postsYesterday: number;
    totalPosts: number;
    highScoreCount: number;
    highScorePercent: number;
    seededToday: number;
    totalVisible: number;
  }>> => {
    return requestJson(`${BASE}/unified/stats`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  syncProgress: (
    email: string,
    posts: Array<{ post_url: string; reactions?: number; comments?: number; shares?: number }>,
    platform: string,
  ): Promise<ApiResponse<{ updated: number }>> => {
    return requestJson(`${BASE}/${platform}/posts/sync-progress`, {
      method: "POST",
      body: JSON.stringify({ email, posts }),
    });
  },
};

// ── CATEGORIES ────────────────────────────────────────────────────────────────

export const allPlatformCategoriesService = {
  getAll: (
    category_type?: string,
  ): Promise<ApiResponse<Category[]>> => {
    const url = category_type
      ? `${BASE}/categories?category_type=${encodeURIComponent(category_type)}`
      : `${BASE}/categories`;
    return requestJson(url);
  },

  add: (payload: {
    category_type: string;
    code: string;
    name?: string;
    description?: string;
    leader?: string;
    geo?: string;
    platform?: string;
  }): Promise<ApiResponse<Category>> => {
    return requestJson(`${BASE}/categories/add`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: (payload: {
    id: string;
    category_type?: string;
    code?: string;
    name?: string;
    description?: string;
    leader?: string;
    geo?: string;
    platform?: string;
  }): Promise<ApiResponse<Category>> => {
    return requestJson(`${BASE}/categories/update`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: (id: string): Promise<ApiResponse<{ deleted: number }>> => {
    return requestJson(`${BASE}/categories/delete?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

// ── GROUPS (Facebook + LinkedIn) ─────────────────────────────────────────────

export const allPlatformGroupsService = {
  getAll: (
    platform: string,
    params?: { intent?: string; team?: string; tier?: number; status?: string },
  ): Promise<ApiResponse<(FacebookGroup | LinkedInGroup)[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.intent) searchParams.set("intent", params.intent);
    if (params?.team) searchParams.set("team", params.team);
    if (params?.tier) searchParams.set("tier", String(params.tier));
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    const url = `${BASE}/${platform}/groups${qs ? `?${qs}` : ""}`;
    return requestJson(url);
  },

  add: (
    payload: Record<string, unknown>,
    platform: string,
  ): Promise<ApiResponse<FacebookGroup | LinkedInGroup>> => {
    return requestJson(`${BASE}/${platform}/groups/add`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: (
    payload: Record<string, unknown>,
    platform: string,
  ): Promise<ApiResponse<FacebookGroup | LinkedInGroup>> => {
    return requestJson(`${BASE}/${platform}/groups/update`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: (id: string, platform: string): Promise<ApiResponse<{ deleted: number }>> => {
    return requestJson(
      `${BASE}/${platform}/groups/delete?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },
};

// ── USERS & TEAMS ─────────────────────────────────────────────────────────────

export const allPlatformUsersService = {
  getMe: (email: string): Promise<ApiResponse<TeamMember>> => {
    return requestJson(
      `${BASE}/users/me?email=${encodeURIComponent(email)}`,
    );
  },

  updateSlug: (email: string, slug: string): Promise<ApiResponse<TeamMember>> => {
    return requestJson(`${BASE}/users/update-slug`, {
      method: "POST",
      body: JSON.stringify({ email, slug }),
    });
  },

  updateRole: (email: string, role: string): Promise<ApiResponse<TeamMember>> => {
    return requestJson(`${BASE}/users/update-role`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  },

  getAllProfiles: (): Promise<ApiResponse<TeamMember[]>> => {
    return requestJson(`${BASE}/users/all-profiles`);
  },
};

export const allPlatformTeamsService = {
  getMembers: (leader_email: string): Promise<ApiResponse<TeamMember[]>> => {
    return requestJson(
      `${BASE}/teams/members?leader_email=${encodeURIComponent(leader_email)}`,
    );
  },

  addMember: (
    leader_email: string,
    member_email: string,
  ): Promise<ApiResponse<{ leader_email: string; member_email: string }>> => {
    return requestJson(`${BASE}/teams/add-member`, {
      method: "POST",
      body: JSON.stringify({ leader_email, member_email }),
    });
  },
};

// ── AUTH ────────────────────────────────────────────────────────────────────────

export const authService = {
  register: (payload: {
    email: string;
    password: string;
    name?: string;
  }): Promise<ApiResponse<AuthLoginResponse>> => {
    return requestJsonWithTimeout(
      `${BASE}/auth/register`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      AUTH_SUBMIT_TIMEOUT_MS,
      "Đăng ký quá lâu, vui lòng thử lại.",
    );
  },

  login: (payload: { email: string; password: string }): Promise<ApiResponse<AuthLoginResponse>> => {
    return requestJsonWithTimeout(
      `${BASE}/auth/login`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      AUTH_SUBMIT_TIMEOUT_MS,
      "Đăng nhập quá lâu, vui lòng thử lại.",
    );
  },

  logout: (): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/auth/logout`, {
      method: "POST",
    });
  },

  me: (): Promise<ApiResponse<AppUser>> => {
    return requestJson(`${BASE}/auth/me`);
  },

  updateProfile: (payload: { name?: string }): Promise<ApiResponse<AppUser>> => {
    return requestJson(`${BASE}/auth/me/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  promoteToLeader: (leader_code: string): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/auth/promote-to-leader`, {
      method: "POST",
      body: JSON.stringify({ leader_code }),
    });
  },

  verifyLeaderCode: (code: string): Promise<ApiResponse<{ valid: boolean }>> => {
    return requestJson(`${BASE}/auth/verify-leader-code?code=${encodeURIComponent(code)}`);
  },

  getSessions: (): Promise<ApiResponse<any[]>> => {
    return requestJson(`${BASE}/auth/sessions`);
  },

  deleteSession: (sessionId: string): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  deleteAllSessions: (): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/auth/sessions`, {
      method: "DELETE",
    });
  },

  changePassword: (payload: { current_password: string; new_password: string }): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/auth/me/password`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deactivateAccount: (payload: { password: string }): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/auth/me/deactivate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ── SOCIAL ACCOUNTS ──────────────────────────────────────────────────────────────

export const socialAccountsService = {
  getAll: (
    platform?: string,
  ): Promise<ApiResponse<SocialAccount[]>> => {
    const url = platform
      ? `${BASE}/social-accounts?platform=${encodeURIComponent(platform)}`
      : `${BASE}/social-accounts`;
    return requestJson(url, { headers: authHeaders() });
  },

  getSummary: (): Promise<ApiResponse<SocialAccountSummary>> => {
    return requestJson(`${BASE}/social-accounts/summary`, {
      headers: authHeaders(),
    });
  },

  getPrimary: (platform: string): Promise<ApiResponse<SocialAccount | null>> => {
    return requestJson(`${BASE}/social-accounts/primary/${platform}`, {
      headers: authHeaders(),
    });
  },

  create: (payload: {
    platform: string;
    account_name: string;
    account_email?: string;
    account_password?: string;
    two_fa_secret?: string;
    session_cookie?: string;
    is_primary?: boolean;
    notes?: string;
  }): Promise<ApiResponse<SocialAccount>> => {
    return requestJson(`${BASE}/social-accounts`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  update: (payload: {
    id: string;
    account_name?: string;
    account_email?: string | null;
    account_password?: string | null;
    two_fa_secret?: string | null;
    two_fa_enabled?: boolean;
    session_cookie?: string | null;
    is_active?: boolean;
    is_primary?: boolean;
    notes?: string | null;
    account_profile_id?: string | null;
    id_platform?: number | null;
  }): Promise<ApiResponse<SocialAccount>> => {
    return requestJson(`${BASE}/social-accounts`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  delete: (accountId: string): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/social-accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },

  setPrimary: (accountId: string): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/social-accounts/${encodeURIComponent(accountId)}/set-primary`, {
      method: "POST",
      headers: authHeaders(),
    });
  },
};

// ── LinkedIn Account Management ───────────────────────────────────────────────

export interface LinkedInAccount {
  id: string;
  email_member: string;
  email_linkedin: string;
  created_at: string;
}

export interface LinkedInCrawlRequest {
  email_linkedin: string;
  group_urls: string[];
  target_date?: string;
  max_items?: number;
  fallback_recent_count?: number;
}

export interface LinkedInCrawlResult {
  total_groups_ok: number;
  total_groups_failed: number;
  total_sessions_saved: number;
  total_posts_saved: number;
  errors: Array<{ group_url: string; error: string }>;
  groups_results: Array<{
    group_url: string;
    success: boolean;
    posts_count: number;
    error?: string;
  }>;
}

export const linkedInAccountService = {
  getAll: (): Promise<ApiResponse<LinkedInAccount[]>> => {
    return requestJson(`${BASE}/linkedin/accounts`, { method: "GET" });
  },

  create: (payload: {
    email_member: string;
    email_linkedin: string;
    password: string;
  }): Promise<ApiResponse<LinkedInAccount>> => {
    return requestJson(`${BASE}/linkedin/accounts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: (
    accountId: string,
    payload: { email_member?: string; email_linkedin?: string; password?: string }
  ): Promise<ApiResponse<LinkedInAccount>> => {
    return requestJson(`${BASE}/linkedin/accounts/${encodeURIComponent(accountId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: (accountId: string): Promise<ApiResponse<{ deleted: number }>> => {
    return requestJson(`${BASE}/linkedin/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
    });
  },
};

export const linkedInCrawlService = {
  crawl: (payload: LinkedInCrawlRequest): Promise<ApiResponse<LinkedInCrawlResult>> => {
    return requestJson(`${BASE}/linkedin/crawl-linkedin-post`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  deleteSession: (sessionId: string): Promise<ApiResponse<any>> => {
    return requestJson(`${BASE}/linkedin/crawl-sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  },
};

export interface LinkedInLoginResult {
  status: "success" | "need_otp";
  session_id: string;
  checkpoint_url?: string;
  email: string;
}

export interface LinkedInVerifyOtpResult {
  session_id: string;
  state_path: string;
  email: string;
  success: boolean;
}

export const linkedInAuthService = {
  login: (payload: {
    email: string;
    password: string;
    session_id?: string;
  }): Promise<ApiResponse<LinkedInLoginResult>> => {
    return requestJson(`${BASE}/linkedin/login`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  verifyOtp: (payload: {
    pending_session_id: string;
    otp_code: string;
    checkpoint_url?: string;
  }): Promise<ApiResponse<LinkedInVerifyOtpResult>> => {
    return requestJson(`${BASE}/linkedin/verify-otp`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ── Users & Teams Services ────────────────────────────────────────────────────

export interface AppUserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
}

export interface TeamRow {
  id: string;
  name_team: string;
  id_leader: string;
  leader_email: string;
  leader_name: string;
  members: TeamMember[];
  number_of_member: number;
}

export const usersService = {
  getAllProfiles: (): Promise<ApiResponse<AppUserProfile[]>> => {
    return requestJson(`${BASE}/users/all-profiles`);
  },
  getByRole: (role: string): Promise<ApiResponse<AppUserProfile[]>> => {
    return requestJson(`${BASE}/users/by-role?role=${encodeURIComponent(role)}`);
  },
  updateRole: (email: string, role: string): Promise<ApiResponse<any>> => {
    return requestJson(`${BASE}/users/update-role`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  },
};

export const teamsService = {
  getAll: (): Promise<ApiResponse<TeamRow[]>> => {
    return requestJson(`${BASE}/teams`);
  },
  create: (payload: {
    name_team: string;
    leader_id: string;
    member_ids: string[];
  }): Promise<ApiResponse<TeamRow[]>> => {
    return requestJson(`${BASE}/teams`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update: (payload: {
    name_team: string;
    leader_id: string;
    member_ids: string[];
  }): Promise<ApiResponse<TeamRow[]>> => {
    return requestJson(`${BASE}/teams`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  delete: (name_team: string, leader_id: string): Promise<ApiResponse<{ deleted: number }>> => {
    return requestJson(
      `${BASE}/teams?name_team=${encodeURIComponent(name_team)}&leader=${encodeURIComponent(leader_id)}`,
      { method: "DELETE" }
    );
  },
};

// ── PLATFORMS ────────────────────────────────────────────────────────────────

export interface SocialPlatform {
  id: number;
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  icon_url?: string;
}

export const platformsService = {
  getAll: (): Promise<ApiResponse<SocialPlatform[]>> => {
    return requestJson(`${BASE}/platforms`);
  },
};

// ── FACEBOOK CRAWL ─────────────────────────────────────────────────────────────

export interface CrawlFacebookGroupItem {
  name: string;
  url: string;
  intent?: string;
}

export interface CrawlFacebookTkFB {
  useName?: string;
  password?: string;
}

export interface CrawlFacebookGroupResult {
  group_url: string;
  success: boolean;
  posts_count: number;
  error?: string;
}

export interface CrawlFacebookResponse {
  success: boolean;
  message: string;
  data?: {
    total_groups_ok: number;
    total_groups_failed: number;
    total_sessions_saved: number;
    total_posts_saved: number;
    groups_results: CrawlFacebookGroupResult[];
    errors: string[];
  };
}

export const crawlFacebookService = {
  crawl: (payload: {
    groups: CrawlFacebookGroupItem[];
    tkFB?: CrawlFacebookTkFB;
  }): Promise<ApiResponse<CrawlFacebookResponse>> => {
    return requestJson(`${BASE}/facebook/crawl`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export interface AdminDashboardSummaryData {
  total_crawled_posts: number;
  total_seeding_comments: number;
  approval_rate: number;
  kpi_rate: number;
}

export interface AdminKpiPerformanceData {
  team_name: string;
  target: number;
  actual: number;
}

export interface AdminLeaderboardsData {
  top_seeders: Array<{
    name: string;
    email: string;
    count: number;
  }>;
  top_groups: Array<{
    name: string;
    url: string;
    interactions: number;
  }>;
}

export const adminDashboardService = {
  getSummary: (): Promise<ApiResponse<AdminDashboardSummaryData>> => {
    return requestJson(`${BASE}/admin/dashboard/summary`);
  },
  getKpiPerformance: (): Promise<ApiResponse<AdminKpiPerformanceData[]>> => {
    return requestJson(`${BASE}/admin/dashboard/kpi-performance`);
  },
  getLeaderboards: (): Promise<ApiResponse<AdminLeaderboardsData>> => {
    return requestJson(`${BASE}/admin/dashboard/leaderboards`);
  },
};

// ── FB INBOX ACCOUNTS ─────────────────────────────────────────────────────────

export interface FbInboxAccount {
  id: string;
  id_member: string;
  user_id: string;        // Seeder service user_id (VD: "fb_10001")
  fb_user_id?: string;    // Facebook UID thật
  account_label?: string; // Tên hiển thị
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const fbInboxAccountService = {
  /**
   * Link FB inbox account với tài khoản của member.
   * Member gọi API này để thêm FB account vào app.
   * Backend sẽ decode JWT để lấy id_member và lưu vào bảng fb_inbox_accounts.
   */
  create: (payload: {
    user_id: string;
    fb_user_id?: string;
    account_label?: string;
  }): Promise<ApiResponse<FbInboxAccount>> => {
    return requestJson(`${BASE}/inbox-accounts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy danh sách FB inbox accounts của member hiện tại.
   */
  list: (): Promise<ApiResponse<{ accounts: FbInboxAccount[]; total: number }>> => {
    return requestJson(`${BASE}/inbox-accounts`);
  },

  /**
   * Lấy thông tin 1 FB inbox account theo seeder user_id.
   */
  getByUserId: (userId: string): Promise<ApiResponse<FbInboxAccount | null>> => {
    return requestJson(`${BASE}/inbox-accounts/${encodeURIComponent(userId)}`);
  },

  /**
   * Resolve seeder user_id -> id_member.
   * Dùng để kiểm tra xem 1 seeder user_id thuộc về member nào.
   */
  resolve: (userId: string): Promise<ApiResponse<{
    user_id: string;
    id_member: string | null;
    found: boolean;
    message: string;
  }>> => {
    return requestJson(`${BASE}/inbox-accounts/resolve/${encodeURIComponent(userId)}`);
  },

  /**
   * Cập nhật FB inbox account.
   */
  update: (accountId: string, payload: {
    fb_user_id?: string;
    account_label?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<FbInboxAccount>> => {
    return requestJson(`${BASE}/inbox-accounts/${encodeURIComponent(accountId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Xóa FB inbox account.
   */
  delete: (accountId: string): Promise<ApiResponse<void>> => {
    return requestJson(`${BASE}/inbox-accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
    });
  },
};
