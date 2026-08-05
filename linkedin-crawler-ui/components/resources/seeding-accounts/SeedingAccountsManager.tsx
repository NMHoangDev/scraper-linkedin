"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";
import { SeedingAccountTable } from "./SeedingAccountTable";
import { SeedingActivityComboChart } from "./SeedingActivityComboChart";
import { PlatformBreakdownPanel } from "./PlatformBreakdownPanel";
import { TopOnlineLeaderboard } from "./TopOnlineLeaderboard";
import { AccountAlertsPanel } from "./AccountAlertsPanel";
import { AddAccountDialog } from "./AddAccountDialog";
import { BulkImportDialog } from "./BulkImportDialog";
import {
  Users,
  CheckCircle2,
  PauseCircle,
  History,
  AlertTriangle,
} from "lucide-react";
import type {
  SeedingAccount,
  SeedingAccountStats,
  PlatformBreakdown,
  WeeklyVsTodayChartData,
  TopOnlineEntry,
  AccountAlert,
} from "@/types/seeding-account.types";

const MOCK_ACCOUNTS: SeedingAccount[] = [
  { id: "1", platform: "facebook", name: "Nguyễn Văn A", email: "nguyenvana@gmail.com", status: "online", onlineTodayMinutes: 128, onlineWeekMinutes: 840, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
  { id: "2", platform: "facebook", name: "Trần Thị B", email: "tranthib@facebook.com", status: "online", onlineTodayMinutes: 96, onlineWeekMinutes: 620, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
  { id: "3", platform: "linkedin", name: "Lê Văn C", email: "levantc@linkedin.com", status: "online", onlineTodayMinutes: 72, onlineWeekMinutes: 510, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
  { id: "4", platform: "facebook", name: "Phạm Thị D", email: "phamthid@gmail.com", status: "idle", onlineTodayMinutes: 45, onlineWeekMinutes: 380, lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), twoFactorVerified: true },
  { id: "5", platform: "gmail", name: "Hoàng Văn E", email: "hoangvane@gmail.com", status: "online", onlineTodayMinutes: 60, onlineWeekMinutes: 420, lastActiveAt: new Date().toISOString(), twoFactorVerified: false },
  { id: "6", platform: "tiktok", name: "Đỗ Thị F", email: "dothif@tiktok.com", status: "offline", onlineTodayMinutes: 0, onlineWeekMinutes: 120, lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), twoFactorVerified: true },
  { id: "7", platform: "zalo", name: "Vũ Văn G", email: "vuvang@zalo.me", status: "online", onlineTodayMinutes: 88, onlineWeekMinutes: 560, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
  { id: "8", platform: "linkedin", name: "Ngô Thị H", email: "ngothih@linkedin.com", status: "offline", onlineTodayMinutes: 0, onlineWeekMinutes: 200, lastActiveAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), twoFactorVerified: false },
  { id: "9", platform: "facebook", name: "Bùi Văn I", email: "buivani@gmail.com", status: "idle", onlineTodayMinutes: 30, onlineWeekMinutes: 290, lastActiveAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), twoFactorVerified: true },
  { id: "10", platform: "gmail", name: "Lý Thị K", email: "lythik@gmail.com", status: "offline", onlineTodayMinutes: 0, onlineWeekMinutes: 80, lastActiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), twoFactorVerified: false },
  { id: "11", platform: "zalo", name: "Mai Văn L", email: "maivanl@zalo.me", status: "online", onlineTodayMinutes: 110, onlineWeekMinutes: 720, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
  { id: "12", platform: "facebook", name: "Đặng Thị M", email: "dangthim@gmail.com", status: "idle", onlineTodayMinutes: 15, onlineWeekMinutes: 150, lastActiveAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), twoFactorVerified: false },
  { id: "13", platform: "linkedin", name: "Trịnh Văn N", email: "trinhvann@gmail.com", status: "online", onlineTodayMinutes: 55, onlineWeekMinutes: 340, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
  { id: "14", platform: "tiktok", name: "Hồ Thị P", email: "hothip@tiktok.com", status: "offline", onlineTodayMinutes: 0, onlineWeekMinutes: 60, lastActiveAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), twoFactorVerified: false },
  { id: "15", platform: "facebook", name: "Dương Văn Q", email: "duongvanq@gmail.com", status: "online", onlineTodayMinutes: 75, onlineWeekMinutes: 480, lastActiveAt: new Date().toISOString(), twoFactorVerified: true },
];

