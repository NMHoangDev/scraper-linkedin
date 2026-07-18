"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MaterialIcon, type MaterialSymbolName } from "@/components/ui";
import {
  allPlatformKpiService,
  teamsService,
  type TeamRow,
} from "@/services/all-platform.service";

type MetricKey = "lead" | "inbox" | "post" | "comment";
type ViewMode = "overall" | MetricKey;

interface MetricStats {
  actual: number;
  target: number;
}

type MetricStatsMap = Record<MetricKey, MetricStats>;

interface LooseTeamMember {
  id?: string;
  email?: string;
  name?: string;
}

interface LooseKpiMember {
  id?: string;
  seeding_stats?: {
    kpi_lead_current?: number;
    kpi_lead?: number;
    kpi_inbox_current?: number;
    kpi_inbox?: number;
    kpi_post_current?: number;
    kpi_post?: number;
    verified_count?: number;
    kpi_target?: number;
  };
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  metrics: MetricStatsMap;
  score: number;
}

interface TeamAggregate {
  team: TeamRow;
  shortLabel: string;
  color: string;
  metrics: MetricStatsMap;
  score: number;
  memberCount: number;
  members: MemberRow[];
}

const METRIC_KEYS: MetricKey[] = ["lead", "inbox", "post", "comment"];

const METRIC_LABELS: Record<MetricKey, string> = {
  lead: "Lead",
  inbox: "Inbox",
  post: "Post",
  comment: "Comment",
};

const METRIC_ICONS: Record<MetricKey, MaterialSymbolName> = {
  lead: "assignment",
  inbox: "forum",
  post: "article",
  comment: "comment",
};

const METRIC_COLORS: Record<MetricKey, string> = {
  lead: "#6366f1",
  inbox: "#22c55e",
  post: "#f59e0b",
  comment: "#a855f7",
};

const BASE_WEIGHTS: Record<MetricKey, number> = {
  lead: 40,
  inbox: 30,
  comment: 20,
  post: 10,
};

const TEAM_COLORS = ["#4f46e5", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#dc2626"];

function emptyMetrics(): MetricStatsMap {
  return {
    lead: { actual: 0, target: 0 },
    inbox: { actual: 0, target: 0 },
    post: { actual: 0, target: 0 },
    comment: { actual: 0, target: 0 },
  };
}

function addMetrics(target: MetricStatsMap, source: MetricStatsMap) {
  METRIC_KEYS.forEach((key) => {
    target[key].actual += source[key].actual;
    target[key].target += source[key].target;
  });
}

function computeScore(metrics: MetricStatsMap): number {
  let weightSum = 0;
  const active: Partial<Record<MetricKey, number>> = {};

  METRIC_KEYS.forEach((key) => {
    if (metrics[key].target > 0) {
      active[key] = BASE_WEIGHTS[key];
      weightSum += BASE_WEIGHTS[key];
    }
  });

  if (weightSum === 0) return 0;

  let score = 0;
  METRIC_KEYS.forEach((key) => {
    const weight = active[key];
    if (!weight) return;
    const pct = metrics[key].target > 0 ? Math.min(100, (metrics[key].actual / metrics[key].target) * 100) : 0;
    score += pct * (weight / weightSum);
  });

  return Math.round(score);
}

function scoreTier(score: number): { label: string; tone: "risk" | "warn" | "ok" | "idle" } {
  if (score >= 70) return { label: "Đạt KPI", tone: "ok" };
  if (score >= 40) return { label: "Cần đẩy", tone: "warn" };
  if (score > 0) return { label: "Rủi ro", tone: "risk" };
  return { label: "Chưa bắt đầu", tone: "idle" };
}

function toneClasses(tone: "risk" | "warn" | "ok" | "idle") {
  if (tone === "ok") return { text: "text-emerald-600", bg: "bg-emerald-50", chip: "bg-emerald-50 text-emerald-600" };
  if (tone === "warn") return { text: "text-amber-600", bg: "bg-amber-50", chip: "bg-amber-50 text-amber-600" };
  if (tone === "idle") return { text: "text-on-surface-variant", bg: "bg-surface-container-low", chip: "bg-surface-container-low text-on-surface-variant" };
  return { text: "text-primary", bg: "bg-red-50", chip: "bg-red-50 text-primary" };
}

function getRecentWeeks(numWeeks = 8) {
  const weeks: Array<{ label: string; value: string }> = [];
  const curr = new Date();

  for (let i = 0; i < numWeeks; i += 1) {
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

    const fmt = (dt: Date) => dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    const valStart = monday.toISOString().split("T")[0];
    const valEnd = sunday.toISOString().split("T")[0];

    weeks.push({
      label: i === 0 ? `Tuần ${weekNo} (hiện tại)` : `Tuần ${weekNo} (${fmt(monday)} - ${fmt(sunday)})`,
      value: `${valStart}_${valEnd}`,
    });
  }

  return weeks;
}

function shortTeamLabel(index: number, leaderName?: string) {
  const last = (leaderName || "").trim().split(/\s+/).filter(Boolean).pop();
  return `T${index + 1}${last ? ` · ${last}` : ""}`;
}

function ProgressBar({ actual, target, color }: { actual: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function MetricIconBadge({ metricKey }: { metricKey: MetricKey }) {
  const color = METRIC_COLORS[metricKey];
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <MaterialIcon name={METRIC_ICONS[metricKey]} className="text-[13px]" />
    </span>
  );
}

function DeltaBadge({ actual, target }: { actual: number; target: number }) {
  if (target <= 0) {
    return (
      <span className="rounded-full bg-surface-container-low px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant/70">
        —
      </span>
    );
  }
  const gap = Math.max(0, target - actual);
  if (gap === 0) {
    return (
      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">OK</span>
    );
  }
  const pct = Math.round((actual / target) * 100);
  const tone = pct >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-primary";
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>-{gap}</span>;
}

function Donut({ score }: { score: number }) {
  const tier = scoreTier(score);
  const tone = toneClasses(tier.tone);
  const pct = Math.max(0, Math.min(100, score));
  const color =
    tier.tone === "ok" ? "#059669" : tier.tone === "warn" ? "#d97706" : tier.tone === "idle" ? "#94a3b8" : "#dc2626";
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${pct}%, #e5e7eb ${pct}% 100%)`,
      }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface">
        <span className={`text-xs font-black ${tone.text}`}>{score}%</span>
      </div>
    </div>
  );
}

