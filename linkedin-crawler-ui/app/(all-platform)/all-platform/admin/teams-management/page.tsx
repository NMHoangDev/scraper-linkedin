"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";
import { teamsService, allPlatformKpiService } from "@/services/all-platform.service";
import type { TeamRow } from "@/services/all-platform.service";
import { AdminTeamModal } from "@/components/all-platform/admin/AdminTeamModal";
import { AdminMemberKpiModal } from "@/components/all-platform/admin/AdminMemberKpiModal";
import { FaTrash, FaEdit, FaEye } from "react-icons/fa";
import {
  LuLayoutGrid,
  LuUsers,
  LuTarget,
  LuTrendingUp,
  LuFileText,
  LuMessageSquare,
  LuUserPlus,
  LuInbox,
} from "react-icons/lu";
import { LeaderInboxView } from "@/components/all-platform/leader/LeaderInboxView";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClassName,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  hint?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5">
      <div className={cn("w-fit rounded-lg p-2", iconClassName)}>
        <Icon size={20} />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
        <span className="text-2xl font-bold tracking-tight text-on-surface tabular-nums">
          {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
        </span>
        {hint ? <p className="text-[11px] text-on-surface-variant">{hint}</p> : null}
      </div>
    </div>
  );
}

function getRecentWeeks(numWeeks = 8) {
  const weeks = [];
  const curr = new Date();
  for (let i = 0; i < numWeeks; i++) {
    const d = new Date(curr.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const yearStart = new Date(monday.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + yearStart.getDay() + 1) / 7);

    const fmt = (dt: Date) => dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const valStart = monday.toISOString().split("T")[0];
    const valEnd = sunday.toISOString().split("T")[0];

    weeks.push({
      label: `Tuần ${weekNo} (${fmt(monday)} - ${fmt(sunday)})`,
      value: `${valStart}_${valEnd}`
    });
  }
  return weeks;
}

