"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { teamsService, allPlatformKpiService } from "@/services/all-platform.service";
import { cn } from "@/lib/utils";
import type { TeamRow } from "@/services/all-platform.service";
import { PlatformStatsRow, PlatformStatCard } from "@/components/features/shared/PlatformStatCard";
import { AssignKpiModal } from "./AssignKpiModal";
import { TeamModal } from "./TeamModal";
import { SeedingModal } from "./SeedingModal";
import { LeaderInboxView } from "./LeaderInboxView";
import { LeaderPostView } from "./LeaderPostView";
import { toast } from "sonner";

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

export function TeamManagement() {
  const { user } = useAppAuth();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  const [seedingModalOpen, setSeedingModalOpen] = useState(false);
  const [selectedMemberSeeding, setSelectedMemberSeeding] = useState<any>(null);

  // Inbox KPI verification modal
  const [inboxModalOpen, setInboxModalOpen] = useState(false);
  const [inboxMember, setInboxMember] = useState<{ email: string; name: string } | null>(null);

  // FB Post KPI modal
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postMember, setPostMember] = useState<{ email: string; name: string } | null>(null);
  const [postDateRange, setPostDateRange] = useState<{ start: string; end: string } | null>(null);

  // Team Management Modals
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  const recentWeeks = useMemo(() => getRecentWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState(recentWeeks[0].value);

  const fetchData = useCallback(async () => {
    if (!user?.id || !["leader", "admin", "superadmin"].includes(user.role || "")) return;
    setIsLoading(true);
    try {
      // 1. Fetch all teams and filter for this leader (or all if admin)
      const teamsRes = await teamsService.getAll();
      let myTeams: TeamRow[] = [];
      let activeTeamId = selectedTeamId;
      if (teamsRes.success && teamsRes.data) {
        if ((user.role as string) === "admin" || (user.role as string) === "superadmin") {
          myTeams = teamsRes.data;
        } else {
          myTeams = teamsRes.data.filter(t => t.id_leader === user.id);
        }
        setTeams(myTeams);
        if (myTeams.length > 0 && !selectedTeamId) {
          activeTeamId = myTeams[0].id;
          setSelectedTeamId(activeTeamId);
        }
      }

      // 2. Fetch KPI data for all members of this leader (scoped by selected team)
      if (user.email && activeTeamId) {
        const [startDate, endDate] = selectedWeek.split("_");
        const kpiRes = await allPlatformKpiService.getAll(user.email, activeTeamId, startDate, endDate);
        if (kpiRes.success && kpiRes.data?.members) {
          setKpiData(kpiRes.data.members);
        }
      } else if (user.email && !activeTeamId) {
        setKpiData([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedTeamId, selectedWeek]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, selectedTeamId, selectedWeek, fetchData]);

  // Get KPI date range for post view (from first member with KPI)
  useEffect(() => {
    if (kpiData.length > 0) {
      const firstMemberWithKpi = kpiData.find(k => k.seeding_stats?.kpi_inbox_range);
      if (firstMemberWithKpi?.seeding_stats?.kpi_inbox_range) {
        setPostDateRange(firstMemberWithKpi.seeding_stats.kpi_inbox_range);
      } else {
        // Default: current week
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        setPostDateRange({
          start: monday.toISOString().split("T")[0],
          end: sunday.toISOString().split("T")[0],
        });
      }
    }
  }, [kpiData]);

  const handleAssignKpi = (member: any) => {
    setSelectedMember(member);
    setAssignModalOpen(true);
  };

  const handleViewSeeding = (member: any) => {
    setSelectedMemberSeeding(member);
    setSeedingModalOpen(true);
  };

  const handleKpiAssigned = () => {
    fetchData(); // Refresh data after assigning KPI
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const teamMembers = selectedTeam?.members || [];

  // Map KPI data to members
  const membersWithKpi = useMemo(() => {
    return teamMembers.map(member => {
      const kpiInfo = kpiData.find(k => k.id === member.id) || {};
      const stats = kpiInfo.seeding_stats || {};
      return {
        ...member,
        kpiCommentTarget: stats.kpi_target || 0,
        kpiCommentCurrent: stats.verified_count || 0,
        kpiPostTarget: stats.kpi_post || 0,
        kpiPostCurrent: stats.kpi_post_current || 0,
        kpiLeadTarget: stats.kpi_lead || 0,
        kpiLeadCurrent: stats.kpi_lead_current || 0,
        kpiInboxTarget: stats.kpi_inbox || 0,
        kpiInboxCurrent: stats.kpi_inbox_current || 0,
        kpiInboxZalo: stats.kpi_inbox_zalo || 0,
        kpiInboxFbSeeder: stats.kpi_inbox_fb_seeder || 0,
        kpiInboxFbKpi: stats.kpi_inbox_fb_kpi || 0,
        kpiInboxRange: stats.kpi_inbox_range || null,
        seedingItems: kpiInfo.seeding_items || [],
      };
    });
  }, [teamMembers, kpiData]);

  // Overall Stats
  const totalKPIProgress = useMemo(() => {
    if (membersWithKpi.length === 0) return 0;
    let sumCurrent = 0;
    let sumTarget = 0;
    membersWithKpi.forEach(m => {
      sumCurrent += m.kpiCommentCurrent + m.kpiPostCurrent + m.kpiLeadCurrent + m.kpiInboxCurrent;
      sumTarget += m.kpiCommentTarget + m.kpiPostTarget + m.kpiLeadTarget + m.kpiInboxTarget;
    });
    if (sumTarget === 0) return 0;
    return Math.min(100, Math.round((sumCurrent / sumTarget) * 100));
  }, [membersWithKpi]);

  const handleDeleteTeam = async () => {
    if (!selectedTeam || !user?.id) return;
    
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa team "${selectedTeam.name_team}" không?`);
    if (!confirmDelete) return;

    const deletePromise = async () => {
      const res = await teamsService.delete(selectedTeam.name_team, user.id);
      if (!res.success) {
        throw new Error(res.message || "Xóa thất bại");
      }
      setSelectedTeamId("");
      await fetchData();
      return res;
    };

    toast.promise(deletePromise(), {
      loading: "Đang xóa team...",
      success: "Xóa team thành công!",
      error: (err) => err.message || "Xóa team thất bại"
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] min-w-0 space-y-6 font-sans">
      <div className="flex items-center gap-4 mb-6">
        <div className="rounded-xl bg-[#E3000F]/10 p-3">
          <MaterialIcon name="groups" className="text-[#E3000F] text-3xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            Quản lý Team KPI
          </h1>
          <p className="text-sm text-[#A0A0A0]">
            Theo dõi tiến độ KPI và phân công nhiệm vụ cho các thành viên
          </p>
        </div>
      </div>

      <PlatformStatsRow>
        <PlatformStatCard
          label="Tổng số Team"
          value={teams.length}
          hint="Do bạn quản lý"
          accent="primary"
        />
        <PlatformStatCard
          label="Thành viên"
          value={teamMembers.length}
          hint={`Trong team đang chọn`}
          accent="success"
        />
        <PlatformStatCard
          label="Tiến độ KPI"
          value={`${totalKPIProgress}%`}
          hint="Trung bình team"
          accent={totalKPIProgress >= 100 ? "success" : totalKPIProgress > 50 ? "warning" : "error"}
        />
      </PlatformStatsRow>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col mt-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-600">Chọn Team:</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition shadow-sm min-w-[200px]"
            >
              {teams.length === 0 && <option value="">Chưa có team</option>}
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name_team}</option>
              ))}
            </select>
            
            <label className="text-sm font-bold text-slate-600 ml-2">Tuần:</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition shadow-sm min-w-[150px]"
            >
              {recentWeeks.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {((user?.role as string) === "admin" || (user?.role as string) === "superadmin") && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setInboxMember({ email: "", name: "Toàn bộ" });
                    setInboxModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95 border border-orange-100"
                >
                  <MaterialIcon name="forum" className="text-[16px]" />
                  Xem Tất Cả Inbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPostMember({ email: "", name: "Toàn bộ" });
                    setPostModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95 border border-green-100"
                >
                  <MaterialIcon name="article" className="text-[16px]" />
                  Xem Tất Cả Posts
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setIsEditingTeam(false);
                setTeamModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 bg-[#E3000F] hover:bg-[#C40009] text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
            >
              <MaterialIcon name="add" className="text-[16px]" />
              Thêm Team Mới
            </button>

            {selectedTeam && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTeam(true);
                    setTeamModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
                >
                  <MaterialIcon name="edit" className="text-[16px]" />
                  Sửa Team
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  className="inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
                >
                  <MaterialIcon name="delete" className="text-[16px]" />
                  Xóa Team
                </button>
              </>
            )}
          </div>
        </div>

        <div className="w-full">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 text-left whitespace-nowrap">Thành viên</th>
                <th className="px-1 py-2.5 text-center whitespace-nowrap">Comment</th>
                <th className="px-1 py-2.5 text-center whitespace-nowrap">Post</th>
                <th className="px-1 py-2.5 text-center whitespace-nowrap">Lead</th>
                <th className="px-1 py-2.5 text-center whitespace-nowrap">Inbox</th>
                <th className="px-2 py-2.5 text-center whitespace-nowrap">Tiến độ</th>
                <th className="px-2 py-2.5 text-center whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#E3000F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Đang tải dữ liệu KPI...</span>
                    </div>
                  </td>
                </tr>
              ) : membersWithKpi.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-400 italic">
                    Chưa có thành viên nào trong team này.
                  </td>
                </tr>
              ) : (
                membersWithKpi.map(member => {
                  const totalTarget =
                    member.kpiCommentTarget +
                    member.kpiPostTarget +
                    member.kpiLeadTarget +
                    member.kpiInboxTarget;
                  const totalCurrent =
                    member.kpiCommentCurrent +
                    member.kpiPostCurrent +
                    member.kpiLeadCurrent +
                    member.kpiInboxCurrent;
                  const percent = totalTarget === 0 ? 0 : Math.min(100, Math.round((totalCurrent / totalTarget) * 100));

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800 text-xs whitespace-nowrap">{member.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-medium max-w-[120px] truncate" title={member.email}>{member.email}</div>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className="font-bold text-slate-800 text-[11px]">{member.kpiCommentCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {member.kpiCommentTarget}</span>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className={cn("font-bold text-[11px]", member.kpiPostCurrent > 0 ? "text-emerald-600" : "text-slate-800")}>{member.kpiPostCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {member.kpiPostTarget}</span>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className="font-bold text-slate-800 text-[11px]">{member.kpiLeadCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {member.kpiLeadTarget}</span>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className={cn("font-bold text-[11px]", member.kpiInboxCurrent >= member.kpiInboxTarget && member.kpiInboxTarget > 0 ? "text-emerald-600" : "text-slate-800")}>{member.kpiInboxCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {member.kpiInboxTarget}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", percent >= 100 ? "bg-emerald-500" : percent > 50 ? "bg-amber-500" : "bg-[#E3000F]")}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                            percent >= 100 ? "bg-emerald-100 text-emerald-700" :
                            percent > 50 ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {percent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          <button onClick={() => handleViewSeeding(member)}
                            className="inline-flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-1.5 py-1 rounded-md text-[10px] transition border border-blue-100">
                            <MaterialIcon name="visibility" className="text-[11px]" />Seeding
                          </button>
                          <button onClick={() => {
                            setInboxMember({ email: member.email, name: member.name || member.email });
                            setInboxModalOpen(true);
                          }}
                            className="inline-flex items-center gap-0.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-1.5 py-1 rounded-md text-[10px] transition border border-orange-100">
                            <MaterialIcon name="forum" className="text-[11px]" />Inbox
                          </button>
                          <button onClick={() => {
                            setPostMember({ email: member.email, name: member.name || member.email });
                            setPostModalOpen(true);
                          }}
                            className="inline-flex items-center gap-0.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold px-1.5 py-1 rounded-md text-[10px] transition border border-green-100">
                            <MaterialIcon name="article" className="text-[11px]" />Posts
                          </button>
                          <button onClick={() => handleAssignKpi(member)}
                            className="inline-flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-1.5 py-1 rounded-md text-[10px] transition border border-slate-200">
                            <MaterialIcon name="assignment" className="text-[11px]" />KPI
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assignModalOpen && selectedMember && (
        <AssignKpiModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          member={selectedMember}
          teamId={selectedTeamId}
          onSuccess={handleKpiAssigned}
        />
      )}

      {seedingModalOpen && selectedMemberSeeding && (
        <SeedingModal
          isOpen={seedingModalOpen}
          onClose={() => setSeedingModalOpen(false)}
          member={selectedMemberSeeding}
        />
      )}

      {inboxModalOpen && inboxMember && (
        <LeaderInboxView
          isOpen={inboxModalOpen}
          onClose={() => setInboxModalOpen(false)}
          memberEmail={inboxMember.email}
          memberName={inboxMember.name}
          onStatusChange={fetchData}
        />
      )}

      {postModalOpen && postMember && (
        <LeaderPostView
          isOpen={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          memberEmail={postMember.email}
          memberName={postMember.name}
          startDate={postDateRange?.start}
          endDate={postDateRange?.end}
          onStatusChange={fetchData}
        />
      )}

      {teamModalOpen && user?.id && (
        <TeamModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          team={isEditingTeam ? selectedTeam || null : null}
          leaderId={user.id}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
