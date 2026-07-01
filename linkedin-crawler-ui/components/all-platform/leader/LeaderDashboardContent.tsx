"use client";

import { useEffect, useMemo, useState, useRef, type ReactNode, memo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import {
  allPlatformGroupsService,
  allPlatformKpiService,
  allPlatformPostsService,
  teamsService,
  type TeamRow,
} from "@/services/all-platform.service";
import type { FacebookGroup, LinkedInGroup, UnifiedPost } from "@/types/unified.types";
import { useKpiRefresh } from "@/lib/useKpiRefresh";

type GroupRecord = FacebookGroup | LinkedInGroup;

// Phase 3: memo MetricCard để tránh re-render cả grid khi đổi team/tuần.
const MetricCard = memo(function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-none">
      <p className="text-xs font-semibold capitalize text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
});

function getRecentWeeks(numWeeks = 8) {
  const weeks: Array<{ label: string; value: string }> = [];
  const curr = new Date();

  for (let i = 0; i < numWeeks; i += 1) {
    const d = new Date(curr.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const yearStart = new Date(monday.getFullYear(), 0, 1);
    const weekNo = Math.ceil(
      ((monday.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7,
    );

    const fmt = (dt: Date) =>
      dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const valStart = monday.toISOString().split("T")[0];
    const valEnd = sunday.toISOString().split("T")[0];

    weeks.push({
      label: `Tuần ${weekNo} (${fmt(monday)} - ${fmt(sunday)})`,
      value: `${valStart}_${valEnd}`,
    });
  }

  return weeks;
}

function buildDistribution(
  groups: GroupRecord[],
  getLabel: (group: GroupRecord) => string | undefined,
) {
  const map = new Map<string, number>();

  groups.forEach((group) => {
    const label = (getLabel(group) || "").trim() || "Chưa gắn";
    map.set(label, (map.get(label) || 0) + 1);
  });

  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getGroupHealthScore(group: GroupRecord) {
  return "health_score" in group && typeof group.health_score === "number"
    ? group.health_score
    : 60;
}

function ProgressListCard({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: string;
  items: Array<{ label: string; count: number }>;
  emptyText: string;
}) {
  const max = items[0]?.count || 1;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-none">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <MaterialIcon name={icon as any} className="text-[18px] text-[#DC2626]" />
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">{emptyText}</p>
        ) : (
          items.map((item) => {
            const percent = Math.max(10, Math.round((item.count / max) * 100));

            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold text-slate-700">{item.label}</span>
                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#DC2626]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SideInfoCard({
  title,
  icon,
  children,
  href,
  actionLabel,
}: {
  title: string;
  icon: string;
  children: ReactNode;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-none">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <MaterialIcon name={icon as any} className="text-[18px] text-[#DC2626]" />
        {title}
      </h3>
      <div className="mt-4 space-y-3">{children}</div>
      <Link
        href={href}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export function LeaderDashboardContent() {
  const { user } = useAppAuth();
  const router = useRouter();
  const recentWeeks = useMemo(() => getRecentWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState(recentWeeks[0]?.value || "");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [kpiMembers, setKpiMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures in event listener
  const userRef = useRef(user);
  const teamsRef = useRef(teams);
  const selectedTeamIdRef = useRef(selectedTeamId);
  const selectedWeekRef = useRef(selectedWeek);
  userRef.current = user;
  teamsRef.current = teams;
  selectedTeamIdRef.current = selectedTeamId;
  selectedWeekRef.current = selectedWeek;

  useEffect(() => {
    if (!user?.id || user.role !== "leader") return;

    const loadTeams = async () => {
      const res = await teamsService.getAll();
      if (!res.success || !res.data) {
        setError(res.message || "Không thể tải danh sách team.");
        return;
      }

      const myTeams = res.data.filter((team) => team.id_leader === user.id);
      setTeams(myTeams);
      setSelectedTeamId((current) => current || myTeams[0]?.id || "");
    };

    void loadTeams();
  }, [user?.id, user?.role]);

  const loadOverview = useCallback(async () => {
    const currentUser = userRef.current;
    const currentTeams = teamsRef.current;
    const currentTeamId = selectedTeamIdRef.current;
    const currentWeek = selectedWeekRef.current;

    if (!currentUser?.email || !currentTeamId) return;

    const [startDate, endDate] = currentWeek.split("_");
    const selectedTeam = currentTeams.find((team) => team.id === currentTeamId);
    if (!selectedTeam) return;

    setLoading(true);
    setError(null);

    try {
      const [kpiRes, fbGroupsRes, liGroupsRes, fbPostsRes, liPostsRes] = await Promise.all([
        allPlatformKpiService.getTeamOverviewV3(currentUser.email, currentTeamId, startDate, endDate),
        allPlatformGroupsService.getAll("facebook"),
        allPlatformGroupsService.getAll("linkedin"),
        allPlatformPostsService.filter({
          email: currentUser.email,
          platform: "facebook",
          team: selectedTeam.name_team,
          date_from: startDate,
          date_to: endDate,
          page: 1,
          page_size: 20,
        }),
        allPlatformPostsService.filter({
          email: currentUser.email,
          platform: "linkedin",
          team: selectedTeam.name_team,
          date_from: startDate,
          date_to: endDate,
          page: 1,
          page_size: 20,
        }),
      ]);

      setKpiMembers(kpiRes.success && kpiRes.data?.members ? kpiRes.data.members : []);

      const allGroups = [
        ...((fbGroupsRes.success && fbGroupsRes.data ? fbGroupsRes.data : []) as FacebookGroup[]),
        ...((liGroupsRes.success && liGroupsRes.data ? liGroupsRes.data : []) as LinkedInGroup[]),
      ].filter((group) => {
        const matchesTeamId = String((group as FacebookGroup).id_team || "") === currentTeamId;
        const matchesTeamName =
          String((group as FacebookGroup).team_name || "").trim() === selectedTeam.name_team;
        return matchesTeamId || matchesTeamName;
      });

      setGroups(allGroups);

      const combinedPosts = [
        ...(fbPostsRes.success && fbPostsRes.data?.posts ? fbPostsRes.data.posts : []),
        ...(liPostsRes.success && liPostsRes.data?.posts ? liPostsRes.data.posts : []),
      ].sort((a, b) => (b.score || 0) - (a.score || 0));

      setPosts(combinedPosts);
    } catch (overviewError) {
      console.error("Failed to load leader dashboard", overviewError);
      setError("Không thể tải dashboard leader.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for KPI refresh events (triggered after bulk verify, etc.)
  useKpiRefresh(loadOverview);

  useEffect(() => {
    void loadOverview();
  }, [selectedTeamId, selectedWeek, teams, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [selectedTeamId, teams],
  );

  const memberMetrics = useMemo(() => {
    const teamMembers = selectedTeam?.members || [];

    return teamMembers.map((member) => {
      const kpiInfo = kpiMembers.find((row) => row.id === member.id) || {};
      const stats = kpiInfo.seeding_stats || {};
      const commentCurrent = stats.verified_count || 0;
      const commentTarget = stats.kpi_target || 0;
      const postCurrent = stats.kpi_post_current || 0;
      const postTarget = stats.kpi_post || 0;
      const leadCurrent = stats.kpi_lead_current || 0;
      const leadTarget = stats.kpi_lead || 0;
      const inboxCurrent = stats.kpi_inbox_current || 0;
      const inboxTarget = stats.kpi_inbox || 0;
      const traffic = commentCurrent + postCurrent + inboxCurrent;
      const totalCurrent = commentCurrent + postCurrent + leadCurrent + inboxCurrent;
      const totalTarget = commentTarget + postTarget + leadTarget + inboxTarget;

      return {
        ...member,
        commentCurrent,
        commentTarget,
        postCurrent,
        postTarget,
        leadCurrent,
        leadTarget,
        inboxCurrent,
        inboxTarget,
        traffic,
        totalCurrent,
        totalTarget,
      };
    });
  }, [kpiMembers, selectedTeam]);

  const totalGroups = groups.length;
  const totalComments = memberMetrics.reduce((sum, member) => sum + member.commentCurrent, 0);
  const totalLeads = memberMetrics.reduce((sum, member) => sum + member.leadCurrent, 0);
  const totalTraffic = memberMetrics.reduce((sum, member) => sum + member.traffic, 0);

  const industryDistribution = useMemo(
    () => buildDistribution(groups, (group) => group.industry_name || group.industry),
    [groups],
  );
  const tierDistribution = useMemo(
    () => buildDistribution(groups, (group) => group.tier_name || (group.tier ? `Tier ${group.tier}` : "")),
    [groups],
  );
  const icpDistribution = useMemo(
    () => buildDistribution(groups, (group) => group.icp_name || group.icp),
    [groups],
  );

  const unassignedPosts = useMemo(
    () => posts.filter((post) => !post.verify_status || post.verify_status === "pending").slice(0, 5),
    [posts],
  );

  const topTrafficMembers = useMemo(
    () =>
      [...memberMetrics]
        .sort((a, b) => b.traffic - a.traffic || b.leadCurrent - a.leadCurrent)
        .slice(0, 6),
    [memberMetrics],
  );

  const totalCurrent = memberMetrics.reduce((sum, member) => sum + member.totalCurrent, 0);
  const totalTarget = memberMetrics.reduce((sum, member) => sum + member.totalTarget, 0);
  const kpiPercent = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;

  const healthyMembers = memberMetrics.filter(
    (member) => member.totalTarget > 0 && member.totalCurrent >= member.totalTarget,
  ).length;
  const stalledMembers = memberMetrics.filter(
    (member) => member.totalCurrent === 0 && member.totalTarget > 0,
  ).length;
  const reviewMembers = Math.max(memberMetrics.length - healthyMembers - stalledMembers, 0);

  const aliveGroups = groups.filter((group) => getGroupHealthScore(group) >= 60).length;
  const warningGroups = groups.filter((group) => {
    const score = getGroupHealthScore(group);
    return score >= 20 && score < 60;
  }).length;
  const atRiskGroups = groups.filter((group) => getGroupHealthScore(group) < 20).length;
  const missingTaxonomyGroups = groups.filter(
    (group) => !(group.intent_name || group.industry_name || group.icp_name || group.tier_name),
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 bg-white font-sans">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#DC2626]/10 text-[#DC2626]">
            <MaterialIcon name="dashboard" className="text-[28px]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">
              Dashboard leader
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tổng quan hiệu suất team, nhóm và nội dung cần xử lý trong tuần.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          >
            {teams.length === 0 ? <option value="">Chưa có team</option> : null}
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name_team}
              </option>
            ))}
          </select>

          <select
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
            className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          >
            {recentWeeks.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#DC2626]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Tổng groups" value={loading ? "..." : totalGroups} />
        <MetricCard label="Comment tuần này" value={loading ? "..." : totalComments} />
        <MetricCard label="Leads mang về" value={loading ? "..." : totalLeads} />
        <MetricCard label="UTM traffic" value={loading ? "..." : totalTraffic} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_340px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <ProgressListCard
              title="Groups theo ngành"
              icon="groups"
              items={industryDistribution}
              emptyText="Chưa có nhóm nào trong team này."
            />
            <ProgressListCard
              title="Phân bổ theo tier"
              icon="stacked_bar_chart"
              items={tierDistribution}
              emptyText="Chưa có dữ liệu tier."
            />
            <ProgressListCard
              title="ICP phổ biến"
              icon="person_search"
              items={icpDistribution}
              emptyText="Chưa có dữ liệu ICP."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-none">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MaterialIcon name="trending_up" className="text-[18px] text-[#DC2626]" />
                  Bài viết có lượt tương tác cao
                </h3>
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {unassignedPosts.length} bài
                </span>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {unassignedPosts.length === 0 ? (
                  <p className="py-8 text-xs text-slate-400">Chưa có bài nào cần seeding.</p>
                ) : (
                  unassignedPosts.map((post) => (
                    <div key={post.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{post.group_name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.content}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span>Score {post.score}</span>
                          <span>{post.platform}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/all-platform/post-feed")}
                        className="inline-flex items-center justify-center rounded-xl bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Assign
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-none">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MaterialIcon name="analytics" className="text-[18px] text-[#DC2626]" />
                  UTM Top Performers tuần này
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold capitalize text-slate-500">Thành viên</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold capitalize text-slate-500">Team</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold capitalize text-slate-500">Traffic</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold capitalize text-slate-500">Leads</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold capitalize text-slate-500">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTrafficMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                          Chưa có dữ liệu hiệu suất trong tuần này.
                        </td>
                      </tr>
                    ) : (
                      topTrafficMembers.map((member) => (
                        <tr key={member.id} className="border-b border-slate-50 last:border-b-0">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900">{member.name || member.email}</div>
                            <div className="text-[11px] text-slate-400">{member.email}</div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{selectedTeam?.name_team || "-"}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{member.traffic}</td>
                          <td className="px-4 py-3.5 text-right text-slate-600">{member.leadCurrent}</td>
                          <td className="px-4 py-3.5 text-right text-slate-600">{member.commentCurrent}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SideInfoCard
            title="Team KPI"
            icon="monitoring"
            href="/all-platform/leader/team"
            actionLabel="Xem Leaderboard"
          >
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{selectedTeam?.name_team || "Chưa chọn team"}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{kpiPercent}%</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {totalCurrent}/{totalTarget || 0}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#DC2626]" style={{ width: `${kpiPercent}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 px-2 py-3">
                <p className="text-[11px] text-slate-400">Đạt KPI</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{healthyMembers}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-3">
                <p className="text-[11px] text-slate-400">Đang chạy</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{reviewMembers}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-3">
                <p className="text-[11px] text-slate-400">Chưa chạy</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{stalledMembers}</p>
              </div>
            </div>
          </SideInfoCard>

          <SideInfoCard
            title="Account Safety"
            icon="shield"
            href="/all-platform/quan-ly-tai-khoan"
            actionLabel="Xem chi tiết"
          >
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Ổn định</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                {healthyMembers}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Cần theo dõi</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                {reviewMembers}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Không hoạt động</span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                {stalledMembers}
              </span>
            </div>
          </SideInfoCard>

          <SideInfoCard
            title="Groups Health"
            icon="folder"
            href="/all-platform/quan-ly-nhom"
            actionLabel="Xem chi tiết"
          >
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Đang sống</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                {aliveGroups}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Cần theo dõi</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                {warningGroups}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Rủi ro</span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                {atRiskGroups}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600">Thiếu taxonomy</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {missingTaxonomyGroups}
              </span>
            </div>
          </SideInfoCard>
        </div>
      </div>
    </div>
  );
}
