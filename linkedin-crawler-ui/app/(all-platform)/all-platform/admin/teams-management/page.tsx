"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { teamsService, allPlatformKpiService } from "@/services/all-platform.service";
import type { TeamRow } from "@/services/all-platform.service";
import { AdminTeamModal } from "@/components/all-platform/admin/AdminTeamModal";
import { AdminMemberKpiModal } from "@/components/all-platform/admin/AdminMemberKpiModal";
import { PlatformStatsRow, PlatformStatCard } from "@/components/features/shared/PlatformStatCard";
import { FaTrash, FaEdit, FaEye } from "react-icons/fa";

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

  const isAdmin = user?.role === "admin";

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await teamsService.getAll();
      if (res.success && res.data) {
        const teamsData = res.data;
        setTeams(teamsData);

        // Fetch KPI data for all teams' leaders in parallel
        const kpiPromises = teamsData.map(async (t) => {
          if (!t.leader_email) return { teamId: t.id, members: [] };
          try {
            const kpiRes = await allPlatformKpiService.getAll(t.leader_email);
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
  }, []);

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
      <div className="flex flex-col items-center justify-center py-20 text-[#666666] space-y-2">
        <MaterialIcon name="block" className="text-5xl text-[#FF3344]" />
        <p className="font-bold text-base text-[#1A1A1A]">Quyền truy cập bị từ chối</p>
        <p className="text-sm">Trang này chỉ khả dụng đối với tài khoản Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Quản lý Teams (Admin)</h2>
          <p className="text-sm text-[#A0A0A0]">Quản lý toàn bộ danh sách team, gán leader và theo dõi KPI thành viên</p>
        </div>
        <button
          onClick={handleCreateTeam}
          className="flex items-center gap-2 bg-[#E3000F] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#C40009] transition shrink-0 cursor-pointer shadow-sm active:scale-95"
        >
          <MaterialIcon name="group_add" className="text-base" />
          Thêm Team Mới
        </button>
      </div>

      {/* Statistics Cards */}
      <PlatformStatsRow>
        <PlatformStatCard
          label="Tổng số Team"
          value={stats.totalTeams}
          accent="primary"
        />
        <PlatformStatCard
          label="Tổng số Thành viên"
          value={stats.totalMembers}
          accent="secondary"
        />
        <PlatformStatCard
          label="Team đạt KPI tuần này"
          value={`${stats.achievedTeams} / ${stats.totalTeams}`}
          accent="success"
          hint="Các team đạt >= 100% KPI chỉ tiêu"
          hintTone="up"
        />
        <PlatformStatCard
          label="Tỷ lệ hoàn thành KPI hệ thống"
          value={`${stats.completionRate}%`}
          accent="warning"
          hint="Tiến độ hoàn thành KPI của tất cả team"
          hintTone="neutral"
        />
      </PlatformStatsRow>

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
        <div className="text-center py-16 text-[#666666] flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-[#E5E5E5]">
          <div className="w-8 h-8 border-4 border-[#E3000F] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Đang tải danh sách team...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 bg-[#F5F5F5]/50 rounded-xl border border-dashed border-[#E5E5E5] flex flex-col items-center justify-center">
          <MaterialIcon name="groups" className="text-4xl text-[#A0A0A0] mb-2" />
          <p className="text-[#666666] text-sm font-semibold">Chưa có team nào</p>
          <button
            onClick={handleCreateTeam}
            className="mt-3 text-[#E3000F] text-sm font-bold hover:underline cursor-pointer"
          >
            + Tạo team đầu tiên
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[#1A1A1A]">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider">
                  Tên Team
                </th>
                <th className="text-left px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider">
                  Leader
                </th>
                <th className="text-center px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider w-[120px]">
                  Số thành viên
                </th>
                <th className="text-center px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider w-[320px]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] text-[#1A1A1A]">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-[#F5F5F5]/30 transition">
                  <td className="px-4 py-3 font-bold text-[#1A1A1A] align-middle">
                    {team.name_team}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="font-bold text-xs text-[#1A1A1A]">{team.leader_name || "Chưa đặt tên"}</div>
                    <div className="text-[10px] text-[#666666] font-medium">{team.leader_email}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xs text-[#666666] align-middle">
                    {team.number_of_member || 0}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewMembers(team)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E3000F]/5 text-[#E3000F] hover:bg-[#E3000F]/10 transition text-xs font-bold cursor-pointer shrink-0"
                      >
                        <FaEye size={12} /> Xem thành viên
                      </button>
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] border border-slate-200 rounded-xl transition text-xs font-bold cursor-pointer shrink-0"
                      >
                        <FaEdit size={12} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-[#666666] hover:text-[#FF3344] hover:bg-[#FF3344]/5 border border-slate-200 hover:border-red-200 rounded-xl transition text-xs font-bold cursor-pointer shrink-0"
                      >
                        <FaTrash size={12} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
