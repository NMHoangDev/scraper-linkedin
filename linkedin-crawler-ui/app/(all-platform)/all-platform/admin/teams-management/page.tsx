"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { teamsService, allPlatformKpiService } from "@/services/all-platform.service";
import type { TeamRow } from "@/services/all-platform.service";
import { AdminTeamFormBlock } from "@/components/all-platform/admin/AdminTeamFormBlock";
import { LeaderInboxView } from "@/components/all-platform/leader/LeaderInboxView";

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

function CustomWeekDropdown({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((option) => option.value === value)?.label || "Chọn tuần";

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        className="flex w-full min-w-0 sm:min-w-[240px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
        onClick={() => setIsOpen((current) => !current)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <MaterialIcon name="calendar_today" className="text-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lọc theo tuần
          </p>
          <p className="truncate text-sm font-semibold text-slate-800">{selectedLabel}</p>
        </div>

        <MaterialIcon
          name="arrow_drop_down"
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors last:mb-0 ${
                  selected
                    ? "bg-red-50 font-semibold text-[#DC2626]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {selected ? <MaterialIcon name="check" className="text-[16px]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-100 border-l-4 border-l-[#DC2626] bg-white p-4">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="mt-2 block text-2xl font-black text-slate-900">{value}</span>
    </div>
  );
}

function SectionShell({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <MaterialIcon name={icon as any} className="text-[18px] text-[#DC2626]" />
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function TeamsManagementPage() {
  const { user } = useAppAuth();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [kpiResultsData, setKpiResultsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<TeamRow | null>(null);
  const [selectedTeamForKpi, setSelectedTeamForKpi] = useState<TeamRow | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const [inboxModalOpen, setInboxModalOpen] = useState(false);
  const [selectedLeaderForInbox, setSelectedLeaderForInbox] = useState<{
    email: string;
    name: string;
  } | null>(null);

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

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

        const [startDate, endDate] = selectedWeek.split("_");
        const kpiPromises = teamsData.map(async (team) => {
          if (!team.leader_email) {
            return { teamId: team.id, members: [] };
          }

          try {
            const kpiRes = await allPlatformKpiService.getAll(
              team.leader_email,
              undefined,
              startDate,
              endDate,
            );

            return {
              teamId: team.id,
              members: kpiRes.success ? kpiRes.data?.members || [] : [],
            };
          } catch {
            return { teamId: team.id, members: [] };
          }
        });

        setKpiResultsData(await Promise.all(kpiPromises));
      } else {
        setError(res.message || "Khong the tai danh sach team");
      }
    } catch {
      setError("Loi ket noi may chu");
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    if (isAdmin) {
      fetchTeams();
    }
  }, [isAdmin, fetchTeams]);

  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((acc, team) => acc + (team.number_of_member || 0), 0);

    let totalTarget = 0;
    let totalCurrent = 0;
    let achievedTeams = 0;

    teams.forEach((team) => {
      const teamKpis = kpiResultsData.find((result) => result.teamId === team.id)?.members || [];
      let teamTarget = 0;
      let teamCurrent = 0;

      team.members?.forEach((member) => {
        const kpiInfo = teamKpis.find((kpi: any) => kpi.id === member.id) || {};
        const seedingStats = kpiInfo.seeding_stats || {};

        teamTarget +=
          (seedingStats.kpi_target || 0) +
          (seedingStats.kpi_post || 0) +
          (seedingStats.kpi_lead || 0) +
          (seedingStats.kpi_inbox || 0);
        teamCurrent +=
          (seedingStats.verified_count || 0) +
          (seedingStats.kpi_post_current || 0) +
          (seedingStats.kpi_lead_current || 0) +
          (seedingStats.kpi_inbox_current || 0);
      });

      if (teamTarget > 0) {
        totalTarget += teamTarget;
        totalCurrent += teamCurrent;

        if (teamCurrent >= teamTarget) {
          achievedTeams += 1;
        }
      }
    });

    const completionRate =
      totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;

    return { totalTeams, totalMembers, achievedTeams, completionRate };
  }, [teams, kpiResultsData]);

  const handleDeleteTeam = async (team: TeamRow) => {
    if (!window.confirm(`Ban co chac chan muon xoa team "${team.name_team}"?`)) {
      return;
    }

    try {
      const res = await teamsService.delete(team.name_team, team.id_leader);

      if (res.success) {
        setSuccess(`Da xoa team "${team.name_team}" thanh cong`);
        fetchTeams();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.message || "Xoa that bai");
        setTimeout(() => setError(null), 4000);
      }
    } catch {
      setError("Loi ket noi may chu");
      setTimeout(() => setError(null), 4000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-2 bg-white py-20 text-slate-500">
        <MaterialIcon name="block" className="text-5xl text-red-500" />
        <p className="text-base font-bold text-slate-900">Quyen truy cap bi tu choi</p>
      </div>
    );
  }

  const selectedTeamKpis = selectedTeamForKpi
    ? kpiResultsData.find((result) => result.teamId === selectedTeamForKpi.id)?.members || []
    : [];

  return (
    <div className="min-h-screen bg-white pb-12">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Quản lý Teams</h2>
          <p className="text-sm text-slate-500">
            Quản lý danh sách team, gán leader và theo dõi KPI thành viên
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <CustomWeekDropdown
            options={recentWeeks}
            value={selectedWeek}
            onChange={setSelectedWeek}
          />
          <button
            onClick={fetchTeams}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 transition-colors hover:bg-slate-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
            title="Làm mới"
          >
            <MaterialIcon name="refresh" className="text-base" />
            <span className="hidden text-sm font-semibold sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {success ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <MaterialIcon name="check_circle" className="text-[16px] text-emerald-600" />
          <span>{success}</span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-[#DC2626]">
          <MaterialIcon name="error" className="text-[16px] text-[#DC2626]" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Tổng số team" value={stats.totalTeams} />
          <StatCard label="Tổng thành viên" value={stats.totalMembers} />
          <StatCard label="Team đạt KPI tuần" value={`${stats.achievedTeams} / ${stats.totalTeams}`} />
          <StatCard label="Tỷ lệ hoàn thành" value={`${stats.completionRate}%`} />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SectionShell icon="group_add" title="Hành động nhanh">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-[#DC2626]">
                  <MaterialIcon name="group_add" className="text-[20px]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Thêm team mới</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Mở popup tạo team mới, giữ khu quản lý chính gọn và rõ hơn.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTeamForEdit(null);
                  setIsTeamModalOpen(true);
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C]"
              >
                <MaterialIcon name="group_add" className="text-[18px]" />
                Thêm Team Mới
              </button>
            </div>
          </SectionShell>

          <SectionShell icon="analytics" title="Tiến độ KPI Team">
            <div className="grid grid-cols-2 gap-4">
              {isLoading ? (
                <div className="col-span-2 py-6 text-center text-xs text-slate-500">Đang tải...</div>
              ) : teams.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-xs text-slate-500">Chưa có dữ liệu</div>
              ) : (
                teams.map((team) => {
                  const teamKpis = kpiResultsData.find((result) => result.teamId === team.id)?.members || [];
                  const totalMembers = team.members?.length || 0;
                  let achievedMembers = 0;

                  team.members?.forEach((member) => {
                    const kpiInfo = teamKpis.find((kpi: any) => kpi.id === member.id) || {};
                    const kpiStats = kpiInfo.seeding_stats || {};
                    const target = kpiStats.kpi_inbox || 0;
                    const current = kpiStats.kpi_inbox_current || 0;

                    if (target > 0 && current >= target) {
                      achievedMembers += 1;
                    }
                  });

                  const percentage =
                    totalMembers > 0 ? Math.min(Math.round((achievedMembers / totalMembers) * 100), 100) : 0;
                  const selected = selectedTeamForKpi?.id === team.id;

                  return (
                    <button
                      key={team.id}
                      type="button"
                      className={`rounded-2xl border p-4 transition-all ${
                        selected
                          ? "border-[#FCA5A5] bg-red-50 shadow-[0_16px_32px_rgba(220,38,38,0.08)]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                      onClick={() => setSelectedTeamForKpi(team)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative h-16 w-16">
                          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-slate-100"
                              strokeWidth="4"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-[#DC2626] transition-all duration-1000"
                              strokeDasharray={`${percentage}, 100`}
                              strokeWidth="4"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-[13px] font-black ${percentage === 0 ? "text-slate-500" : "text-slate-900"}`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                        <span className="line-clamp-1 w-full text-center text-[11px] font-bold text-slate-700">
                          {team.name_team}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </SectionShell>

          <SectionShell icon="groups" title="Thành viên">
            {selectedTeamForKpi ? (
              <p className="mb-4 text-xs font-semibold text-[#DC2626]">
                Đang xem team: {selectedTeamForKpi.name_team}
              </p>
            ) : null}

            {!selectedTeamForKpi ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-slate-400">
                <MaterialIcon name="groups" className="mb-2 text-3xl" />
                <span className="text-xs font-medium">Bấm vào một team ở giữa để xem thành viên</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedTeamForKpi.members && selectedTeamForKpi.members.length > 0 ? (
                  selectedTeamForKpi.members.map((member) => {
                    const kpiInfo = selectedTeamKpis.find((kpi: any) => kpi.id === member.id) || {};
                    const memberStats = kpiInfo.seeding_stats || {};
                    const isExpanded = expandedMemberId === member.id;

                    const leadPct =
                      memberStats.kpi_lead > 0
                        ? Math.min(Math.round((memberStats.kpi_lead_current / memberStats.kpi_lead) * 100), 100)
                        : 0;
                    const inboxPct =
                      memberStats.kpi_inbox > 0
                        ? Math.min(Math.round((memberStats.kpi_inbox_current / memberStats.kpi_inbox) * 100), 100)
                        : 0;
                    const postPct =
                      memberStats.kpi_post > 0
                        ? Math.min(Math.round((memberStats.kpi_post_current / memberStats.kpi_post) * 100), 100)
                        : 0;
                    const commentPct =
                      memberStats.kpi_target > 0
                        ? Math.min(Math.round((memberStats.verified_count / memberStats.kpi_target) * 100), 100)
                        : 0;

                    return (
                      <div
                        key={member.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                      >
                        <div
                          className="flex w-full cursor-pointer items-center justify-between p-3 text-left transition-colors hover:bg-slate-50"
                          onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DC2626] text-xs font-bold text-white">
                              {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate text-[12px] font-bold text-slate-800">
                                {member.name || "Chua dat ten"}
                              </span>
                              <span className="block truncate text-[10px] text-slate-500">{member.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedLeaderForInbox({
                                  email: member.email,
                                  name: member.name || "Thành viên",
                                });
                                setInboxModalOpen(true);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-[#DC2626] transition-colors hover:bg-red-100"
                              title="Xem Chat"
                            >
                              <MaterialIcon name="forum" className="text-[13px]" />
                            </button>
                            <MaterialIcon
                              name="arrow_drop_down"
                              className={`text-[18px] text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="border-t border-slate-100 bg-white p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                                <div className="mb-1 flex justify-between text-[10px]">
                                  <span className="font-bold text-amber-700">LEAD</span>
                                  <span className="text-slate-500">
                                    {memberStats.kpi_lead_current || 0}/{memberStats.kpi_lead || 0}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${leadPct}%` }} />
                                </div>
                              </div>

                              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                                <div className="mb-1 flex justify-between text-[10px]">
                                  <span className="font-bold text-sky-700">INBOX</span>
                                  <span className="text-slate-500">
                                    {memberStats.kpi_inbox_current || 0}/{memberStats.kpi_inbox || 0}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
                                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${inboxPct}%` }} />
                                </div>
                              </div>

                              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                                <div className="mb-1 flex justify-between text-[10px]">
                                  <span className="font-bold text-violet-700">POST</span>
                                  <span className="text-slate-500">
                                    {memberStats.kpi_post_current || 0}/{memberStats.kpi_post || 0}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100">
                                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${postPct}%` }} />
                                </div>
                              </div>

                              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                                <div className="mb-1 flex justify-between text-[10px]">
                                  <span className="font-bold text-emerald-700">CMT</span>
                                  <span className="text-slate-500">
                                    {memberStats.verified_count || 0}/{memberStats.kpi_target || 0}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${commentPct}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500">Team chưa có thành viên</div>
                )}
              </div>
            )}
          </SectionShell>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-5">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <MaterialIcon name="history" className="text-[18px] text-[#DC2626]" />
              Lịch sử quản trị teams
            </h3>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Đang tải...</div>
            ) : teams.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">Chưa có team nào</div>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{team.name_team}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {team.leader_name || "Chua dat ten"}
                      </p>
                      <p className="text-[11px] text-slate-500">{team.leader_email}</p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {team.number_of_member || 0} TV
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedLeaderForInbox({
                          email: team.leader_email,
                          name: team.name_team,
                        });
                        setInboxModalOpen(true);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#DC2626] bg-white text-[#DC2626] transition hover:bg-red-50"
                      title="Xem Inbox"
                    >
                      <MaterialIcon name="forum" className="text-[14px]" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTeamForEdit(team);
                        setIsTeamModalOpen(true);
                      }}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Sửa Team
                    </button>

                    <button
                      onClick={() => handleDeleteTeam(team)}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-[#DC2626]"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold capitalize text-slate-500">Ten Team</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold capitalize text-slate-500">Leader</th>
                  <th className="w-[120px] px-4 py-3 text-center text-xs font-semibold capitalize text-slate-500">Thanh vien</th>
                  <th className="w-[180px] px-4 py-3 text-right text-xs font-semibold capitalize text-slate-500">Hanh dong</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">Đang tải...</td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">Chưa có team nào</td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4 align-middle font-bold text-slate-800">{team.name_team}</td>
                      <td className="px-4 py-4 align-middle">
                        <div className="text-xs font-bold text-slate-800">{team.leader_name || "Chua dat ten"}</div>
                        <div className="text-[10px] text-slate-500">{team.leader_email}</div>
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-bold text-slate-600">
                        {team.number_of_member || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedLeaderForInbox({
                                email: team.leader_email,
                                name: team.name_team,
                              });
                              setInboxModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] bg-white px-3 py-1.5 text-[11px] font-bold text-[#DC2626] transition hover:bg-red-50"
                            title="Xem Inbox"
                          >
                            <MaterialIcon name="forum" className="text-[14px]" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTeamForEdit(team);
                              setIsTeamModalOpen(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-[#DC2626]"
                            title="Sửa Team"
                          >
                            <MaterialIcon name="edit" className="text-[16px]" />
                          </button>

                          <button
                            onClick={() => handleDeleteTeam(team)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-[#DC2626]"
                            title="Xóa Team"
                          >
                            <MaterialIcon name="delete" className="text-[16px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {inboxModalOpen && selectedLeaderForInbox ? (
        <LeaderInboxView
          isOpen={inboxModalOpen}
          onClose={() => setInboxModalOpen(false)}
          leaderEmail={selectedLeaderForInbox.email}
          memberName={`Team ${selectedLeaderForInbox.name}`}
        />
      ) : null}

      {isTeamModalOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setIsTeamModalOpen(false);
            setSelectedTeamForEdit(null);
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedTeamForEdit ? "Sửa Team" : "Thêm Team Mới"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedTeamForEdit
                    ? "Chỉnh sửa leader và thành viên ngay trong popup."
                    : "Tạo team mới mà không làm rối khu quản lý chính."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTeamModalOpen(false);
                  setSelectedTeamForEdit(null);
                }}
                className="rounded-xl bg-white p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#DC2626]"
              >
                <MaterialIcon name="close" className="text-[18px]" />
              </button>
            </div>

            <div className="max-h-[85vh] overflow-y-auto p-5">
              <AdminTeamFormBlock
                team={selectedTeamForEdit}
                hideHeader
                onSuccess={() => {
                  fetchTeams();
                  setSuccess(
                    selectedTeamForEdit ? "Cap nhat team thanh cong" : "Tao team moi thanh cong",
                  );
                  setIsTeamModalOpen(false);
                  setSelectedTeamForEdit(null);
                  setTimeout(() => setSuccess(null), 4000);
                }}
                onCancelEdit={() => {
                  setIsTeamModalOpen(false);
                  setSelectedTeamForEdit(null);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
