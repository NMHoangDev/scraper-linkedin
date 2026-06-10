"use client";

import { useState, useEffect, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { allPlatformKpiService } from "@/services/all-platform.service";
import type { TeamRow } from "@/services/all-platform.service";

interface AdminMemberKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamRow | null;
}

export function AdminMemberKpiModal({ isOpen, onClose, team }: AdminMemberKpiModalProps) {
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKpiData() {
      if (!team?.leader_email) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await allPlatformKpiService.getAll(team.leader_email);
        if (res.success && res.data?.members) {
          setKpiData(res.data.members);
        } else {
          setError(res.message || "Không thể tải dữ liệu KPI của nhóm");
        }
      } catch (err) {
        console.error("Lỗi khi tải KPI:", err);
        setError("Lỗi kết nối máy chủ");
      } finally {
        setIsLoading(false);
      }
    }
    if (isOpen && team) {
      loadKpiData();
    }
  }, [isOpen, team]);

  const membersWithKpi = useMemo(() => {
    if (!team) return [];
    const teamMembers = team.members || [];
    return teamMembers.map(member => {
      const kpiInfo = kpiData.find(k => k.id === member.id) || {};
      const stats = kpiInfo.seeding_stats || {};
      
      const commentTarget = stats.kpi_target || 0;
      const commentCurrent = stats.verified_count || 0;
      const postTarget = stats.kpi_post || 0;
      const postCurrent = stats.kpi_post_current || 0;
      const leadTarget = stats.kpi_lead || 0;
      const leadCurrent = stats.kpi_lead_current || 0;
      const inboxTarget = stats.kpi_inbox || 0;
      const inboxCurrent = stats.kpi_inbox_current || 0; // Assuming inbox progress exists in api output

      // Calculate overall completion percent
      const totalTarget = commentTarget + postTarget + leadTarget + inboxTarget;
      const totalCurrent = commentCurrent + postCurrent + leadCurrent + inboxCurrent;
      const percent = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;

      return {
        ...member,
        commentTarget,
        commentCurrent,
        postTarget,
        postCurrent,
        leadTarget,
        leadCurrent,
        inboxTarget,
        inboxCurrent,
        percent,
      };
    });
  }, [team, kpiData]);

  if (!isOpen || !team) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          cursor: 'pointer'
        }}
      />
      
      {/* Modal Content */}
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '800px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MaterialIcon name="visibility" className="text-[#E3000F]" />
              Thành viên & KPI của Team: {team.name_team}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Leader: {team.leader_name} ({team.leader_email})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition">
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="w-8 h-8 border-4 border-[#E3000F] border-t-transparent rounded-full animate-spin" />
              <span>Đang tải KPI của các thành viên...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-medium flex items-start gap-2 border border-red-100">
              <MaterialIcon name="error" className="text-[16px] shrink-0" />
              <span>{error}</span>
            </div>
          ) : membersWithKpi.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <MaterialIcon name="inbox" className="text-slate-300 text-5xl mb-2" />
              <p className="text-sm font-medium text-slate-500">Team này chưa có thành viên nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider">Thành viên</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider">KPI Comment</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider">KPI Post</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider">KPI Lead</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider">Đạt được (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {membersWithKpi.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 text-xs">{m.name || "Chưa đặt tên"}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{m.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className="font-semibold text-slate-800">{m.commentCurrent}</span>
                        <span className="text-slate-400"> / {m.commentTarget}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className="font-semibold text-slate-800">{m.postCurrent}</span>
                        <span className="text-slate-400"> / {m.postTarget}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className="font-semibold text-slate-800">{m.leadCurrent}</span>
                        <span className="text-slate-400"> / {m.leadTarget}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                m.percent >= 100 
                                  ? "bg-emerald-500" 
                                  : m.percent > 50 
                                  ? "bg-blue-500" 
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${m.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0 w-8 text-right">
                            {m.percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-4 border-t border-slate-100 bg-white">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