export default function TeamsManagementPage() {
  const { user } = useAppAuth();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [kpiResultsData, setKpiResultsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<TeamRow | null>(null);

  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [selectedTeamForKpi, setSelectedTeamForKpi] = useState<TeamRow | null>(null);

  const [inboxModalOpen, setInboxModalOpen] = useState(false);
  const [selectedLeaderForInbox, setSelectedLeaderForInbox] = useState<{ email: string; name: string } | null>(null);

  const recentWeeks = useMemo(() => getRecentWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState(recentWeeks[0].value);

  const isAdmin = (user?.role as string) === "admin" || (user?.role as string) === "superadmin";

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teamsService.getAll();
      if (res.success && res.data) {
        const teamsData = res.data;
        setTeams(teamsData);

        // Fetch KPI data for all teams' leaders in parallel
        const [startDate, endDate] = selectedWeek.split("_");
        const kpiPromises = teamsData.map(async (t) => {
          if (!t.leader_email) return { teamId: t.id, members: [] };
          try {
            const kpiRes = await allPlatformKpiService.getAll(t.leader_email, undefined, startDate, endDate);
            return { teamId: t.id, members: kpiRes.success ? (kpiRes.data?.members || []) : [] };
          } catch {
            return { teamId: t.id, members: [] };
          }
        });
        const kpiResults = await Promise.all(kpiPromises);
        setKpiResultsData(kpiResults);
      } else {
        setError(res.message || "Không thể tải danh sách team");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    if (isAdmin) {
      fetchTeams();
    }
  }, [isAdmin, fetchTeams]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((acc, t) => acc + (t.number_of_member || 0), 0);

    let totalTarget = 0;
    let totalCurrent = 0;
    let achievedTeams = 0;

    teams.forEach(team => {
      const teamKpis = kpiResultsData.find(r => r.teamId === team.id)?.members || [];
      let teamTarget = 0;
      let teamCurrent = 0;

      team.members?.forEach(member => {
        const kpiInfo = teamKpis.find((k: any) => k.id === member.id) || {};
        const seedingStats = kpiInfo.seeding_stats || {};

        teamTarget += (seedingStats.kpi_target || 0) + (seedingStats.kpi_post || 0) + (seedingStats.kpi_lead || 0) + (seedingStats.kpi_inbox || 0);
        teamCurrent += (seedingStats.verified_count || 0) + (seedingStats.kpi_post_current || 0) + (seedingStats.kpi_lead_current || 0) + (seedingStats.kpi_inbox_current || 0);
      });

      if (teamTarget > 0) {
        totalTarget += teamTarget;
        totalCurrent += teamCurrent;
        if (teamCurrent >= teamTarget) {
          achievedTeams++;
        }
      }
    });

    const completionRate = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;

    return {
      totalTeams,
      totalMembers,
      achievedTeams,
      completionRate,
    };
  }, [teams, kpiResultsData]);

  // Tong hop KPI (Post/Comment/Lead/Inbox) + % hoan thanh cho tung team - tinh 1 lan,
  // dung chung cho ca bieu do so sanh va cac card chi tiet ben duoi.
  const teamKpiSummaries = useMemo(() => {
    return teams.map(team => {
      const teamKpis = kpiResultsData.find(r => r.teamId === team.id)?.members || [];
      const totals = { post: 0, postTarget: 0, comment: 0, commentTarget: 0, lead: 0, leadTarget: 0, inbox: 0, inboxTarget: 0 };

      team.members?.forEach(member => {
        const kpiInfo = teamKpis.find((k: any) => k.id === member.id) || {};
        const st = kpiInfo.seeding_stats || {};
        totals.post += st.kpi_post_current || 0;
        totals.postTarget += st.kpi_post || 0;
        totals.comment += st.verified_count || 0;
        totals.commentTarget += st.kpi_target || 0;
        totals.lead += st.kpi_lead_current || 0;
        totals.leadTarget += st.kpi_lead || 0;
        totals.inbox += st.kpi_inbox_current || 0;
        totals.inboxTarget += st.kpi_inbox || 0;
      });

      const overallTarget = totals.postTarget + totals.commentTarget + totals.leadTarget + totals.inboxTarget;
      const overallCurrent = totals.post + totals.comment + totals.lead + totals.inbox;
      const percentage = overallTarget > 0 ? Math.min(Math.round((overallCurrent / overallTarget) * 100), 100) : 0;

      return { team, totals, overallTarget, overallCurrent, percentage };
    });
  }, [teams, kpiResultsData]);

  const teamKpiSummariesRanked = useMemo(
    () => [...teamKpiSummaries].sort((a, b) => b.percentage - a.percentage),
    [teamKpiSummaries],
  );

  const handleDeleteTeam = async (team: TeamRow) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa team "${team.name_team}"?`)) {
      return;
    }

    try {
      const res = await teamsService.delete(team.name_team, team.id_leader);
      if (res.success) {
        setSuccess(`Đã xóa team "${team.name_team}" thành công`);
        fetchTeams();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.message || "Xóa thất bại");
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleEditTeam = (team: TeamRow) => {
    setSelectedTeamForEdit(team);
    setTeamModalOpen(true);
  };

  const handleCreateTeam = () => {
    setSelectedTeamForEdit(null);
    setTeamModalOpen(true);
  };

  const handleViewMembers = (team: TeamRow) => {
    setSelectedTeamForKpi(team);
    setKpiModalOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant space-y-2">
        <MaterialIcon name="block" className="text-5xl text-primary-container" />
        <p className="font-bold text-base text-on-surface">Quyền truy cập bị từ chối</p>
        <p className="text-sm">Trang này chỉ khả dụng đối với tài khoản Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Quản lý Teams (Admin)</h2>
          <p className="text-sm text-on-surface-variant">Quản lý toàn bộ danh sách team, gán leader và theo dõi KPI thành viên</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 border border-outline-variant rounded-lg px-3 py-1.5 bg-surface shadow-sm">
            <label className="text-xs font-bold text-on-surface-variant">Lọc theo Tuần:</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="text-sm font-semibold text-on-surface outline-none bg-transparent"
            >
              {recentWeeks.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreateTeam}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-on-primary-fixed-variant transition shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            <LuUserPlus size={16} />
            Thêm Team Mới
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={LuLayoutGrid}
          label="Tổng số Team"
          value={stats.totalTeams}
          iconClassName="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={LuUsers}
          label="Tổng số Thành viên"
          value={stats.totalMembers}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={LuTarget}
          label="Team đạt KPI tuần này"
          value={`${stats.achievedTeams} / ${stats.totalTeams}`}
          hint="Các team đạt ≥ 100% KPI chỉ tiêu"
          iconClassName="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={LuTrendingUp}
          label="Tỷ lệ hoàn thành KPI hệ thống"
          value={`${stats.completionRate}%`}
          hint="Tiến độ hoàn thành KPI của tất cả team"
          iconClassName="bg-amber-100 text-amber-600"
        />
      </div>

      {/* So sanh tien do giua cac Team - xep hang theo % hoan thanh tong (Post+Comment+
          Lead+Inbox), giup nhin duoc ngay team nao dang lam tot / cham hon nhau
          thay vi phai doc tung card rieng le. */}
      {!isLoading && teamKpiSummariesRanked.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface p-5">
          <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
            <LuLayoutGrid size={16} className="text-primary" />
            So sánh tiến độ giữa các Team
          </h3>
          <div className="flex flex-col gap-3">
            {teamKpiSummariesRanked.map((s, idx) => (
              <div key={s.team.id} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-[11px] font-bold text-on-surface-variant">#{idx + 1}</span>
                <div className="w-40 shrink-0 truncate text-xs font-bold text-on-surface" title={s.team.name_team}>
                  {s.team.name_team}
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-low">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      s.percentage >= 100 ? "bg-emerald-500" : s.percentage >= 50 ? "bg-amber-500" : s.overallTarget > 0 ? "bg-primary" : "bg-outline-variant",
                    )}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-bold text-on-surface tabular-nums">
                  {s.overallTarget > 0 ? `${s.percentage}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tong quan KPI day du theo Team - Post/Comment/Lead/Inbox, khong chi rieng Inbox
          (rieng Inbox can buoc "Xac nhan Inbox" thu cong nen hay 0% du team van co
          tien do that o cac chi so khac, de gay hieu nham team khong lam gi).
          Dung lai dung ngon ngu thiet ke (card, icon mau, PlatformStatCard) da co
          san tren trang nay + AssignKpiModal de dong bo giao dien. */}
      {!isLoading && teams.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
            <LuTrendingUp size={16} className="text-primary" />
            Chi tiết KPI theo Team
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {teamKpiSummaries.map(({ team, totals, overallTarget, percentage }) => {
              const barColor = percentage >= 100 ? "bg-[var(--color-success,#22c55e)]" : percentage >= 50 ? "bg-[var(--color-warning,#f59e0b)]" : "bg-primary";
              const badgeCls = percentage >= 100
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : percentage >= 50
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : overallTarget > 0
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-surface-container-low text-on-surface-variant border-outline-variant";

              const metrics = [
                { label: "Post", icon: LuFileText, current: totals.post, target: totals.postTarget, tone: "text-emerald-600 bg-emerald-100" },
                { label: "Comment", icon: LuMessageSquare, current: totals.comment, target: totals.commentTarget, tone: "text-blue-600 bg-blue-100" },
                { label: "Lead", icon: LuUserPlus, current: totals.lead, target: totals.leadTarget, tone: "text-purple-600 bg-purple-100" },
                { label: "Inbox", icon: LuInbox, current: totals.inbox, target: totals.inboxTarget, tone: "text-orange-600 bg-orange-100" },
              ];

              const initial = (team.name_team || "?").trim().charAt(0).toUpperCase();

              return (
                <div key={team.id} className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-on-surface text-sm truncate">{team.name_team}</div>
                        <div className="text-on-surface-variant font-medium text-[11px] truncate">
                          {team.leader_name || "Chưa đặt tên"} · {team.number_of_member || 0} thành viên
                        </div>
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold", badgeCls)}>
                      {overallTarget > 0 ? `${percentage}%` : "Chưa giao KPI"}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-500", barColor)} style={{ width: `${percentage}%` }} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {metrics.map((m) => (
                      <div key={m.label} className="rounded-lg border border-outline-variant p-2.5">
                        <div className={cn("mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md", m.tone)}>
                          <m.icon size={14} />
                        </div>
                        <div className="text-[10px] font-bold text-on-surface-variant uppercase">{m.label}</div>
                        <div className="text-sm font-extrabold text-on-surface tabular-nums leading-none mt-0.5">
                          {m.current}
                          <span className="text-[11px] font-medium text-on-surface-variant"> / {m.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message Notifications */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <MaterialIcon name="check_circle" className="text-[16px] shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <MaterialIcon name="error" className="text-[16px] shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Teams Table */}
      {isLoading ? (
        <div className="text-center py-16 text-on-surface-variant flex flex-col items-center justify-center gap-2 bg-surface rounded-xl border border-outline-variant">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Đang tải danh sách team...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-low rounded-xl border border-dashed border-outline-variant flex flex-col items-center justify-center">
          <MaterialIcon name="groups" className="text-4xl text-on-surface-variant mb-2" />
          <p className="text-on-surface-variant text-sm font-semibold">Chưa có team nào</p>
          <button
            onClick={handleCreateTeam}
            className="mt-3 text-primary text-sm font-bold hover:underline cursor-pointer"
          >
            + Tạo team đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase">
                  Tên Team
                </th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant text-xs uppercase">
                  Leader
                </th>
                <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase w-[120px]">
                  Số thành viên
                </th>
                <th className="text-center px-4 py-3 font-bold text-on-surface-variant text-xs uppercase w-[320px]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-on-surface">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-surface-container-low/30 transition">
                  <td className="px-4 py-3 font-bold text-on-surface align-middle">
                    {team.name_team}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="font-bold text-xs text-on-surface">{team.leader_name || "Chưa đặt tên"}</div>
                    <div className="text-[10px] text-on-surface-variant font-medium">{team.leader_email}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xs text-on-surface-variant align-middle">
                    {team.number_of_member || 0}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleViewMembers(team)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        <FaEye size={10} /> Xem TV
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeaderForInbox({
                            email: team.leader_email,
                            name: team.name_team
                          });
                          setInboxModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition text-[11px] font-bold cursor-pointer shrink-0 border border-orange-100"
                        title="Xem toàn bộ Inbox của Team này"
                      >
                        <MaterialIcon name="forum" className="text-[12px]" /> Inbox
                      </button>
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-outline-variant rounded-lg transition text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        <FaEdit size={10} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-on-surface-variant hover:text-primary-container hover:bg-primary-container/5 border border-outline-variant hover:border-red-200 rounded-lg transition text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        <FaTrash size={10} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="md:hidden flex flex-col divide-y divide-outline-variant">
            {teams.map((team) => (
              <div key={team.id} className="p-4 hover:bg-surface-container-low/30 transition flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-on-surface text-sm">{team.name_team}</h3>
                    <div className="text-xs text-on-surface-variant mt-1 flex flex-col gap-0.5">
                      <span className="font-medium text-on-surface">{team.leader_name || "Chưa đặt tên"}</span>
                      <span className="text-[10px] text-on-surface-variant">{team.leader_email}</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-low px-3 py-1.5 rounded-lg text-center shrink-0 border border-outline-variant shadow-sm">
                    <div className="text-[9px] text-on-surface-variant uppercase font-bold mb-0.5">Số TV</div>
                    <div className="text-sm font-black text-on-surface leading-none">{team.number_of_member || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-outline-variant">
                  <button
                    onClick={() => handleViewMembers(team)}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <FaEye size={14} /> <span className="text-[11px] font-bold">Thành viên</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLeaderForInbox({ email: team.leader_email, name: team.name_team });
                      setInboxModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition cursor-pointer shadow-sm active:scale-95 border border-orange-100"
                  >
                    <MaterialIcon name="forum" className="text-[14px]" /> <span className="text-[11px] font-bold">Xem Inbox</span>
                  </button>
                  <button
                    onClick={() => handleEditTeam(team)}
                    className="flex items-center justify-center gap-1.5 p-2 text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container-highest border border-outline-variant rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <FaEdit size={14} /> <span className="text-[11px] font-bold">Sửa Team</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team)}
                    className="flex items-center justify-center gap-1.5 p-2 text-on-surface-variant hover:text-primary-container bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <FaTrash size={14} /> <span className="text-[11px] font-bold">Xóa Team</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Team Creation / Edit Modal */}
      <AdminTeamModal
        isOpen={teamModalOpen}
        onClose={() => {
          setTeamModalOpen(false);
          setSelectedTeamForEdit(null);
        }}
        team={selectedTeamForEdit}
        onSuccess={() => {
          fetchTeams();
          setSuccess(selectedTeamForEdit ? "Cập nhật team thành công" : "Tạo team mới thành công");
          setTimeout(() => setSuccess(null), 4000);
        }}
      />

      {/* Member KPI Overview Modal */}
      <AdminMemberKpiModal
        isOpen={kpiModalOpen}
        onClose={() => {
          setKpiModalOpen(false);
          setSelectedTeamForKpi(null);
        }}
        team={selectedTeamForKpi}
      />

      {/* Admin Inbox View Modal */}
      {inboxModalOpen && selectedLeaderForInbox && (
        <LeaderInboxView
          isOpen={inboxModalOpen}
          onClose={() => setInboxModalOpen(false)}
          leaderEmail={selectedLeaderForInbox.email}
          memberName={`Toàn bộ team ${selectedLeaderForInbox.name}`}
        />
      )}
    </div>
  );
}
