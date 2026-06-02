/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/* Unified TypeScript types for the All-Platform (Tổng hợp) page.
   These types mirror the Supabase database schema. */

export type FeedPlatform = "facebook" | "linkedin";
export type CategoryType = "intent" | "industry" | "tier" | "team" | "icp";
export type VerifyStatus = "pending" | "yes" | "no";
export type UserRole = "member" | "leader" | "admin";

// ── Posts ────────────────────────────────────────────────────────────────────

export interface UnifiedPost {
  id: string;
  platform: FeedPlatform;
  session_id?: string;
  group_name: string;
  group_url: string;
  post_url: string;
  crawl_date: string;
  post_time?: string;
  content: string;
  score: number;
  reactions: number;
  comments: number;
  shares: number;
  author?: string;
  media_url?: string;
  image_urls?: string[];
  intent?: string;
  industry?: string;
  team?: string;
  tier?: number;
  created_at?: string;
  seeding_content?: string;
  seeding_name?: string;
  link_comment?: string;
  verify_status?: VerifyStatus;
}

export interface GetAllPostsRequest {
  email: string;
  date_from?: string;
  date_to?: string;
  intent?: string;
}

export interface FilterPostsRequest {
  email: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  intent?: string;
  industry?: string;
  team?: string;
  tier?: number;
}

// ── Seeding ──────────────────────────────────────────────────────────────────

export interface SeedingMark {
  id: string;
  email_member: string;
  name?: string;
  link_post: string;
  link_comment?: string;
  name_profile?: string;
  platform: FeedPlatform;
  content?: string;
  verify: VerifyStatus;
  current_day: string;
  profile_id?: string;
  facebook_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SeedingCountResult {
  verified_count: number;
  total_count: number;
  kpi_target: number;
  items: SeedingMark[];
}

// ── KPI ──────────────────────────────────────────────────────────────────────

export interface KpiWeekItem {
  start_day: string;
  end_day: string;
  total_reaction: number;
  total_comment: number;
  total_post_crawl: number;
  total_session_crawl: number;
  platform: FeedPlatform;
}

export interface KpiAssignment {
  id: string;
  email_member: string;
  name?: string;
  url_profile?: string;
  email_leader: string;
  platform: FeedPlatform;
  kpi_per_week: number;
  start_date: string;
  end_date: string;
  status: "active" | "inactive";
  created_at?: string;
}

export interface KpiMember {
  email: string;
  role: UserRole;
  name?: string;
  profile_slug?: string;
  email_leader?: string;
  profile_id?: string;
  facebook_name?: string;
  kpi: KpiAssignment[];
  seeding_stats?: SeedingCountResult;
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  category_type: CategoryType;
  code: string;
  name?: string;
  description?: string;
  leader?: string;
  geo?: string;
  platform: string;
  created_at?: string;
}

// ── Users & Teams ─────────────────────────────────────────────────────────────

export interface TeamMember {
  email: string;
  name?: string;
  slug?: string;
  role: UserRole;
  email_leader?: string;
  profile_id?: string;
  facebook_name?: string;
}

// ── Groups ────────────────────────────────────────────────────────────────────

export interface FacebookGroup {
  id: string;
  group_name: string;
  group_url: string;
  intent?: string;
  industry?: string;
  tier?: number;
  team?: string;
  icp?: string;
  icp_desc?: string;
  members?: number;
  posts_per_week?: number;
  health_score?: number;
  chay_24h?: boolean;
  last_crawl?: string;
  created_at?: string;
  // FK taxonomy ids (database columns)
  id_intent?: string;
  id_industry?: string;
  id_tier?: string;
  id_team?: string;
  id_icp?: string;
  // Resolved taxonomy display names (joined from categories table)
  intent_name?: string;
  industry_name?: string;
  tier_name?: string;
  team_name?: string;
  icp_name?: string;
}

export interface LinkedInGroup {
  id: string;
  group_name: string;
  group_url: string;
  email_crawl?: string;
  status: string;
  intent?: string;
  industry?: string;
  tier?: number;
  team?: string;
  icp?: string;
  icp_desc?: string;
  created_at?: string;
  // FK taxonomy ids (database columns)
  id_intent?: string;
  id_industry?: string;
  id_tier?: string;
  id_team?: string;
  id_icp?: string;
  // Resolved taxonomy display names (joined from categories table)
  intent_name?: string;
  industry_name?: string;
  tier_name?: string;
  team_name?: string;
  icp_name?: string;
}

// ── Crawl Sessions ─────────────────────────────────────────────────────────────

export interface CrawlSession {
  id: string;
  session_id: string;
  email_crawl: string;
  platform: FeedPlatform;
  group_name: string;
  group_url: string;
  posts_count: number;
  status: string;
  created_at?: string;
}

// ── API Response Wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// ── Auth ────────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface AuthLoginResponse {
  user: AppUser;
  access_token: string;
}

export interface SocialAccount {
  id: string;
  app_user_id: string;
  platform: FeedPlatform;
  account_name: string;
  account_email?: string;
  account_password?: string;
  account_profile_id?: string;  // Profile ID on the social platform
  id_platform?: number;         // FK to platforms table
  two_fa_secret?: string;
  two_fa_enabled: boolean;
  session_cookie?: string;
  is_active: boolean;
  is_primary: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SocialAccountSummary {
  [platform: string]: {
    total: number;
    active: number;
    primary: string | null;
  };
}

// ── Dashboard Stats ────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPostsToday: number;
  postsYesterday: number;
  highScoreCount: number;
  seededToday: number;
  totalVisible: number;
  scoreDistribution: {
    high: number;   // >= 85
    medium: number; // 60-84
    low: number;    // < 60
  };
}

export interface UnifiedStats {
  totalPostsToday: number;
  postsYesterday: number;
  totalPosts?: number;
  highScoreCount: number;
  highScorePercent: number;
  seededToday: number;
  totalVisible?: number;
  kpiProgress?: number;
  kpiTarget?: number;
  kpiProgressPercent?: number;
}