export function KpiLeaderboardContent() {
  const recentWeeks = useMemo(() => getRecentWeeks(8), []);
  const [selectedWeek, setSelectedWeek] = useState(recentWeeks[0]?.value || "");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamAggregates, setTeamAggregates] = useState<TeamAggregate[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("overall");
  const memberTableRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadTeams = async () => {
      const res = await teamsService.getAll();
      if (!res.success || !res.data) {
        setError(res.message || "Không thể tải danh sách team.");
        return;
      }
      setTeams(res.data);
    };
    void loadTeams();
  }, []);

  useEffect(() => {
    if (teams.length === 0) return;

    const [startDate, endDate] = selectedWeek.split("_");

    const loadOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          teams.map((team) =>
            allPlatformKpiService.getAll(team.leader_email, team.id, startDate, endDate),
          ),
        );

        const aggregates: TeamAggregate[] = teams.map((team, index) => {
          const kpiRes = results[index];
          const kpiMembers = (kpiRes.success && kpiRes.data?.members ? kpiRes.data.members : []) as LooseKpiMember[];
          const teamColor = TEAM_COLORS[index % TEAM_COLORS.length];

          const teamMembersList: LooseTeamMember[] = team.members || [];
          const hasLeaderAlready = teamMembersList.some((m) => m.id === team.id_leader);
          const allMembers = hasLeaderAlready
            ? teamMembersList
            : [...teamMembersList, { id: team.id_leader, email: team.leader_email, name: team.leader_name }];

          const teamMetrics = emptyMetrics();
          const members: MemberRow[] = allMembers.map((member) => {
            const kpiInfo = kpiMembers.find((row) => row.id === member.id) || {};
            const stats = kpiInfo.seeding_stats || {};

            const metrics: MetricStatsMap = {
              lead: { actual: stats.kpi_lead_current || 0, target: stats.kpi_lead || 0 },
              inbox: { actual: stats.kpi_inbox_current || 0, target: stats.kpi_inbox || 0 },
              post: { actual: stats.kpi_post_current || 0, target: stats.kpi_post || 0 },
              comment: { actual: stats.verified_count || 0, target: stats.kpi_target || 0 },
            };

            addMetrics(teamMetrics, metrics);

            return {
              id: member.id || member.email || "",
              name: member.name || member.email || "—",
              email: member.email || "",
              teamId: team.id,
              teamName: team.name_team,
              teamColor,
              metrics,
              score: computeScore(metrics),
            };
          });

          return {
            team,
            shortLabel: shortTeamLabel(index, team.leader_name),
            color: teamColor,
            metrics: teamMetrics,
            score: computeScore(teamMetrics),
            memberCount: allMembers.length,
            members,
          };
        });

        setTeamAggregates(aggregates);
      } catch (overviewError) {
        console.error("Failed to load KPI leaderboard", overviewError);
        setError("Không thể tải dữ liệu KPI leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [teams, selectedWeek]);

  const overallMetrics = useMemo(() => {
    const metrics = emptyMetrics();
    teamAggregates.forEach((agg) => addMetrics(metrics, agg.metrics));
    return metrics;
  }, [teamAggregates]);

  const overallScore = useMemo(() => computeScore(overallMetrics), [overallMetrics]);
  const overallTier = scoreTier(overallScore);
  const overallTone = toneClasses(overallTier.tone);

  const alerts = useMemo(() => {
    const items: Array<{ teamName: string; leaderName: string; metric: MetricKey; deficit: number }> = [];
    teamAggregates.forEach((agg) => {
      let worstMetric: MetricKey | null = null;
      let worstDeficit = 0;
      METRIC_KEYS.forEach((key) => {
        const { actual, target } = agg.metrics[key];
        const deficit = target - actual;
        if (target > 0 && deficit > worstDeficit) {
          worstDeficit = deficit;
          worstMetric = key;
        }
      });
      if (worstMetric) {
        items.push({
          teamName: agg.team.name_team,
          leaderName: agg.team.leader_name,
          metric: worstMetric,
          deficit: worstDeficit,
        });
      }
    });
    return items.sort((a, b) => b.deficit - a.deficit).slice(0, 5);
  }, [teamAggregates]);

  const visibleTeamAggregates = useMemo(
    () => (selectedTeamId === "all" ? teamAggregates : teamAggregates.filter((agg) => agg.team.id === selectedTeamId)),
    [teamAggregates, selectedTeamId],
  );

  const memberRows = useMemo(() => {
    const rows = visibleTeamAggregates.flatMap((agg) => agg.members);
    return [...rows].sort((a, b) => a.score - b.score);
  }, [visibleTeamAggregates]);

  const visibleMetricKeys = viewMode === "overall" ? METRIC_KEYS : [viewMode];

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");

      const teamSheetRows = teamAggregates.map((agg) => {
        const row: Record<string, string | number> = {
          Team: agg.team.name_team,
          Leader: agg.team.leader_name,
          "Số thành viên": agg.memberCount,
          "Điểm KPI (%)": agg.score,
        };
        METRIC_KEYS.forEach((key) => {
          row[`${METRIC_LABELS[key]} thực tế`] = agg.metrics[key].actual;
          row[`${METRIC_LABELS[key]} target`] = agg.metrics[key].target;
        });
        return row;
      });

      const memberSheetRows = teamAggregates
        .flatMap((agg) => agg.members)
        .map((member) => {
          const row: Record<string, string | number> = {
            Member: member.name,
            Email: member.email,
            Team: member.teamName,
            "Điểm KPI (%)": member.score,
          };
          METRIC_KEYS.forEach((key) => {
            row[`${METRIC_LABELS[key]} thực tế`] = member.metrics[key].actual;
            row[`${METRIC_LABELS[key]} target`] = member.metrics[key].target;
          });
          return row;
        });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamSheetRows), "Tổng hợp Team");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberSheetRows), "Member");

      const weekLabel = recentWeeks.find((w) => w.value === selectedWeek)?.label || selectedWeek;
      XLSX.writeFile(wb, `kpi-leaderboard-${weekLabel.replace(/[^\w]+/g, "-")}.xlsx`);
    } catch (exportError) {
      console.error("Export KPI leaderboard failed", exportError);
      setError("Xuất báo cáo thất bại.");
    } finally {
      setExporting(false);
    }
  };

  const goToTeamMembers = (teamId: string) => {
    setSelectedTeamId(teamId);
    memberTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 bg-surface font-sans">
      <div className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold leading-tight text-on-surface">KPI Dashboard — Leaderboard</h1>
          <p className="text-xs leading-tight text-on-surface-variant">
            KPI tuần theo Team &amp; Member · Lead / Inbox / Post / Comment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || loading || teamAggregates.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-50"
          >
            <MaterialIcon name="file_download" className="text-base" />
            {exporting ? "Đang xuất..." : "Xuất báo cáo"}
          </button>

          <select
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            {recentWeeks.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-primary">
          {error}
        </div>
      ) : null}

      {/* Overview + alerts */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={`relative overflow-hidden rounded-xl px-5 py-4 text-white ${overallTier.tone === "ok" ? "bg-emerald-900" : overallTier.tone === "warn" ? "bg-amber-900" : "bg-slate-900"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">KPI tuần hiện tại</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-black">{loading ? "…" : `${overallScore}%`}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${overallTone.chip}`}>{overallTier.label}</span>
          </div>
          <p className="mt-1 text-xs text-white/70">Tổng hợp toàn bộ team seeding</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {METRIC_KEYS.map((key) => (
              <div key={key} className="rounded-lg bg-white/10 px-2 py-1.5">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: METRIC_COLORS[key] }} />
                  {METRIC_LABELS[key]}
                </p>
                <p className="text-sm font-bold">
                  {overallMetrics[key].actual}/{overallMetrics[key].target}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
            <MaterialIcon name="warning" className="text-base text-amber-600" />
            Việc cần xử lý hôm nay
          </h3>
          <div className="mt-2 space-y-1.5">
            {loading ? (
              <p className="text-xs text-on-surface-variant">Đang tải...</p>
            ) : alerts.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Không có cảnh báo — tất cả team đang bám sát KPI.</p>
            ) : (
              alerts.map((alert, index) => (
                <div key={`${alert.teamName}-${alert.metric}`} className="flex items-start gap-2 rounded-lg bg-surface-container-low px-2.5 py-1.5">
                  <MaterialIcon
                    name={index === 0 ? "warning_amber" : "warning"}
                    className={`mt-0.5 text-sm ${index === 0 ? "text-red-600" : "text-amber-600"}`}
                  />
                  <p className="text-xs leading-snug text-on-surface">
                    <span className="font-bold">{alert.teamName}</span>: thiếu {alert.deficit} {METRIC_LABELS[alert.metric]}.
                    Ưu tiên leader <span className="font-semibold">{alert.leaderName}</span> đẩy trong hôm nay.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col flex-wrap gap-2 rounded-xl border border-outline-variant bg-surface px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">Bộ lọc nhanh TEAM</span>
          <button
            type="button"
            onClick={() => setSelectedTeamId("all")}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              selectedTeamId === "all" ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Tất cả
          </button>
          {teamAggregates.map((agg) => (
            <button
              key={agg.team.id}
              type="button"
              onClick={() => setSelectedTeamId(agg.team.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                selectedTeamId === agg.team.id ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {agg.shortLabel}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">CHẾ ĐỘ XEM</span>
          {(["overall", ...METRIC_KEYS] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === mode ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {mode === "overall" ? "Tổng hợp" : METRIC_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        KPI được tính theo trọng số: Lead 40% · Inbox 30% · Comment 20% · Post 10%. Team nào không có KPI cho 1 chỉ số
        sẽ tự bỏ trọng số chỉ số đó để tránh méo điểm.
      </div>

      {/* Team cards */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {(loading && teamAggregates.length === 0
          ? teams
          : visibleTeamAggregates.length > 0
            ? visibleTeamAggregates.map((a) => a.team)
            : []
        ).map((team) => {
          const index = teamAggregates.findIndex((a) => a.team.id === team.id);
          const agg = teamAggregates.find((a) => a.team.id === team.id);
          const color = agg?.color || TEAM_COLORS[(index < 0 ? 0 : index) % TEAM_COLORS.length];
          const worstMetric = agg
            ? visibleMetricKeys.reduce<{ key: MetricKey; deficit: number } | null>((worst, key) => {
                const deficit = agg.metrics[key].target - agg.metrics[key].actual;
                if (agg.metrics[key].target > 0 && deficit > (worst?.deficit ?? -Infinity)) {
                  return { key, deficit };
                }
                return worst;
              }, null)
            : null;

          return (
            <div
              key={team.id}
              className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
              style={{ borderTopWidth: 3, borderTopColor: color }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                  >
                    T{(index < 0 ? 0 : index) + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{team.name_team}</p>
                    <p className="truncate text-[11px] text-on-surface-variant">
                      Leader: {team.leader_name} · {team.number_of_member ?? agg?.memberCount ?? 0} members
                    </p>
                  </div>
                </div>
                {agg ? <Donut score={agg.score} /> : null}
              </div>

              <div className="mt-2.5 space-y-1.5">
                {visibleMetricKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <MetricIconBadge metricKey={key} />
                    <span className="w-16 shrink-0 text-[11px] font-medium text-on-surface-variant">{METRIC_LABELS[key]}</span>
                    <div className="min-w-0 flex-1">
                      <ProgressBar
                        actual={agg?.metrics[key].actual ?? 0}
                        target={agg?.metrics[key].target ?? 0}
                        color={METRIC_COLORS[key]}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-on-surface">
                      {agg ? `${agg.metrics[key].actual}/${agg.metrics[key].target}` : "…"}
                    </span>
                    {agg ? <DeltaBadge actual={agg.metrics[key].actual} target={agg.metrics[key].target} /> : null}
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-on-surface-variant">
                  {worstMetric ? (
                    <>
                      Cần bù <span className="font-semibold text-on-surface">{worstMetric.deficit} {METRIC_LABELS[worstMetric.key]}</span>
                    </>
                  ) : (
                    "Đang bám KPI"
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => goToTeamMembers(team.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
                >
                  Members →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Member table */}
      <div ref={memberTableRef} className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
        <div className="flex flex-col gap-2 border-b border-outline-variant px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
            <MaterialIcon name="groups" className="text-base text-primary" />
            Member cần follow — {recentWeeks.find((w) => w.value === selectedWeek)?.label.split(" (")[0] || ""}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-2.5 py-1.5 text-xs font-semibold text-on-surface outline-none"
            >
              <option value="all">Tất cả team</option>
              {teamAggregates.map((agg) => (
                <option key={agg.team.id} value={agg.team.id}>
                  {agg.team.name_team}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || loading || memberRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-50"
            >
              <MaterialIcon name="file_download" className="text-sm" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase text-on-surface-variant">Member</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase text-on-surface-variant">Team</th>
                {visibleMetricKeys.map((key) => (
                  <th key={key} className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase text-on-surface-variant">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: METRIC_COLORS[key] }} />
                      {METRIC_LABELS[key]}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase text-on-surface-variant">Score</th>
                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase text-on-surface-variant">Ưu tiên xử lý</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleMetricKeys.length + 4} className="px-3 py-4 text-center text-xs text-on-surface-variant">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : memberRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleMetricKeys.length + 4} className="px-3 py-4 text-center text-xs text-on-surface-variant">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                memberRows.map((member) => {
                  const tier = scoreTier(member.score);
                  const tone = toneClasses(tier.tone);
                  const worst = METRIC_KEYS.reduce<{ key: MetricKey; deficit: number } | null>((acc, key) => {
                    const deficit = member.metrics[key].target - member.metrics[key].actual;
                    if (member.metrics[key].target > 0 && deficit > (acc?.deficit ?? -Infinity)) {
                      return { key, deficit };
                    }
                    return acc;
                  }, null);

                  return (
                    <tr key={member.id} className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low/50">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${member.teamColor}, ${member.teamColor}cc)` }}
                          >
                            {(member.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate font-semibold text-on-surface">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: `${member.teamColor}1a`, color: member.teamColor }}
                        >
                          {member.teamName}
                        </span>
                      </td>
                      {visibleMetricKeys.map((key) => (
                        <td key={key} className="px-3 py-1.5">
                          <div className="flex min-w-[90px] items-center gap-1.5">
                            <div className="w-14 shrink-0">
                              <ProgressBar actual={member.metrics[key].actual} target={member.metrics[key].target} color={METRIC_COLORS[key]} />
                            </div>
                            <span className="text-[11px] font-medium text-on-surface-variant">
                              {member.metrics[key].actual}/{member.metrics[key].target}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.chip}`}>
                          {member.score}% · {tier.label}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[11px] font-medium text-on-surface-variant">
                        {worst ? `Thiếu ${worst.deficit} ${METRIC_LABELS[worst.key]}` : "Đang bám KPI"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