const MOCK_STATS: SeedingAccountStats = {
  totalAccounts: 15,
  onlineCount: 8,
  offlineCount: 4,
  totalOnlineTodayHours: 12.5,
  alertCount: 3,
};

const MOCK_CHART_DATA: WeeklyVsTodayChartData[] = [
  { accountName: "Nguyễn Văn A", weeklyHours: 14, todayHours: 2.13 },
  { accountName: "Mai Văn L", weeklyHours: 12, todayHours: 1.83 },
  { accountName: "Trần Thị B", weeklyHours: 10.33, todayHours: 1.6 },
  { accountName: "Vũ Văn G", weeklyHours: 9.33, todayHours: 1.47 },
  { accountName: "Dương Văn Q", weeklyHours: 8, todayHours: 1.25 },
  { accountName: "Hoàng Văn E", weeklyHours: 7, todayHours: 1 },
  { accountName: "Lê Văn C", weeklyHours: 8.5, todayHours: 1.2 },
  { accountName: "Trịnh Văn N", weeklyHours: 5.67, todayHours: 0.92 },
];

const MOCK_PLATFORM_BREAKDOWN: PlatformBreakdown[] = [
  { platform: "facebook", label: "Facebook", count: 6, percentage: 40, color: "#1877f2" },
  { platform: "linkedin", label: "LinkedIn", count: 3, percentage: 20, color: "#0a66c2" },
  { platform: "gmail", label: "Gmail", count: 2, percentage: 13, color: "#ea4335" },
  { platform: "tiktok", label: "TikTok", count: 2, percentage: 13, color: "#000000" },
  { platform: "zalo", label: "Zalo", count: 2, percentage: 13, color: "#0068ff" },
];

const MOCK_TOP_ONLINE: TopOnlineEntry[] = [
  { rank: 1, accountId: "1", name: "Nguyễn Văn A", platform: "facebook", onlineTodayMinutes: 128 },
  { rank: 2, accountId: "11", name: "Mai Văn L", platform: "zalo", onlineTodayMinutes: 110 },
  { rank: 3, accountId: "2", name: "Trần Thị B", platform: "facebook", onlineTodayMinutes: 96 },
  { rank: 4, accountId: "7", name: "Vũ Văn G", platform: "zalo", onlineTodayMinutes: 88 },
  { rank: 5, accountId: "15", name: "Dương Văn Q", platform: "facebook", onlineTodayMinutes: 75 },
];

const MOCK_ALERTS: AccountAlert[] = [
  { id: "a1", accountId: "6", accountName: "Đỗ Thị F", platform: "tiktok", type: "inactive", message: "Không hoạt động 3 ngày", severity: "medium", daysSinceLastActive: 3 },
  { id: "a2", accountId: "10", accountName: "Lý Thị K", platform: "gmail", type: "inactive", message: "Không hoạt động 10 ngày", severity: "high", daysSinceLastActive: 10 },
  { id: "a3", accountId: "5", accountName: "Hoàng Văn E", platform: "gmail", type: "unverified_2fa", message: "Chưa xác minh 2 lớp", severity: "high" },
  { id: "a4", accountId: "8", accountName: "Ngô Thị H", platform: "linkedin", type: "inactive", message: "Không hoạt động 5 ngày", severity: "medium", daysSinceLastActive: 5 },
  { id: "a5", accountId: "14", accountName: "Hồ Thị P", platform: "tiktok", type: "inactive", message: "Không hoạt động 7 ngày", severity: "high", daysSinceLastActive: 7 },
];

