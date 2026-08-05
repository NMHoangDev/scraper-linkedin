export type SeedingPlatform = "facebook" | "linkedin" | "gmail" | "tiktok" | "zalo";

export type AccountStatus = "online" | "idle" | "offline" | "warning";

export interface SeedingAccount {
  id: string;
  platform: SeedingPlatform;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: AccountStatus;
  onlineTodayMinutes: number;
  onlineWeekMinutes: number;
  lastActiveAt: string; // ISO datetime
  twoFactorVerified: boolean;
  recentInactiveDays?: number;
  note?: string;
}

export interface SeedingAccountStats {
  totalAccounts: number;
  onlineCount: number;
  offlineCount: number;
  totalOnlineTodayHours: number;
  alertCount: number;
}

export interface PlatformBreakdown {
  platform: SeedingPlatform;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface WeeklyVsTodayChartData {
  accountName: string;
  weeklyHours: number;
  todayHours: number;
  avatar?: string;
}

export interface TopOnlineEntry {
  rank: number;
  accountId: string;
  name: string;
  platform: SeedingPlatform;
  onlineTodayMinutes: number;
  avatar?: string;
}

export interface AccountAlert {
  id: string;
  accountId: string;
  accountName: string;
  platform: SeedingPlatform;
  type: "inactive" | "unverified_2fa" | "low_activity";
  message: string;
  severity: "high" | "medium" | "low";
  daysSinceLastActive?: number;
}

