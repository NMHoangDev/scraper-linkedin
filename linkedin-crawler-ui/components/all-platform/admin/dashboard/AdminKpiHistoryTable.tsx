"use client";

import React, { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import { allPlatformKpiService } from "@/services/all-platform.service";

interface KpiTeamStats {
  team_id: string; team_name: string;
  lead_actual: number; lead_target: number;
  inbox_actual: number; inbox_target: number;
  post_actual: number; post_target: number;
  comment_actual: number; comment_target: number;
}

interface WeeklySnapshot { week_name: string; teams: KpiTeamStats[]; }

interface Props {
  /** Leader email — bỏ trống nếu admin (lấy tất cả team) */
  leaderEmail?: string;
  weeks?: number;
}

export function AdminKpiHistoryTable({ leaderEmail, weeks = 4 }: Props) {
  const [data, setData] = useState<WeeklySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    allPlatformKpiService.getTeamHistory(leaderEmail, weeks)
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setData(res.data);
        } else {
          setError(res.message || "Không lấy được dữ liệu");
        }
      })
      .catch(() => setError("Lỗi kết nối API"))
      .finally(() => setLoading(false));
  }, [leaderEmail, weeks]);

  const calcPct = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((actual / target) * 100);
  };

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
            <MaterialIcon name="table_view" className="text-emerald-600" />
            Bảng Tổng hợp KPI theo Tuần (History)
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            {loading ? "Đang tải..." : error ? error : `${weeks} tuần gần nhất • Inbox + Post KPI thực tế`}
          </p>
        </div>
        {!loading && !error && (
          <span className="text-[10px] text-slate-400">{data.length} tuần</span>
        )}
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-400 text-sm">Đang tải dữ liệu...</div>
      )}
      {!loading && error && (
        <div className="p-8 text-center text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && data.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-sm">Chưa có dữ liệu KPI</div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-[11px] border-collapse min-w-[1000px]">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-slate-100 p-2 text-center font-bold text-slate-700 w-[80px]" rowSpan={2}>TUẦN</th>
                <th className="border border-slate-300 bg-slate-100 p-2 text-left font-bold text-slate-700 min-w-[120px]" rowSpan={2}>TEAM</th>
                <th className="border border-indigo-200 bg-indigo-50 p-1.5 text-center font-black text-indigo-700" colSpan={3}>LEAD (40%)</th>
                <th className="border border-amber-200 bg-amber-50 p-1.5 text-center font-black text-amber-700" colSpan={3}>INBOX (40%)</th>
                <th className="border border-blue-200 bg-blue-50 p-1.5 text-center font-black text-blue-700" colSpan={3}>POST (15%)</th>
                <th className="border border-teal-200 bg-teal-50 p-1.5 text-center font-black text-teal-700" colSpan={3}>COMMENT (5%)</th>
                <th className="border border-slate-300 bg-slate-800 p-1.5 text-center font-black text-white" colSpan={2}>TỔNG KẾT</th>
              </tr>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                {["Số", "KPI", "%", "Số", "KPI", "%", "Số", "KPI", "%", "Số", "KPI", "%"].map((h, i) => (
                  <th key={i} className="border border-slate-200 px-2 py-1 text-center w-[40px]">{h}</th>
                ))}
                <th className="border border-slate-300 px-2 py-1 text-center w-[60px] bg-slate-100 text-slate-700">TỔNG %</th>
                <th className="border border-slate-300 px-2 py-1 text-center w-[80px] bg-slate-100 text-slate-700">THƯỞNG</th>
              </tr>
            </thead>
            <tbody>
              {data.map((snapshot) => {
                const weekSum = snapshot.teams.reduce((acc, t) => {
                  acc.lead_a += t.lead_actual; acc.lead_t += t.lead_target;
                  acc.inbox_a += t.inbox_actual; acc.inbox_t += t.inbox_target;
                  acc.post_a += t.post_actual; acc.post_t += t.post_target;
                  acc.cmm_a += t.comment_actual; acc.cmm_t += t.comment_target;
                  return acc;
                }, { lead_a: 0, lead_t: 0, inbox_a: 0, inbox_t: 0, post_a: 0, post_t: 0, cmm_a: 0, cmm_t: 0 });

                return (
                  <React.Fragment key={snapshot.week_name}>
                    {snapshot.teams.map((team, idx) => {
                      const pctLead = calcPct(team.lead_actual, team.lead_target);
                      const pctInbox = calcPct(team.inbox_actual, team.inbox_target);
                      const pctPost = calcPct(team.post_actual, team.post_target);
                      const pctCmm = calcPct(team.comment_actual, team.comment_target);
                      const cap = (v: number) => Math.min(v, 150);
                      const totalPct = Math.round(cap(pctLead)*0.4 + cap(pctInbox)*0.4 + cap(pctPost)*0.15 + cap(pctCmm)*0.05);
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
                          <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.lead_actual}</td>
                          <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.lead_target}</td>
                          <PctCell pct={pctLead} />
                          <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.inbox_actual}</td>
                          <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.inbox_target}</td>
                          <PctCell pct={pctInbox} />
                          <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.post_actual}</td>
                          <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.post_target}</td>
                          <PctCell pct={pctPost} />
                          <td className="border border-slate-200 px-2 py-1.5 text-right font-medium">{team.comment_actual}</td>
                          <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{team.comment_target}</td>
                          <PctCell pct={pctCmm} />
                          <td className={`border border-slate-300 px-2 py-1.5 text-center font-black ${totalPct >= 100 ? 'text-emerald-600 bg-emerald-50/50' : totalPct >= 80 ? 'text-amber-600 bg-amber-50/50' : 'text-red-600 bg-red-50/50'}`}>{totalPct}%</td>
                          <td className={`border border-slate-300 px-2 py-1.5 text-right bg-slate-50/50 ${bonusColor}`}>{bonus}</td>
                        </tr>
                      );
                    })}
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
                        {Math.round(calcPct(weekSum.lead_a,weekSum.lead_t)*0.4 + calcPct(weekSum.inbox_a,weekSum.inbox_t)*0.4 + calcPct(weekSum.post_a,weekSum.post_t)*0.15 + calcPct(weekSum.cmm_a,weekSum.cmm_t)*0.05)}%
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 bg-slate-200"></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