export function SeedingAccountsManager() {
  const [accounts] = useState<SeedingAccount[]>(MOCK_ACCOUNTS);
  const [stats] = useState<SeedingAccountStats>(MOCK_STATS);
  const [chartData] = useState<WeeklyVsTodayChartData[]>(MOCK_CHART_DATA);
  const [platformBreakdown] = useState<PlatformBreakdown[]>(MOCK_PLATFORM_BREAKDOWN);
  const [topOnline] = useState<TopOnlineEntry[]>(MOCK_TOP_ONLINE);
  const [alerts] = useState<AccountAlert[]>(MOCK_ALERTS);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (search && !acc.name.toLowerCase().includes(search.toLowerCase()) && !acc.email?.toLowerCase().includes(search.toLowerCase())) return false;
      if (platformFilter !== "all" && acc.platform !== platformFilter) return false;
      if (statusFilter !== "all" && acc.status !== statusFilter) return false;
      if (activeTab === "online" && acc.status !== "online") return false;
      if (activeTab === "offline" && acc.status !== "offline" && acc.status !== "idle") return false;
      if (activeTab === "warning" && acc.status !== "warning" && acc.twoFactorVerified !== false) return false;
      return true;
    });
  }, [accounts, search, platformFilter, statusFilter, activeTab]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Quản lý tài khoản Seeding</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi và quản lý toàn bộ tài khoản seeding đa nền tảng tập trung.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            className="flex items-center gap-[6px] rounded-[10px] border border-[#c71f4d] bg-white px-[14px] py-[9px] text-[13px] font-bold text-[#c71f4d] transition-colors hover:bg-[#fff5f7]"
          >
            Nhập hàng loạt
          </button>
          <button
            type="button"
            onClick={() => setAddDialogOpen(true)}
            className="flex items-center gap-[6px] rounded-[10px] border border-[#c71f4d] bg-[#c71f4d] px-[14px] py-[9px] text-[13px] font-bold text-white transition-colors hover:bg-[#b01a42]"
          >
            + Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-5 lg:gap-[10px]">
        <StatCard
          label="Tổng tài khoản"
          value={stats.totalAccounts}
          iconBg="#eef2ff"
          iconColor="#4f46e5"
          icon={Users}
        />
        <StatCard
          label="Đang online"
          value={stats.onlineCount}
          meta={`${Math.round((stats.onlineCount / stats.totalAccounts) * 100)}% tổng số`}
          metaColor="good"
          iconBg="#eafaf3"
          iconColor="#087a50"
          icon={CheckCircle2}
        />
        <StatCard
          label="Offline"
          value={stats.offlineCount}
          meta={`${Math.round((stats.offlineCount / stats.totalAccounts) * 100)}% tổng số`}
          metaColor="warn"
          iconBg="#f2f3f6"
          iconColor="#737785"
          icon={PauseCircle}
        />
        <StatCard
          label="Tổng giờ online hôm nay"
          value={`${stats.totalOnlineTodayHours.toFixed(1)}h`}
          iconBg="#fff3da"
          iconColor="#a16207"
          icon={History}
        />
        <StatCard
          label="Cần cảnh báo"
          value={stats.alertCount}
          meta="Tài khoản cần xử lý"
          metaColor="bad"
          iconBg="#fdebf1"
          iconColor="#c71f4d"
          icon={AlertTriangle}
        />
      </div>

      {/* Main content: chart + right panels */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Combo Chart */}
          <SeedingActivityComboChart data={chartData} />

          {/* Table */}
          <SeedingAccountTable
            accounts={filteredAccounts}
            search={search}
            onSearchChange={setSearch}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <PlatformBreakdownPanel data={platformBreakdown} />
          <TopOnlineLeaderboard data={topOnline} />
          <AccountAlertsPanel data={alerts} />
        </div>
      </div>

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={triggerRefresh}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={triggerRefresh}
      />
    </div>
  );
}

