"use client";

import React, { useState, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";

// --- MOCK DATA GENERATOR ---
// Trong thực tế, dữ liệu này sẽ được gọi từ API GET /api/all-platform/kpi/team-history
interface KpiTeamStats {
  team_id: string;
  team_name: string;
  lead_actual: number;
  lead_target: number;
  inbox_actual: number;
  inbox_target: number;
  post_actual: number;
  post_target: number;
  comment_actual: number;
  comment_target: number;
}

interface WeeklySnapshot {
  week_name: string; // VD: "2024-W25"
  teams: KpiTeamStats[];
}

function generateMockHistory(): WeeklySnapshot[] {
  const weeks = ["2024-W22", "2024-W23", "2024-W24", "2024-W25"];
  const teamNames = ["Team HN 1", "Team SG 2", "Team Online"];
  
  return weeks.map(week => ({
    week_name: week,
    teams: teamNames.map((name, idx) => {
      // Giả lập số liệu (tuần càng mới số càng cao/đều hơn)
      const isGoodWeek = week === "2024-W25" || idx === 0;
      const t_lead = 50 + idx * 10;
      const t_inbox = 100 + idx * 20;
      const t_post = 20;
      const t_comment = 500;

      return {
        team_id: `t_${idx}`,
        team_name: name,
        lead_target: t_lead,
        lead_actual: isGoodWeek ? t_lead + Math.floor(Math.random() * 10) : t_lead - Math.floor(Math.random() * 20),
        inbox_target: t_inbox,
        inbox_actual: isGoodWeek ? t_inbox + Math.floor(Math.random() * 5) : t_inbox - Math.floor(Math.random() * 40),
        post_target: t_post,
        post_actual: isGoodWeek ? t_post : t_post - Math.floor(Math.random() * 5),
        comment_target: t_comment,
        comment_actual: isGoodWeek ? t_comment + 50 : t_comment - 100,
      };
    })
  })).reverse(); // Tuần mới nhất ở trên cùng
}

export function AdminKpiHistoryTable() {
  const [data] = useState<WeeklySnapshot[]>(() => generateMockHistory());

  // Helper tính %
  const calcPct = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((actual / target) * 100);
  };

  // Helper format % với màu
  const PctCell = ({ pct }: { pct: number }) => {
    let colorClass = "text-[#1A1A1A]";
    let bgClass = "";
    if (pct >= 100) { colorClass = "text-emerald-700 font-bold"; bgClass = "bg-emerald-50"; }
    else if (pct >= 70) { colorClass = "text-amber-700 font-bold"; bgClass = "bg-amber-50"; }
    else { colorClass = "text-red-600 font-bold"; bgClass = "bg-red-50"; }
    return <td className={`border border-slate-200 px-2 py-1.5 text-right ${colorClass} ${bgClass}`}>{pct}%</td>;
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden flex flex-col mt-6">
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
            <MaterialIcon name="table_chart" className="text-emerald-600" />
            Bảng Tổng hợp KPI theo Tuần (History)
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">Dữ liệu mô phỏng (Simulated) để chuẩn bị cho API chốt số tuần.</p>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-[11px] border-collapse min-w-[1000px]">
          <thead>
            {/* Header Dòng 1: Các nhóm lớn */}
            <tr>
              <th className="border border-slate-300 bg-slate-100 p-2 text-center font-bold text-slate-700 w-[80px]" rowSpan={2}>TUẦN</th>
              <th className="border border-slate-300 bg-slate-100 p-2 text-left font-bold text-slate-700 min-w-[120px]" rowSpan={2}>TEAM</th>
              
              <th className="border border-indigo-200 bg-indigo-50 p-1.5 text-center font-black text-indigo-700" colSpan={3}>LEAD (40%)</th>
              <th className="border border-amber-200 bg-amber-50 p-1.5 text-center font-black text-amber-700" colSpan={3}>INBOX (40%)</th>
              <th className="border border-blue-200 bg-blue-50 p-1.5 text-center font-black text-blue-700" colSpan={3}>POST (15%)</th>
              <th className="border border-teal-200 bg-teal-50 p-1.5 text-center font-black text-teal-700" colSpan={3}>COMMENT (5%)</th>
              
              <th className="border border-slate-300 bg-slate-800 p-1.5 text-center font-black text-white" colSpan={2}>TỔNG KẾT</th>
            </tr>
            {/* Header Dòng 2: Cột chi tiết */}
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">Số</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">KPI</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[45px]">%</th>

              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">Số</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">KPI</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[45px]">%</th>

              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">Số</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">KPI</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[45px]">%</th>

              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">Số</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[40px]">KPI</th>
              <th className="border border-slate-200 px-2 py-1 text-center w-[45px]">%</th>

              <th className="border border-slate-300 px-2 py-1 text-center w-[60px] bg-slate-100 text-slate-700">TỔNG %</th>
              <th className="border border-slate-300 px-2 py-1 text-center w-[80px] bg-slate-100 text-slate-700">THƯỞNG</th>
            </tr>
          </thead>
          <tbody>
            {data.map((snapshot) => {
              // Tính tổng cho Footer của tuần này
              const weekSum = snapshot.teams.reduce((acc, team) => {
                acc.lead_a += team.lead_actual; acc.lead_t += team.lead_target;
                acc.inbox_a += team.inbox_actual; acc.inbox_t += team.inbox_target;
                acc.post_a += team.post_actual; acc.post_t += team.post_target;
                acc.cmm_a += team.comment_actual; acc.cmm_t += team.comment_target;
                return acc;
              }, { lead_a: 0, lead_t: 0, inbox_a: 0, inbox_t: 0, post_a: 0, post_t: 0, cmm_a: 0, cmm_t: 0 });

              return (
                <React.Fragment key={snapshot.week_name}>
                  {snapshot.teams.map((team, idx) => {
                    const pctLead = calcPct(team.lead_actual, team.lead_target);
                    const pctInbox = calcPct(team.inbox_actual, team.inbox_target);
                    const pctPost = calcPct(team.post_actual, team.post_target);
                    const pctCmm = calcPct(team.comment_actual, team.comment_target);
                    
                    // Cap từng hạng mục tối đa 100% nếu muốn (ở đây cap 150% cho đẹp)
                    const cap = (val: number) => Math.min(val, 150);
                    const totalPct = Math.round((cap(pctLead)*0.4) + (cap(pctInbox)*0.4) + (cap(pctPost)*0.15) + (cap(pctCmm)*0.05));
                    
                    const bonus = totalPct >= 100 ? "500.000đ" : totalPct >= 80 ? "200.000đ" : "0đ";
                    const bonusColor = totalPct >= 100 ? "text-emerald-600 font-bold" : totalPct >= 80 ? "text-amber-600 font-bold" : "text-slate-400";

                    return (
                      <tr key={team.team_id} className="hover:bg-blue-50/30 transition-colors">
                        {idx === 0 && (
                          <td className="border border-slate-300 px-2 py-1.5 text-center font-black text-slate-800 align-middle bg-white" rowSpan={snapshot.teams.length + 1}>
                            {snapshot.week_name}
                          </td>
                        )}
                        <td className="border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-800">{team.team_name}</td>
                        
                        {/* LEAD */}
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.lead_actual}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.lead_target}</td>
                        <PctCell pct={pctLead} />

                        {/* INBOX */}
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.inbox_actual}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.inbox_target}</td>
                        <PctCell pct={pctInbox} />

                        {/* POST */}
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.post_actual}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.post_target}</td>
                        <PctCell pct={pctPost} />

                        {/* COMMENT */}
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.comment_actual}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.comment_target}</td>
                        <PctCell pct={pctCmm} />

                        {/* TOTAL */}
                        <td className={`border border-slate-300 px-2 py-1.5 text-center font-black ${totalPct >= 100 ? 'text-emerald-600 bg-emerald-50/50' : totalPct >= 80 ? 'text-amber-600 bg-amber-50/50' : 'text-red-600 bg-red-50/50'}`}>
                          {totalPct}%
                        </td>
                        <td className={`border border-slate-300 px-2 py-1.5 text-right bg-slate-50/50 ${bonusColor}`}>
                          {bonus}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* FOOTER ROW FOR WEEK */}
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-[10px] uppercase">Tổng {snapshot.week_name}</td>
                    
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{weekSum.lead_a}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{weekSum.lead_t}</td>
                    <PctCell pct={calcPct(weekSum.lead_a, weekSum.lead_t)} />

                    <td className="border border-slate-300 px-2 py-1.5 text-right">{weekSum.inbox_a}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{weekSum.inbox_t}</td>
                    <PctCell pct={calcPct(weekSum.inbox_a, weekSum.inbox_t)} />

                    <td className="border border-slate-300 px-2 py-1.5 text-right">{weekSum.post_a}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{weekSum.post_t}</td>
                    <PctCell pct={calcPct(weekSum.post_a, weekSum.post_t)} />

                    <td className="border border-slate-300 px-2 py-1.5 text-right">{weekSum.cmm_a}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">{weekSum.cmm_t}</td>
                    <PctCell pct={calcPct(weekSum.cmm_a, weekSum.cmm_t)} />

                    <td className="border border-slate-300 px-2 py-1.5 text-center bg-slate-200">
                      {Math.round((calcPct(weekSum.lead_a, weekSum.lead_t)*0.4) + (calcPct(weekSum.inbox_a, weekSum.inbox_t)*0.4) + (calcPct(weekSum.post_a, weekSum.post_t)*0.15) + (calcPct(weekSum.cmm_a, weekSum.cmm_t)*0.05))}%
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 bg-slate-200"></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
