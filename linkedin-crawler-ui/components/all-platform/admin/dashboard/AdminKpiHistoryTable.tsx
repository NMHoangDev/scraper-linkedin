"use client";

import React, { memo, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import { allPlatformKpiService } from "@/services/all-platform.service";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

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
  /**
   * Phase 4: nếu parent đã có dữ liệu (từ RPC overview), truyền xuống đây
   * để khỏi gọi API trùng → giảm 1 HTTP request khi load admin dashboard.
   */
  initialData?: WeeklySnapshot[];
  /** Phase 4: nếu true thì KHÔNG gọi getTeamHistoryV2 ngay cả khi initialData rỗng
   *  (parent đang fetch overview, đợi). */
  skipFetch?: boolean;
}

function AdminKpiHistoryTableInner({ leaderEmail, weeks = 4, initialData, skipFetch }: Props) {
  const [data, setData] = useState<WeeklySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  useEffect(() => {
    // Phase 4: nếu parent đã truyền initialData thì dùng luôn.
    if (initialData && initialData.length > 0) {
      setData(initialData);
      setLoading(false);
      setError("");
      return;
    }
    if (skipFetch) {
      setLoading(true);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    // Phase 4: dùng V2 (cache 30s + pre-index) — admin load nhanh hơn nhiều.
    allPlatformKpiService.getTeamHistoryV2(leaderEmail, weeks)
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setData(res.data);
        } else {
          setError(res.message || "Không lấy được dữ liệu");
        }
      })
      .catch(() => setError("Lỗi kết nối API"))
      .finally(() => setLoading(false));
  }, [leaderEmail, weeks, initialData, skipFetch]);

  const calcPct = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((actual / target) * 100);
  };

  const PctCell = ({ pct }: { pct: number }) => {
    let colorClass = "text-[#000000] font-bold";
    let bgClass = "bg-white";
    if (pct === 0) { 
      colorClass = "text-[#DC2626] font-black"; 
    } else if (pct >= 100) {
      bgClass = "bg-emerald-200";
      colorClass = "text-emerald-800 font-bold";
    }
    return <td className={`border-b border-r border-slate-50 px-2 py-1.5 text-right ${colorClass} ${bgClass}`}>{pct}%</td>;
  };

  const renderMobileAccordion = () => {
    if (loading || error || data.length === 0) return null;
    return (
      <div className="block lg:hidden divide-y divide-slate-100 p-2">
        {data.map((snapshot) => (
          <div key={snapshot.week_name} className="py-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase px-2 mb-2">{snapshot.week_name}</h4>
            <div className="flex flex-col gap-2">
              {snapshot.teams.map((team) => {
                const id = `${snapshot.week_name}-${team.team_id}`;
                const isOpen = openAccordion === id;

                const pctLead = calcPct(team.lead_actual, team.lead_target);
                const pctInbox = calcPct(team.inbox_actual, team.inbox_target);
                const pctPost = calcPct(team.post_actual, team.post_target);
                const pctCmm = calcPct(team.comment_actual, team.comment_target);
                const cap = (v: number) => Math.min(v, 150);
                const totalPct = Math.round(cap(pctLead)*0.4 + cap(pctInbox)*0.4 + cap(pctPost)*0.15 + cap(pctCmm)*0.05);

                const totalColor = totalPct < 100 ? "text-red-600" : "text-emerald-600";

                return (
                  <div key={team.team_id} className="border-b border-r border-slate-50 rounded-lg overflow-hidden bg-white">
                    {/* Header Card */}
                    <button 
                      onClick={() => setOpenAccordion(isOpen ? null : id)}
                      className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition active:bg-slate-100 cursor-pointer"
                    >
                      <div className="text-sm font-bold text-slate-800 text-left">
                        {team.team_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${totalColor}`}>
                          Tổng: {totalPct}%
                        </span>
                        {isOpen ? <FaChevronUp className="text-slate-400 text-[10px]" /> : <FaChevronDown className="text-slate-400 text-[10px]" />}
                      </div>
                    </button>

                    {/* Content Card */}
                    {isOpen && (
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-3">
                        {/* Lead */}
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] shadow-sm">
                          <div className="mb-1 font-bold uppercase text-amber-600">Lead</div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium">Số: {team.lead_actual}</span>
                            <span className="text-slate-500 font-medium">KPI: {team.lead_target}</span>
                          </div>
                          <div className="mt-1 font-black text-right text-slate-900">
                            %: {pctLead}%
                          </div>
                        </div>

                        {/* Inbox */}
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] shadow-sm">
                          <div className="mb-1 font-bold uppercase text-sky-600">Inbox</div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium">Số: {team.inbox_actual}</span>
                            <span className="text-slate-500 font-medium">KPI: {team.inbox_target}</span>
                          </div>
                          <div className="mt-1 font-black text-right text-slate-900">
                            %: {pctInbox}%
                          </div>
                        </div>

                        {/* Post */}
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] shadow-sm">
                          <div className="mb-1 font-bold uppercase text-violet-600">Post</div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium">Số: {team.post_actual}</span>
                            <span className="text-slate-500 font-medium">KPI: {team.post_target}</span>
                          </div>
                          <div className="mt-1 font-black text-right text-slate-900">
                            %: {pctPost}%
                          </div>
                        </div>

                        {/* Comment */}
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] shadow-sm">
                          <div className="mb-1 font-bold uppercase text-emerald-600">Comment</div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium">Số: {team.comment_actual}</span>
                            <span className="text-slate-500 font-medium">KPI: {team.comment_target}</span>
                          </div>
                          <div className="mt-1 font-black text-right text-slate-900">
                            %: {pctCmm}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col mb-6">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
            <MaterialIcon name="table_view" className="text-red-600" />
            Bảng Tổng hợp KPI theo Tuần 
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

      {/* Render Mobile Accordion */}
      {renderMobileAccordion()}

      {/* Render Desktop Table */}
      {!loading && !error && data.length > 0 && (
        <div className="hidden lg:block overflow-x-auto p-4">
          <table className="w-full text-[11px] border-collapse min-w-[1000px]">
            <thead className="bg-[#DC2626] text-white">
              <tr>
                <th className="text-white font-bold text-xs py-3 px-4 border-r border-white/20 text-center uppercase w-[80px]" rowSpan={2}>Tuần</th>
                <th className="text-white font-bold text-xs py-3 px-4 border-r border-white/20 text-left uppercase min-w-[120px]" rowSpan={2}>Team</th>
                <th className="text-white font-bold text-xs py-2 px-2 border-r border-b border-white/20 text-center uppercase" colSpan={3}>Lead (40%)</th>
                <th className="text-white font-bold text-xs py-2 px-2 border-r border-b border-white/20 text-center uppercase" colSpan={3}>Inbox (40%)</th>
                <th className="text-white font-bold text-xs py-2 px-2 border-r border-b border-white/20 text-center uppercase" colSpan={3}>Post (15%)</th>
                <th className="text-white font-bold text-xs py-2 px-2 border-r border-b border-white/20 text-center uppercase" colSpan={3}>Comment (5%)</th>
                <th className="text-white font-bold text-xs py-2 px-2 border-b border-white/20 text-center uppercase" colSpan={2}>Tổng kết</th>
              </tr>
              <tr>
                {["Số", "KPI", "%", "Số", "KPI", "%", "Số", "KPI", "%", "Số", "KPI", "%"].map((h, i) => (
                  <th key={i} className="text-white font-bold text-[10px] py-1.5 px-2 border-r border-white/20 text-center uppercase w-[40px]">{h}</th>
                ))}
                <th className="text-white font-bold text-[10px] py-1.5 px-2 border-r border-white/20 text-center uppercase w-[60px]">Tổng %</th>
                <th className="text-white font-bold text-[10px] py-1.5 px-2 text-center uppercase w-[80px]">Thưởng</th>
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
                        <tr key={team.team_id} className="bg-white hover:bg-slate-50 transition-colors">
                          {idx === 0 && (
                            <td className="border-b border-r border-slate-50 px-2 py-1.5 text-center font-black text-slate-800 align-middle bg-white" rowSpan={snapshot.teams.length + 1}>
                              {snapshot.week_name}
                            </td>
                          )}
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-left font-bold text-slate-800">{team.team_name}</td>
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right font-medium">{team.lead_actual}</td>
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{team.lead_target}</td>
                          <PctCell pct={pctLead} />
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right font-medium">{team.inbox_actual}</td>
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{team.inbox_target}</td>
                          <PctCell pct={pctInbox} />
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right font-medium">{team.post_actual}</td>
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{team.post_target}</td>
                          <PctCell pct={pctPost} />
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right font-medium">{team.comment_actual}</td>
                          <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{team.comment_target}</td>
                          <PctCell pct={pctCmm} />
                          <td className={`border-b border-r border-slate-50 px-2 py-1.5 text-center font-black ${totalPct >= 100 ? 'text-emerald-800 bg-emerald-200' : totalPct >= 80 ? 'text-amber-700 bg-amber-100' : 'text-[#DC2626] bg-white'}`}>{totalPct}%</td>
                          <td className={`border-b border-r border-slate-50 px-2 py-1.5 text-right bg-slate-50/50 ${bonusColor}`}>{bonus}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100 font-bold text-slate-700">
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-[10px] uppercase">Tổng {snapshot.week_name}</td>
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right">{weekSum.lead_a}</td>
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{weekSum.lead_t}</td>
                      <PctCell pct={calcPct(weekSum.lead_a, weekSum.lead_t)} />
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right">{weekSum.inbox_a}</td>
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{weekSum.inbox_t}</td>
                      <PctCell pct={calcPct(weekSum.inbox_a, weekSum.inbox_t)} />
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right">{weekSum.post_a}</td>
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{weekSum.post_t}</td>
                      <PctCell pct={calcPct(weekSum.post_a, weekSum.post_t)} />
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right">{weekSum.cmm_a}</td>
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-right text-slate-500">{weekSum.cmm_t}</td>
                      <PctCell pct={calcPct(weekSum.cmm_a, weekSum.cmm_t)} />
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 text-center bg-slate-200">
                        {Math.round(calcPct(weekSum.lead_a,weekSum.lead_t)*0.4 + calcPct(weekSum.inbox_a,weekSum.inbox_t)*0.4 + calcPct(weekSum.post_a,weekSum.post_t)*0.15 + calcPct(weekSum.cmm_a,weekSum.cmm_t)*0.05)}%
                      </td>
                      <td className="border-b border-r border-slate-50 px-2 py-1.5 bg-slate-200"></td>
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

// Phase 4: memo để không re-render khi parent (AdminDashboardPage) đổi state khác.
export const AdminKpiHistoryTable = memo(AdminKpiHistoryTableInner);
