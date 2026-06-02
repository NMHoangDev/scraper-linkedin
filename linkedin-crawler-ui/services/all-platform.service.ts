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
  TeamMember,
  GetAllPostsRequest,
  ApiResponse,
  AppUser,
  AuthLoginResponse,
  SocialAccount,
  SocialAccountSummary,
} from "@/types/unified.types";
import { API_BASE_URL } from "@/lib/env";

const BASE = `${API_BASE_URL}/api/all-platform`;
const authHeaders = () => ({});

async function requestJson<T = any>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
    kpi: Array<{
      start_day: string;
      end_day: string;
      total_reaction: number;
      total_comment: number;
      total_post_crawl: number;
      total_session_crawl: number;
      platform: string;
    }>;
    platform: string;
  }): Promise<ApiResponse<KpiAssignment>> => {
    return requestJson(`${BASE}/kpi/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAll: (leader_email: string): Promise<ApiResponse<{ total: number; members: KpiMember[] }>> => {
    return requestJson(`${BASE}/kpi/get-all`, {
      method: "POST",
      body: JSON.stringify({ leader_email }),
    });
  },

  getByEmail: (email: string): Promise<ApiResponse<KpiMember>> => {
    return requestJson(`${BASE}/kpi/get-by-email`, {
      method: "POST",
      body: JSON.stringify({ email }),
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
    tier?: number;
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
    tier?: number;
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
    return requestJson(`${BASE}/auth/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login: (payload: { email: string; password: string }): Promise<ApiResponse<AuthLoginResponse>> => {
    return requestJson(`${BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
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
