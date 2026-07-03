"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";
import { teamsService, allPlatformKpiService } from "@/services/all-platform.service";
import type { TeamRow } from "@/services/all-platform.service";
import { AdminTeamModal } from "@/components/all-platform/admin/AdminTeamModal";
import { AdminMemberKpiModal } from "@/components/all-platform/admin/AdminMemberKpiModal";
import {
  LuLayoutGrid,
  LuUsers,
  LuTarget,
  LuTrendingUp,
  LuUserPlus,
  LuEye,
  LuMessageSquare,
  LuPencil,
  LuTrash2,
  LuChartBar,
  LuChevronRight,
} from "react-icons/lu";
import { LeaderInboxView } from "@/components/all-platform/leader/LeaderInboxView";

// ─────────────────────────────────────────────────────────────────────────────
// Trang nay dung he mau/thiet ke rieng, lay mau 1:1 tu app.markeeai.com de dong
// bo dan voi ben app. Cac gia tri hex hardcode co chu dich (tach biet khoi token
// Material cua phan con lai trong seeding). He mau toi gian: xam trung tinh +
// mot mau nhan hieu #ba244a cho hanh dong + mot mau emerald cho tien do. Cac o
// icon nho tren the thong ke la pastel nhat (giong app), khong dung mau tran lan.
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="flex h-full flex-col gap-4 rounded-xl border border-[#e5e5e5] bg-white p-5">
      <div className={cn("w-fit rounded-lg p-2.5", iconClassName)}>
        <Icon size={20} />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#6e6e80]">{label}</p>
        <span className="text-2xl font-bold tracking-tight text-[#0a0a0a] tabular-nums">
          {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
        </span>
        {hint ? <p className="text-[11px] text-[#6e6e80]">{hint}</p> : null}
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
  // dung chung cho ca bang so sanh va cac card chi tiet ben duoi.
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
      <div className="flex flex-col items-center justify-center py-20 text-[#6e6e80] space-y-2">
        <MaterialIcon name="block" className="text-5xl text-[#ba244a]" />
        <p className="font-semibold text-base text-[#0a0a0a]">Quyền truy cập bị từ chối</p>
        <p className="text-sm">Trang này chỉ khả dụng đối với tài khoản Admin.</p>
      </div>
    );
  }

  const metricDefs = [
    { key: "post" as const, label: "Post" },
    { key: "comment" as const, label: "Comment" },
    { key: "lead" as const, label: "Lead" },
    { key: "inbox" as const, label: "Inbox" },
  ];

  return (
    <div className="space-y-5 text-[#0a0a0a]">
      {/* ── Thanh tieu de trang (hien muc dang xem, giong app) ─────────────── */}
      <div className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-4">
        <div className="flex items-center gap-1.5 text-[12px] text-[#6e6e80] mb-1.5">
          <span>Quản lý</span>
          <LuChevronRight size={13} />
          <span className="font-medium text-[#ba244a]">Quản lý Teams</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#0a0a0a] leading-tight">Quản lý Teams</h1>
            <p className="text-[13px] text-[#6e6e80] mt-0.5">Theo dõi KPI và so sánh hiệu suất giữa các team</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-[#e5e5e5] rounded-[10px] px-3 py-1.5 bg-white">
              <span className="text-[11px] font-medium text-[#6e6e80]">Tuần</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="text-[13px] font-medium text-[#0a0a0a] outline-none bg-transparent cursor-pointer"
              >
                {recentWeeks.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreateTeam}
              className="flex items-center justify-center gap-1.5 bg-[#ba244a] text-white px-4 py-2 rounded-[10px] text-[13px] font-semibold hover:bg-[#9a1e3e] transition shrink-0 cursor-pointer active:scale-95"
            >
              <LuUserPlus size={16} />
              Thêm Team
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── The thong ke tong (icon chip pastel nhat, giong MetricCard cua app) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={LuLayoutGrid}
            label="Tổng số Team"
            value={stats.totalTeams}
            iconClassName="bg-[#f1edfb] text-[#7c5cff]"
          />
          <StatCard
            icon={LuUsers}
            label="Tổng số Thành viên"
            value={stats.totalMembers}
            iconClassName="bg-[#e6f6ec] text-[#16a34a]"
          />
          <StatCard
            icon={LuTarget}
            label="Team đạt KPI tuần này"
            value={`${stats.achievedTeams} / ${stats.totalTeams}`}
            hint="Đạt ≥ 100% KPI chỉ tiêu"
            iconClassName="bg-[#e6f1fb] text-[#2563eb]"
          />
          <StatCard
            icon={LuTrendingUp}
            label="Hoàn thành KPI hệ thống"
            value={`${stats.completionRate}%`}
            hint="Tiến độ của tất cả team"
            iconClassName="bg-[#fbe8ee] text-[#ba244a]"
          />
        </div>

        {/* ── So sanh chi tiet giua cac team (bang, xep hang theo % hoan thanh) ── */}
        {!isLoading && teamKpiSummariesRanked.length > 0 && (
          <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <LuChartBar size={16} className="text-[#6e6e80]" />
                <span className="text-[14px] font-semibold text-[#0a0a0a]">So sánh chi tiết giữa các Team</span>
              </div>
              <p className="text-[12px] text-[#6e6e80] mt-0.5">Xếp hạng theo % hoàn thành KPI tổng (Post + Comment + Lead + Inbox)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f7f7f8]">
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">#</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">Team</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase hidden md:table-cell">Leader</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">TV</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">Post</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">Comment</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">Lead</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase">Inbox</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-[#6e6e80] uppercase w-[150px]">Tiến độ</th>
                  </tr>
                </thead>
                <tbody>
                  {teamKpiSummariesRanked.map((s, idx) => (
                    <tr key={s.team.id} className="border-t border-[#e5e5e5] hover:bg-[#f7f7f8] transition">
                      <td className="px-5 py-3 text-[12px] font-medium text-[#a1a1aa]">{idx + 1}</td>
                      <td className="px-3 py-3 font-semibold text-[#0a0a0a] whitespace-nowrap">{s.team.name_team}</td>
                      <td className="px-3 py-3 text-[#6e6e80] hidden md:table-cell whitespace-nowrap">{s.team.leader_name || "Chưa đặt tên"}</td>
                      <td className="px-3 py-3 text-center text-[#6e6e80]">{s.team.number_of_member || 0}</td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        <span className="font-semibold text-[#0a0a0a]">{s.totals.post}</span>
                        <span className="text-[#a1a1aa]"> / {s.totals.postTarget}</span>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        <span className="font-semibold text-[#0a0a0a]">{s.totals.comment}</span>
                        <span className="text-[#a1a1aa]"> / {s.totals.commentTarget}</span>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        <span className="font-semibold text-[#0a0a0a]">{s.totals.lead}</span>
                        <span className="text-[#a1a1aa]"> / {s.totals.leadTarget}</span>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        <span className="font-semibold text-[#0a0a0a]">{s.totals.inbox}</span>
                        <span className="text-[#a1a1aa]"> / {s.totals.inboxTarget}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f0f1]">
                            <div
                              className="h-full rounded-full bg-[#16a34a] transition-all duration-500"
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-[12px] font-semibold text-[#0a0a0a] tabular-nums">
                            {s.overallTarget > 0 ? `${s.percentage}%` : "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Quan ly tung team (card + hanh dong) ─────────────────────────── */}
        {!isLoading && teams.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LuLayoutGrid size={16} className="text-[#6e6e80]" />
              <span className="text-[14px] font-semibold text-[#0a0a0a]">Quản lý từng Team</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {teamKpiSummaries.map(({ team, totals, overallTarget, percentage }) => {
                const initial = (team.name_team || "?").trim().charAt(0).toUpperCase();
                return (
                  <div key={team.id} className="flex flex-col gap-3 rounded-xl border border-[#e5e5e5] bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbe8ee] text-[13px] font-bold text-[#ba244a]">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0a0a0a] text-[14px] truncate">{team.name_team}</div>
                          <div className="text-[#6e6e80] text-[12px] truncate">
                            {team.leader_name || "Chưa đặt tên"} · {team.number_of_member || 0} thành viên
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          overallTarget > 0
                            ? "bg-[#16a34a]/10 text-[#15803d]"
                            : "bg-[#f7f7f8] text-[#6e6e80]",
                        )}
                      >
                        {overallTarget > 0 ? `${percentage}%` : "Chưa giao KPI"}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-[#f0f0f1] rounded-full overflow-hidden">
                      <div className="h-full bg-[#16a34a] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {metricDefs.map((m) => (
                        <div key={m.label} className="rounded-lg border border-[#e5e5e5] px-2.5 py-2 text-center">
                          <div className="text-[10px] font-medium text-[#6e6e80] uppercase">{m.label}</div>
                          <div className="text-[14px] font-bold text-[#0a0a0a] tabular-nums leading-none mt-1">
                            {totals[m.key]}
                            <span className="text-[11px] font-normal text-[#a1a1aa]"> / {totals[`${m.key}Target` as keyof typeof totals]}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-[#f0f0f0]">
                      <button
                        onClick={() => handleViewMembers(team)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] px-2 py-2 text-[12px] font-medium text-[#0a0a0a] hover:bg-[#f7f7f8] transition cursor-pointer"
                      >
                        <LuEye size={13} /> Xem TV
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeaderForInbox({ email: team.leader_email, name: team.name_team });
                          setInboxModalOpen(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] px-2 py-2 text-[12px] font-medium text-[#0a0a0a] hover:bg-[#f7f7f8] transition cursor-pointer"
                        title="Xem toàn bộ Inbox của Team này"
                      >
                        <LuMessageSquare size={13} /> Inbox
                      </button>
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="inline-flex items-center justify-center rounded-lg border border-[#e5e5e5] px-2.5 py-2 text-[#6e6e80] hover:bg-[#f7f7f8] hover:text-[#0a0a0a] transition cursor-pointer"
                        title="Sửa team"
                      >
                        <LuPencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="inline-flex items-center justify-center rounded-lg border border-[#e5e5e5] px-2.5 py-2 text-[#6e6e80] hover:bg-[#fbe8ee] hover:text-[#ba244a] hover:border-[#f3c8d3] transition cursor-pointer"
                        title="Xóa team"
                      >
                        <LuTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Thong bao ──────────────────────────────────────────────────── */}
        {success && (
          <div className="bg-[#e6f6ec] text-[#15803d] border border-[#bbf0cc] px-4 py-3 rounded-xl text-[13px] font-medium flex items-center gap-2">
            <MaterialIcon name="check_circle" className="text-[16px] shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-[#fbe8ee] text-[#ba244a] border border-[#f3c8d3] px-4 py-3 rounded-xl text-[13px] font-medium flex items-center gap-2">
            <MaterialIcon name="error" className="text-[16px] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Trang thai loading / rong ──────────────────────────────────── */}
        {isLoading && (
          <div className="text-center py-16 text-[#6e6e80] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-[#e5e5e5]">
            <div className="w-8 h-8 border-4 border-[#ba244a] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] font-medium">Đang tải danh sách team...</p>
          </div>
        )}
        {!isLoading && teams.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#e5e5e5] flex flex-col items-center justify-center">
            <LuLayoutGrid size={36} className="text-[#c4c4cc] mb-2" />
            <p className="text-[#6e6e80] text-[13px] font-medium">Chưa có team nào</p>
            <button
              onClick={handleCreateTeam}
              className="mt-3 text-[#ba244a] text-[13px] font-semibold hover:underline cursor-pointer"
            >
              + Tạo team đầu tiên
            </button>
          </div>
        )}
      </div>

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
