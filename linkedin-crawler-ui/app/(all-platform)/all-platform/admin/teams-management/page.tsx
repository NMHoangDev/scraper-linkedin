"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";
import { teamsService } from "@/services/all-platform.service";
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
  LuFileText,
  LuInbox,
  LuPencil,
  LuTrash2,
  LuChartBar,
  LuChevronRight,
} from "react-icons/lu";
import { LeaderInboxView } from "@/components/all-platform/leader/LeaderInboxView";

// Trong so KPI theo yeu cau nghiep vu: Lead quan trong nhat -> Inbox -> Comment -> Post.
// % hoan thanh tong cua team = trung binh CO TRONG SO cua ty le hoan thanh tung chi so
// (chi tinh cac chi so da co chi tieu > 0, ty le moi chi so gioi han toi da 100%).
const KPI_WEIGHTS = { lead: 0.45, inbox: 0.4, comment: 0.05, post: 0.1 } as const;

function computeWeightedPercentage(t: {
  post: number; postTarget: number;
  comment: number; commentTarget: number;
  lead: number; leadTarget: number;
  inbox: number; inboxTarget: number;
}): { percentage: number; hasTarget: boolean } {
  const parts = [
    { w: KPI_WEIGHTS.lead, cur: t.lead, tgt: t.leadTarget },
    { w: KPI_WEIGHTS.inbox, cur: t.inbox, tgt: t.inboxTarget },
    { w: KPI_WEIGHTS.comment, cur: t.comment, tgt: t.commentTarget },
    { w: KPI_WEIGHTS.post, cur: t.post, tgt: t.postTarget },
  ];
  let weightedSum = 0;
  let weightTotal = 0;
  for (const p of parts) {
    if (p.tgt > 0) {
      weightedSum += p.w * Math.min(p.cur / p.tgt, 1);
      weightTotal += p.w;
    }
  }
  const hasTarget = weightTotal > 0;
  return { percentage: hasTarget ? Math.round((weightedSum / weightTotal) * 100) : 0, hasTarget };
}

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
    <div className="flex h-full items-center gap-3 rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className={cn("shrink-0 rounded-lg p-2", iconClassName)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#6e6e80]">{label}</p>
        <span className="text-xl font-bold tracking-tight text-[#0a0a0a] tabular-nums">
          {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
        </span>
        {hint ? <p className="truncate text-[11px] text-[#6e6e80]">{hint}</p> : null}
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
  const [kpiRows, setKpiRows] = useState<Array<{
    team_id: string; member_id: string;
    kpi_post: number; kpi_lead: number; kpi_inbox: number; kpi_comment: number;
    verified_count: number; kpi_post_current: number; kpi_lead_current: number; kpi_inbox_current: number;
  }>>([]);
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

  // Dung 1 RPC gop teams+KPI duy nhat (get_admin_teams_kpi_overview qua /teams/with-kpi)
  // thay cho kieu cu 1 + N request song song (N = so team, moi request lai keo theo ca
  // lich su seeding_items rat nang) - do la nguyen nhan trang load cham va luc len luc
  // khong: 1 trong N request cham/loi se bi nuot lang le, team do hien 0 sai lech.
  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [startDate, endDate] = selectedWeek.split("_");
      const res = await teamsService.getWithKpi(startDate, endDate);
      if (res.success && res.data) {
        setTeams(res.data.teams || []);
        setKpiRows(res.data.kpi_data || []);
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

  // Tong hop KPI (Post/Comment/Lead/Inbox) + % hoan thanh CO TRONG SO cho tung team -
  // tinh 1 lan, dung chung cho ca bang so sanh, cac card chi tiet va thong ke tong.
  const teamKpiSummaries = useMemo(() => {
    return teams.map(team => {
      const totals = { post: 0, postTarget: 0, comment: 0, commentTarget: 0, lead: 0, leadTarget: 0, inbox: 0, inboxTarget: 0 };

      // Phong ve: RPC backend co the tra >1 dong cho cung 1 member (du lieu
      // kpi_tracker mo coi/trung khoang ngay o phia DB) - dedupe theo member_id
      // truoc khi cong don, tranh nhan doi target/actual cua thanh vien do.
      const seenMembers = new Set<string>();
      kpiRows
        .filter(r => r.team_id === team.id)
        .forEach(r => {
          if (seenMembers.has(r.member_id)) return;
          seenMembers.add(r.member_id);
          totals.post += r.kpi_post_current || 0;
          totals.postTarget += r.kpi_post || 0;
          totals.comment += r.verified_count || 0;
          totals.commentTarget += r.kpi_comment || 0;
          totals.lead += r.kpi_lead_current || 0;
          totals.leadTarget += r.kpi_lead || 0;
          totals.inbox += r.kpi_inbox_current || 0;
          totals.inboxTarget += r.kpi_inbox || 0;
        });

      const { percentage, hasTarget } = computeWeightedPercentage(totals);
      return { team, totals, hasTarget, percentage };
    });
  }, [teams, kpiRows]);

  const teamKpiSummariesRanked = useMemo(
    () => [...teamKpiSummaries].sort((a, b) => b.percentage - a.percentage),
    [teamKpiSummaries],
  );

  // Thong ke tong - suy ra tu teamKpiSummaries (dung chung cong thuc co trong so).
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((acc, t) => acc + (t.number_of_member || 0), 0);
    const withTarget = teamKpiSummaries.filter(s => s.hasTarget);
    const achievedTeams = withTarget.filter(s => s.percentage >= 100).length;
    const completionRate = withTarget.length > 0
      ? Math.round(withTarget.reduce((acc, s) => acc + s.percentage, 0) / withTarget.length)
      : 0;
    return { totalTeams, totalMembers, achievedTeams, completionRate };
  }, [teams, teamKpiSummaries]);

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

  // Thu tu hien thi theo do quan trong (trong so): Lead -> Inbox -> Comment -> Post.
  // Moi chi so co 1 icon mau nhat rieng cho card chi tiet do mat, khong don dieu.
  const metricDefs = [
    { key: "lead" as const, label: "Lead", weight: "45%", icon: LuUserPlus, tone: "bg-[#f1edfb] text-[#7c5cff]" },
    { key: "inbox" as const, label: "Inbox", weight: "40%", icon: LuInbox, tone: "bg-[#fdeee5] text-[#ea580c]" },
    { key: "comment" as const, label: "Comment", weight: "5%", icon: LuMessageSquare, tone: "bg-[#e6f1fb] text-[#2563eb]" },
    { key: "post" as const, label: "Post", weight: "10%", icon: LuFileText, tone: "bg-[#e6f6ec] text-[#16a34a]" },
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
            <h1 className="text-xl font-bold text-[#0a0a0a] leading-tight">Quản lý Teams</h1>
            <p className="text-[13.5px] text-[#6e6e80] mt-0.5">Theo dõi KPI và so sánh hiệu suất giữa các team</p>
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
          <div className="rounded-xl border border-[#dcdce0] bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#e5e5e5] bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <LuChartBar size={17} className="text-[#0a0a0a]" />
                <span className="text-[15px] font-bold text-[#0a0a0a]">So sánh & xếp hạng Team</span>
              </div>
              <p className="text-[12.5px] text-[#6e6e80] mt-0.5">Xếp theo % hoàn thành KPI có trọng số: Lead 45% · Inbox 40% · Comment 5% · Post 10%</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="bg-[#f0f0f1]">
                    <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#52525b] uppercase w-12">#</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-bold text-[#52525b] uppercase">Team</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-bold text-[#52525b] uppercase hidden md:table-cell">Leader</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#52525b] uppercase">Thành viên</th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-bold text-[#52525b] uppercase w-[45%]">Tiến độ hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  {teamKpiSummariesRanked.map((s, idx) => (
                    <tr key={s.team.id} className="border-t border-[#e5e5e5] hover:bg-[#f7f7f8] transition">
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold",
                          idx === 0 && s.hasTarget ? "bg-[#16a34a] text-white" : "bg-[#e5e5e7] text-[#52525b]",
                        )}>{idx + 1}</span>
                      </td>
                      <td className="px-3 py-3 font-bold text-[#0a0a0a] whitespace-nowrap">{s.team.name_team}</td>
                      <td className="px-3 py-3 text-[#52525b] hidden md:table-cell whitespace-nowrap">{s.team.leader_name || "Chưa đặt tên"}</td>
                      <td className="px-3 py-3 text-center font-semibold text-[#0a0a0a]">{s.team.number_of_member || 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e5e5e7]">
                            <div
                              className="h-full rounded-full bg-[#16a34a] transition-all duration-500"
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                          <span className="w-11 text-right text-[15px] font-bold text-[#0a0a0a] tabular-nums">
                            {s.hasTarget ? `${s.percentage}%` : "—"}
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
              <LuLayoutGrid size={17} className="text-[#0a0a0a]" />
              <span className="text-[15px] font-bold text-[#0a0a0a]">Quản lý từng Team</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {teamKpiSummaries.map(({ team, totals, hasTarget, percentage }) => {
                const initial = (team.name_team || "?").trim().charAt(0).toUpperCase();
                return (
                  <div key={team.id} className="flex flex-col gap-3 rounded-xl border border-[#dcdce0] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbe8ee] text-[13px] font-bold text-[#ba244a]">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#0a0a0a] text-[15px] truncate">{team.name_team}</div>
                          <div className="text-[#6e6e80] text-[12.5px] truncate">
                            {team.leader_name || "Chưa đặt tên"} · {team.number_of_member || 0} thành viên
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold",
                          hasTarget ? "bg-[#16a34a]/10 text-[#15803d]" : "bg-[#f0f0f1] text-[#6e6e80]",
                        )}
                      >
                        {hasTarget ? `${percentage}%` : "Chưa giao KPI"}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-[#e5e5e7] rounded-full overflow-hidden">
                      <div className="h-full bg-[#16a34a] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {metricDefs.map((m) => (
                        <div key={m.label} className="rounded-lg border border-[#e5e5e7] bg-[#fafafa] px-2.5 py-2.5">
                          <div className={cn("mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg", m.tone)}>
                            <m.icon size={14} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#6e6e80] uppercase">{m.label}</span>
                            <span className="text-[11px] font-bold text-[#71717a]">{m.weight}</span>
                          </div>
                          <div className="text-[16px] font-bold text-[#0a0a0a] tabular-nums leading-none mt-1">
                            {totals[m.key]}
                            <span className="text-[11px] font-normal text-[#a1a1aa]"> / {totals[`${m.key}Target` as keyof typeof totals]}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-[#f0f0f0]">
                      <button
                        onClick={() => handleViewMembers(team)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#e4e4e7] px-2 py-2 text-[12.5px] font-semibold text-[#3f3f46] transition hover:bg-[#d4d4d8] cursor-pointer"
                      >
                        <LuEye size={13} /> Xem TV
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLeaderForInbox({ email: team.leader_email, name: team.name_team });
                          setInboxModalOpen(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ba244a]/10 px-2 py-2 text-[12.5px] font-semibold text-[#ba244a] transition hover:bg-[#ba244a]/15 cursor-pointer"
                        title="Xem toàn bộ Inbox của Team này"
                      >
                        <LuMessageSquare size={13} /> Inbox
                      </button>
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="inline-flex items-center justify-center rounded-lg bg-[#0a0a0a] px-2.5 py-2 text-white shadow-sm transition hover:bg-[#262626] cursor-pointer"
                        title="Sửa team"
                      >
                        <LuPencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="inline-flex items-center justify-center rounded-lg border border-[#f3c8d3] bg-[#fbe8ee] px-2.5 py-2 text-[#ba244a] shadow-sm transition hover:bg-[#f6d2dc] cursor-pointer"
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
