"use client";

import { useState, useEffect, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { allPlatformKpiService } from "@/services/all-platform.service";
import { LeaderPostView } from "@/components/all-platform/leader/LeaderPostView";
import { SeedingModal } from "@/components/all-platform/leader/SeedingModal";
import { cn } from "@/lib/utils";
import type { TeamRow } from "@/services/all-platform.service";

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

interface AdminMemberKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamRow | null;
}

export function AdminMemberKpiModal({ isOpen, onClose, team }: AdminMemberKpiModalProps) {
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postMember, setPostMember] = useState<{ email: string; name: string } | null>(null);

  const [seedingModalOpen, setSeedingModalOpen] = useState(false);
  const [selectedMemberSeeding, setSelectedMemberSeeding] = useState<any>(null);

  const recentWeeks = useMemo(() => getRecentWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState(recentWeeks[0].value);

  useEffect(() => {
    async function loadKpiData() {
      if (!team?.leader_email) return;
      setIsLoading(true);
      setError(null);
      try {
        const [startDate, endDate] = selectedWeek.split("_");
        const res = await allPlatformKpiService.getAll(team.leader_email, undefined, startDate, endDate);
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
  }, [isOpen, team, selectedWeek]);

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
      const inboxCurrent = stats.kpi_inbox_current || 0;
      const inboxRange = stats.kpi_inbox_range || null;

      const totalTarget = commentTarget + postTarget + leadTarget + inboxTarget;
      const totalCurrent = commentCurrent + postCurrent + leadCurrent + inboxCurrent;
      const percent = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;

      return {
        ...member,
        commentTarget, commentCurrent,
        postTarget, postCurrent,
        leadTarget, leadCurrent,
        inboxTarget, inboxCurrent,
        percent,
        seedingItems: kpiInfo.seeding_items || [],
        kpiInboxRange: inboxRange,
      };
    });
  }, [team, kpiData]);

  if (!isOpen || !team) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          position: "relative", zIndex: 10, width: "100%", maxWidth: 900,
          backgroundColor: "#ffffff", borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MaterialIcon name="visibility" className="text-[#E3000F]" />
              Thành viên & KPI — {team.name_team}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Leader: {team.leader_name} ({team.leader_email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-600">Tuần:</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition shadow-sm"
            >
              {recentWeeks.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition ml-2">
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 border-4 border-[#E3000F] border-t-transparent rounded-full animate-spin" />
              <span>Đang tải KPI...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-medium flex items-start gap-2 border border-red-100">
              <MaterialIcon name="error" className="text-[16px] shrink-0" />
              <span>{error}</span>
            </div>
          ) : membersWithKpi.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <MaterialIcon name="inbox" className="text-slate-300 text-5xl mb-2" />
              <p className="text-sm font-medium text-slate-500">Team chưa có thành viên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider">Thành viên</th>
                    <th className="text-center px-1 py-2.5 font-bold text-[10px] uppercase tracking-wider">Post</th>
                    <th className="text-center px-1 py-2.5 font-bold text-[10px] uppercase tracking-wider">Comment</th>
                    <th className="text-center px-1 py-2.5 font-bold text-[10px] uppercase tracking-wider">Inbox</th>
                    <th className="text-center px-1 py-2.5 font-bold text-[10px] uppercase tracking-wider">Lead</th>
                    <th className="text-center px-2 py-2.5 font-bold text-[10px] uppercase tracking-wider">Tiến độ</th>
                    <th className="text-center px-2 py-2.5 font-bold text-[10px] uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {membersWithKpi.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800 text-xs">{m.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{m.email}</div>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className={m.postCurrent > 0 ? "font-bold text-emerald-600 text-[11px]" : "font-bold text-slate-800 text-[11px]"}>{m.postCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {m.postTarget}</span>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className="font-bold text-slate-800 text-[11px]">{m.commentCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {m.commentTarget}</span>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className={m.inboxCurrent >= m.inboxTarget && m.inboxTarget > 0 ? "font-bold text-emerald-600 text-[11px]" : "font-bold text-slate-800 text-[11px]"}>{m.inboxCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {m.inboxTarget}</span>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <span className="font-bold text-slate-800 text-[11px]">{m.leadCurrent}</span>
                        <span className="text-slate-400 text-[10px]"> / {m.leadTarget}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                m.percent >= 100 ? "bg-emerald-500" : m.percent > 50 ? "bg-amber-500" : "bg-[#E3000F]"
                              )}
                              style={{ width: `${m.percent}%` }}
                            />
                          </div>
                          <span className={cn(
                            "font-bold text-[10px]",
                            m.percent >= 100 ? "text-emerald-700" : m.percent > 50 ? "text-amber-700" : "text-slate-600"
                          )}>
                            {m.percent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={() => {
                            setSelectedMemberSeeding(m);
                            setSeedingModalOpen(true);
                          }}
                            className="inline-flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-md text-[10px] transition border border-blue-100">
                            <MaterialIcon name="visibility" className="text-[11px]" />Seed
                          </button>
                          <button onClick={() => {
                            setPostMember({ email: m.email, name: m.name || m.email });
                            setPostModalOpen(true);
                          }}
                            className="inline-flex items-center gap-0.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold px-2 py-1 rounded-md text-[10px] transition border border-green-100">
                            <MaterialIcon name="article" className="text-[11px]" />Posts
                          </button>
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
          <button type="button" onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            Đóng
          </button>
        </div>
      </div>

      {postModalOpen && postMember && (
        <LeaderPostView
          isOpen={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          memberEmail={postMember.email}
          memberName={postMember.name}
          startDate={membersWithKpi.find(m => m.email === postMember.email)?.kpiInboxRange?.start}
          endDate={membersWithKpi.find(m => m.email === postMember.email)?.kpiInboxRange?.end}
          onStatusChange={() => {}}
        />
      )}

      {seedingModalOpen && selectedMemberSeeding && (
        <SeedingModal
          isOpen={seedingModalOpen}
          onClose={() => setSeedingModalOpen(false)}
          member={{ ...selectedMemberSeeding, seedingItems: selectedMemberSeeding.seedingItems || [] }}
        />
      )}
    </div>
  );
}
