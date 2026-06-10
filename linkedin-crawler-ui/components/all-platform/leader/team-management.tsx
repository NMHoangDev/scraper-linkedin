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
import { toast } from "sonner";

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
  
  // Team Management Modals
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id || user.role !== "leader") return;
    setIsLoading(true);
    try {
      // 1. Fetch all teams and filter for this leader
      const teamsRes = await teamsService.getAll();
      let myTeams: TeamRow[] = [];
      let activeTeamId = selectedTeamId;
      if (teamsRes.success && teamsRes.data) {
        myTeams = teamsRes.data.filter(t => t.id_leader === user.id);
        setTeams(myTeams);
        if (myTeams.length > 0 && !selectedTeamId) {
          activeTeamId = myTeams[0].id;
          setSelectedTeamId(activeTeamId);
        }
      }

      // 2. Fetch KPI data for all members of this leader (scoped by selected team)
      if (user.email) {
        const kpiRes = await allPlatformKpiService.getAll(user.email, activeTeamId || undefined);
        if (kpiRes.success && kpiRes.data?.members) {
          setKpiData(kpiRes.data.members);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedTeamId]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, selectedTeamId, fetchData]);

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
      sumCurrent += m.kpiCommentCurrent + m.kpiPostCurrent + m.kpiLeadCurrent;
      sumTarget += m.kpiCommentTarget + m.kpiPostTarget + m.kpiLeadTarget;
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
          </div>

          <div className="flex items-center gap-2">
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
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-2 py-3 whitespace-nowrap">Tên</th>
                <th className="px-2 py-3 whitespace-nowrap">Email</th>
                <th className="px-1 py-3 text-center whitespace-nowrap">Comment</th>
                <th className="px-1 py-3 text-center whitespace-nowrap">Post</th>
                <th className="px-1 py-3 text-center whitespace-nowrap">Lead</th>
                <th className="px-2 py-3 text-center whitespace-nowrap">Tiến độ</th>
                <th className="px-2 py-3 text-center whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#E3000F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Đang tải dữ liệu KPI...</span>
                    </div>
                  </td>
                </tr>
              ) : membersWithKpi.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-400 italic">
                    Chưa có thành viên nào trong team này.
                  </td>
                </tr>
              ) : (
                membersWithKpi.map(member => {
                  const totalTarget = member.kpiCommentTarget + member.kpiPostTarget + member.kpiLeadTarget;
                  const totalCurrent = member.kpiCommentCurrent + member.kpiPostCurrent + member.kpiLeadCurrent;
                  const percent = totalTarget === 0 ? 0 : Math.min(100, Math.round((totalCurrent / totalTarget) * 100));

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-2 py-3">
                        <div className="font-bold text-slate-800 whitespace-nowrap">{member.name || "N/A"}</div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-slate-500 font-medium text-xs max-w-[150px] truncate" title={member.email}>{member.email}</div>
                      </td>
                      <td className="px-1 py-3 text-center font-mono">
                        <span className="font-bold text-slate-800">{member.kpiCommentCurrent}</span>
                        <span className="text-slate-400"> / {member.kpiCommentTarget}</span>
                      </td>
                      <td className="px-1 py-3 text-center font-mono">
                        <span className="font-bold text-slate-800">{member.kpiPostCurrent}</span>
                        <span className="text-slate-400"> / {member.kpiPostTarget}</span>
                      </td>
                      <td className="px-1 py-3 text-center font-mono">
                        <span className="font-bold text-slate-800">{member.kpiLeadCurrent}</span>
                        <span className="text-slate-400"> / {member.kpiLeadTarget}</span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center gap-1.5 w-full max-w-[80px] mx-auto">
                          <div className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full w-full",
                            percent >= 100 ? "bg-green-100 text-green-700" :
                            percent > 50 ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {percent}%
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", percent >= 100 ? "bg-green-500" : percent > 50 ? "bg-amber-500" : "bg-[#E3000F]")}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewSeeding(member)}
                            className="inline-flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2 py-1.5 rounded-lg text-xs transition cursor-pointer border border-blue-100"
                          >
                            <MaterialIcon name="visibility" className="text-[16px]" />
                            Xem Seeding
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAssignKpi(member)}
                            className="inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1.5 rounded-lg text-xs transition cursor-pointer"
                          >
                            <MaterialIcon name="assignment" className="text-[16px]" />
                            Giao KPI
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
