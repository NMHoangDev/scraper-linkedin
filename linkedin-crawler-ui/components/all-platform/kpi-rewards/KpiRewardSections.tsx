"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MaterialIcon, type MaterialSymbolName } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import {
  kpiRewardsService,
  teamsService,
  type KpiGoalStatus,
  type KpiRewardMetric,
  type KpiRewardRule,
  type KpiRewardRuleLog,
  type KpiRewardStatus,
  type KpiRewardSummary,
  type TeamRow,
} from "@/services/all-platform.service";
import { cn } from "@/lib/utils";

type RuleGroup = {
  key: KpiRewardMetric;
  label: string;
  weightLabel: string;
  defaultWeight: number;
  defaultThreshold: number;
  defaultReward: number;
  defaultMaxRate: number;
  icon: MaterialSymbolName;
  // 1 tong mau pastel duy nhat dung cho ca header lan subheader cua group (khong
  // con lech mau giua 2 hang nhu truoc), chu dam cung tong de doc ro tren nen nhat.
  sectionClass: string;
};

const RULE_GROUPS: RuleGroup[] = [
  {
    key: "total_bonus",
    label: "BONUS TOTAL",
    weightLabel: "",
    defaultWeight: 100,
    defaultThreshold: 75,
    defaultReward: 100000,
    defaultMaxRate: 200,
    icon: "account_balance_wallet",
    sectionClass: "bg-emerald-50 text-emerald-800",
  },
  {
    key: "lead",
    label: "LEAD",
    weightLabel: "40%",
    defaultWeight: 40,
    defaultThreshold: 80,
    defaultReward: 10000,
    defaultMaxRate: 200,
    icon: "person",
    sectionClass: "bg-violet-50 text-violet-800",
  },
  {
    key: "inbox",
    label: "INBOX",
    weightLabel: "30%",
    defaultWeight: 30,
    defaultThreshold: 80,
    defaultReward: 3000,
    defaultMaxRate: 200,
    icon: "mail",
    sectionClass: "bg-amber-50 text-amber-800",
  },
  {
    key: "post",
    label: "POST",
    weightLabel: "20%",
    defaultWeight: 20,
    defaultThreshold: 80,
    defaultReward: 2000,
    defaultMaxRate: 200,
    icon: "send",
    sectionClass: "bg-blue-50 text-blue-800",
  },
  {
    key: "comment",
    label: "COMMENT",
    weightLabel: "10%",
    defaultWeight: 10,
    defaultThreshold: 80,
    defaultReward: 1000,
    defaultMaxRate: 200,
    icon: "chat_bubble",
    sectionClass: "bg-sky-50 text-sky-800",
  },
];

// Chi BONUS TOTAL va LEAD co cot Nguong (%) - khop dung nghiep vu sheet goc.
const METRIC_HAS_THRESHOLD: Record<KpiRewardMetric, boolean> = {
  total_bonus: true,
  lead: true,
  inbox: false,
  post: false,
  comment: false,
};

function RuleGroupHeader({ group }: { group: RuleGroup }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <MaterialIcon name={group.icon} className="text-base" />
      <span>{group.label} {group.weightLabel ? `(${group.weightLabel})` : ""}</span>
    </div>
  );
}

function RuleSubHeader({ icon, label }: { icon: MaterialSymbolName; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <MaterialIcon name={icon} className="text-sm opacity-70" />
      <span>{label}</span>
    </div>
  );
}

function formatLogValue(field: string, value: number | null): string {
  if (value === null) return "—";
  if (field === "threshold_value" || field === "max_rate") return `${formatNumber(value)}%`;
  return formatVnd(value);
}

const STATUS_LABEL: Record<KpiRewardStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  approved: "Đang dùng",
  rejected: "Trả lại",
};

const STATUS_TONE: Record<KpiRewardStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

function splitWeek(value: string): { startDate: string; endDate: string } {
  const [startDate, endDate] = value.split("_");
  return { startDate, endDate };
}

function getCurrentWeekValue(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${fmt(monday)}_${fmt(sunday)}`;
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value || 0);
}

function defaultRules(teamId: string, startDate: string, endDate: string): KpiRewardRule[] {
  return RULE_GROUPS.map((group) => ({
    teamId,
    startDate,
    endDate,
    metric: group.key,
    weight: group.defaultWeight,
    thresholdValue: group.defaultThreshold,
    rewardPerUnit: group.defaultReward,
    maxReward: null,
    maxRate: group.defaultMaxRate,
    status: "approved",
  }));
}

function normalizeRules(
  teamId: string,
  startDate: string,
  endDate: string,
  rules: KpiRewardRule[],
): KpiRewardRule[] {
  const map = new Map(rules.map((rule) => [rule.metric, rule]));
  return defaultRules(teamId, startDate, endDate).map((fallback) => ({
    ...fallback,
    ...(map.get(fallback.metric) || {}),
    maxRate: map.get(fallback.metric)?.maxRate ?? fallback.maxRate,
  }));
}

function getRule(rules: KpiRewardRule[], metric: KpiRewardMetric): KpiRewardRule {
  return rules.find((rule) => rule.metric === metric)!;
}

function StatusBadge({ status }: { status: KpiRewardStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// Chi mau chu phan biet % / max, khong to nen o - giu giao dien tho gion nhu
// cot Total (khong khung/bo goc). Khi chua bam "Chinh sua" thi khong co gach
// chan de tranh nhin lam tuong la o bam duoc, giam bam nham.
const RULE_INPUT_TONES: Record<"plain" | "percent" | "max", string> = {
  plain: "text-slate-700",
  percent: "text-amber-700",
  max: "text-rose-700",
};

function RuleInput({
  value,
  onChange,
  disabled,
  suffix,
  tone = "plain",
  editable = false,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  suffix?: string;
  tone?: "plain" | "percent" | "max";
  editable?: boolean;
}) {
  const textClass = RULE_INPUT_TONES[tone];
  return (
    <div
      className={cn(
        "flex h-8 items-center justify-end gap-0.5 px-1",
        editable && !disabled ? "border-b border-slate-400" : "",
      )}
    >
      <input
        type="number"
        min={0}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? null : Math.max(0, Number(raw) || 0));
        }}
        className={cn(
          "min-w-0 flex-1 appearance-none bg-transparent text-right text-[11px] font-semibold outline-none disabled:cursor-default xl:text-[12px]",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          textClass,
        )}
      />
      {suffix ? <span className={cn("ml-0.5 text-[10px] font-semibold", textClass)}>{suffix}</span> : null}
    </div>
  );
}

export function KpiRewardRuleTable({
  teamId,
  selectedWeek,
  readOnly = false,
  onChanged,
}: {
  teamId: string;
  selectedWeek: string;
  readOnly?: boolean;
  onChanged?: () => void;
}) {
  const { startDate, endDate } = splitWeek(selectedWeek);
  const [rules, setRules] = useState<KpiRewardRule[]>(() => defaultRules(teamId, startDate, endDate));
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Mac dinh khoa - phai bam "Chinh sua" moi mo duoc cac o nhap, tranh bam nham
  // vao rule dang dung cho ca team khi chi dinh xem qua.
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = !readOnly && isEditing;
  const [logs, setLogs] = useState<KpiRewardRuleLog[]>([]);
  // Nguon cua rule dang hien thi: "current" = da luu dung tuan nay, "copied" = tu dong
  // sao chep tu tuan gan nhat truoc do (chua luu cho tuan nay), "default" = chua tung
  // co rule nao, dung mac dinh. Giup leader biet ro dang xem gi truoc khi bam Luu.
  const [ruleSource, setRuleSource] = useState<"current" | "copied" | "default">("current");
  const [sourceWeek, setSourceWeek] = useState<{ start: string; end: string } | null>(null);
  const [summary, setSummary] = useState<KpiRewardSummary | null>(null);

  const status = (rules.find((rule) => rule.id)?.status || "approved") as KpiRewardStatus;

  // Total Bonus / Max Bonus hien thi ngay trong bang rule la so that tinh tu du lieu
  // thuc te cua team tuan nay - gop rewards/targets cua tung thanh vien lai theo metric.
  const aggregates = useMemo(() => {
    const agg = {
      targets: { lead: 0, inbox: 0, post: 0, comment: 0 },
      rewards: { lead: 0, inbox: 0, post: 0, comment: 0, total_bonus: 0 } as Record<KpiRewardMetric, number>,
    };
    for (const member of summary?.memberSummaries || []) {
      if (member.teamId !== teamId) continue;
      (["lead", "inbox", "post", "comment"] as const).forEach((metric) => {
        agg.targets[metric] += member.targets[metric] || 0;
        agg.rewards[metric] += member.rewards[metric] || 0;
      });
      agg.rewards.total_bonus += member.rewards.total_bonus || 0;
    }
    return agg;
  }, [summary, teamId]);

  const loadLogs = useCallback(async () => {
    if (!teamId) return;
    const res = await kpiRewardsService.logs({ teamId, startDate, endDate });
    setLogs(res.success && res.data ? res.data : []);
  }, [teamId, startDate, endDate]);

  const loadSummary = useCallback(async () => {
    if (!teamId) return;
    const res = await kpiRewardsService.summary({ teamId, startDate, endDate });
    setSummary(res.success && res.data ? res.data : null);
  }, [teamId, startDate, endDate]);

  const loadRules = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const res = await kpiRewardsService.effectiveRules({ teamId, startDate, endDate });
      const effective = res.success && res.data ? res.data : { rules: [], source: "default" as const, sourceWeek: null };
      const next = normalizeRules(teamId, startDate, endDate, effective.rules);
      setRules(next);
      setNote(next.find((rule) => rule.leaderNote)?.leaderNote || next.find((rule) => rule.adminNote)?.adminNote || "");
      setRuleSource(effective.source);
      setSourceWeek(effective.sourceWeek);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRules();
      void loadLogs();
      void loadSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRules, loadLogs, loadSummary]);

  const updateRule = (metric: KpiRewardMetric, patch: Partial<KpiRewardRule>) => {
    setRules((current) => current.map((rule) => (rule.metric === metric ? { ...rule, ...patch } : rule)));
  };

  const payloadRules = rules.map((rule) => ({
    metric: rule.metric,
    weight: Number(rule.weight || 0),
    threshold_value: Number(rule.thresholdValue || 0),
    reward_per_unit: Number(rule.rewardPerUnit || 0),
    max_reward: rule.maxReward === null ? null : Number(rule.maxReward || 0),
    max_rate: Number(rule.maxRate || 200),
  }));

  const saveActive = async () => {
    setIsSaving(true);
    try {
      const res = await kpiRewardsService.saveActive({
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
        leader_note: note,
        admin_note: note,
        rules: payloadRules,
      });
      if (!res.success) throw new Error(res.message || "Lưu rule thất bại");
      toast.success("Đã lưu rule KPI & thưởng đang dùng");
      await loadRules();
      await loadLogs();
      await loadSummary();
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu rule thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Cài đặt Bonus KPI</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Rule hiện tại đang được dùng để tính thưởng cho team và tuần đang chọn.
          </p>
          {ruleSource === "copied" && sourceWeek ? (
            <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-amber-700">
              <MaterialIcon name="content_copy" className="text-sm" />
              Đang dùng cấu hình sao chép từ tuần {sourceWeek.start} - {sourceWeek.end} (chưa lưu cho tuần này).
            </p>
          ) : null}
          {ruleSource === "default" ? (
            <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-amber-700">
              <MaterialIcon name="info" className="text-sm" />
              Team chưa từng cài rule - đang dùng cấu hình mặc định, chưa lưu cho tuần này.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? <span className="text-[12px] text-muted-foreground">Đang tải...</span> : null}
          {!readOnly ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition",
                  isEditing
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-zinc-100 text-foreground hover:bg-zinc-200",
                )}
              >
                <MaterialIcon name={isEditing ? "lock_reset" : "edit"} className="text-base" />
                {isEditing ? "Đang chỉnh sửa" : "Chỉnh sửa"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={saveActive}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white transition disabled:opacity-50"
                >
                  <MaterialIcon name="check" className="text-base" />
                  {isSaving ? "Đang lưu..." : "Lưu rule đang dùng"}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* Rule dang ap dung - CHI 1 dong duy nhat, tranh nham tuong 30 dong ben duoi
          la 30 rule doc lap (chung deu doc/ghi chung 1 rule per metric). */}
      <div className="bg-white p-3">
        <table className="w-full table-fixed border-collapse text-center text-[10px] xl:text-[11px]">
          <thead>
            <tr>
              {RULE_GROUPS.map((group) => (
                <th
                  key={group.key}
                  colSpan={3}
                  className={cn("border border-slate-300 px-1 py-2 text-[10px] font-black xl:text-xs", group.sectionClass)}
                >
                  <RuleGroupHeader group={group} />
                </th>
              ))}
              <th className="border border-slate-300 bg-white px-1 py-2 text-[10px] font-black text-black xl:text-xs">
                <RuleSubHeader icon="military_tech" label="MAX" />
              </th>
            </tr>
            <tr>
              {RULE_GROUPS.map((group) => (
                <Fragment key={group.key}>
                  {METRIC_HAS_THRESHOLD[group.key] ? (
                    <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                      <RuleSubHeader icon="track_changes" label="Ngưỡng (%)" />
                    </th>
                  ) : null}
                  <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                    <RuleSubHeader icon="paid" label="Bonus" />
                  </th>
                  <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                    <RuleSubHeader icon="card_giftcard" label="Total Bonus" />
                  </th>
                  {!METRIC_HAS_THRESHOLD[group.key] ? (
                    <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                      <RuleSubHeader icon="shield" label="Max Bonus" />
                    </th>
                  ) : null}
                </Fragment>
              ))}
              <th className="border border-slate-300 bg-white px-1 py-2 font-black text-black">Max Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {RULE_GROUPS.map((group) => {
                const rule = getRule(rules, group.key);
                const totalBonus = aggregates.rewards[group.key] ?? 0;
                const targetSum = group.key === "total_bonus" ? 0 : aggregates.targets[group.key as "lead" | "inbox" | "post" | "comment"];
                const maxBonus = targetSum * (rule.rewardPerUnit || 0) * ((rule.maxRate || 200) / 100);
                return (
                  <Fragment key={group.key}>
                    {METRIC_HAS_THRESHOLD[group.key] ? (
                      <td className="border border-slate-300 bg-white p-1">
                        <RuleInput
                          value={rule.thresholdValue}
                          suffix="%"
                          tone="percent"
                          editable={canEdit}
                          disabled={!canEdit}
                          onChange={(value) => updateRule(group.key, { thresholdValue: value ?? 0 })}
                        />
                      </td>
                    ) : null}
                    <td className="border border-slate-300 bg-white p-1">
                      <RuleInput
                        value={rule.rewardPerUnit}
                        editable={canEdit}
                        disabled={!canEdit}
                        onChange={(value) => updateRule(group.key, { rewardPerUnit: value ?? 0 })}
                      />
                    </td>
                    <td className="border border-slate-300 bg-emerald-200 px-1 py-2 text-right font-bold text-emerald-900 tabular-nums">
                      {formatVnd(totalBonus)}
                    </td>
                    {!METRIC_HAS_THRESHOLD[group.key] ? (
                      <td className="border border-slate-300 bg-white px-1 py-2 text-right font-semibold text-rose-700 tabular-nums">
                        {formatVnd(maxBonus)}
                      </td>
                    ) : null}
                  </Fragment>
                );
              })}
              <td className="border border-slate-300 bg-white p-1">
                <RuleInput
                  value={getRule(rules, "lead").maxRate}
                  suffix="%"
                  tone="max"
                  editable={canEdit}
                  disabled={!canEdit}
                  onChange={(value) => {
                    const maxRate = value ?? 0;
                    RULE_GROUPS.forEach((group) => updateRule(group.key, { maxRate }));
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <div className="space-y-3 border-t border-border px-5 py-4">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!isEditing}
            placeholder="Ghi chú rule..."
            className="min-h-[72px] w-full rounded-xl border border-border px-3 py-2 text-[13px] outline-none focus:border-primary disabled:bg-muted/40 disabled:text-muted-foreground"
          />
        </div>
      ) : null}

      {/* Nhat ky chinh sua - ai sua, sua o nao, gia tri cu -> moi. */}
      <div className="border-t border-border px-5 py-4">
        <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Nhật ký chỉnh sửa</p>
        {logs.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Chưa có thay đổi nào cho team và tuần này.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
                <div className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                  <MaterialIcon name="person" className="text-sm text-muted-foreground" />
                  {log.changedByName}
                  <span className="font-normal text-muted-foreground">
                    · {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <ul className="mt-1 space-y-0.5 pl-5 text-muted-foreground">
                  {log.changes.map((change, idx) => (
                    <li key={`${log.id}-${idx}`}>
                      {change.metricLabel} · {change.fieldLabel}:{" "}
                      <span className="font-semibold text-rose-700">{formatLogValue(change.field, change.oldValue)}</span>
                      {" → "}
                      <span className="font-semibold text-emerald-700">{formatLogValue(change.field, change.newValue)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// Bang mau categorical co dinh (khong xoay vong tuy y) - dung de phan biet tung
// team trong bang ket qua khi xem "Tat ca team". Thu tu nay da qua validate
// CVD/contrast (xem skill dataviz), khong tu y doi thu tu.
const TEAM_COLORS = [
  "#2a78d6", // blue
  "#008300", // green
  "#e87ba4", // magenta
  "#eda100", // yellow
  "#1baf7a", // aqua
  "#eb6834", // orange
  "#4a3aa7", // violet
  "#e34948", // red
];

// Vai mau sang (magenta, yellow) can chu toi de du tuong phan khi to nguyen o -
// cac mau con lai du dam de dung chu trang.
const TEAM_COLORS_DARK_TEXT = new Set(["#e87ba4", "#eda100"]);

const KPI_GOAL_LABEL: Record<KpiGoalStatus, string> = {
  dat: "Đạt",
  gan_dat: "Gần đạt",
  chua_dat: "Chưa đạt",
};

const KPI_GOAL_TONE: Record<KpiGoalStatus, string> = {
  dat: "bg-emerald-50 text-emerald-700",
  gan_dat: "bg-amber-50 text-amber-700",
  chua_dat: "bg-rose-50 text-rose-700",
};

function KpiGoalBadge({ status, percent }: { status: KpiGoalStatus; percent?: number }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", KPI_GOAL_TONE[status])}>
      {percent !== undefined ? `${formatNumber(percent)}% · ` : ""}
      {KPI_GOAL_LABEL[status]}
    </span>
  );
}

export function KpiRewardResultsTable({
  summary,
  teamId,
}: {
  summary: KpiRewardSummary | null;
  teamId?: string;
}) {
  const rows = useMemo(() => {
    const items = summary?.memberSummaries || [];
    return teamId ? items.filter((item) => item.teamId === teamId) : items;
  }, [summary, teamId]);

  // Nhom hang theo team de nhin ra ngay team nao voi team nao khi xem "Tat ca team" -
  // moi team gan 1 mau co dinh theo thu tu xuat hien (khong xoay ngau nhien).
  const groupedByTeam = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { teamId: string; teamName: string; rows: typeof rows }>();
    for (const row of rows) {
      let group = map.get(row.teamId);
      if (!group) {
        group = { teamId: row.teamId, teamName: row.teamName, rows: [] };
        map.set(row.teamId, group);
        order.push(row.teamId);
      }
      group.rows.push(row);
    }
    return order.map((id) => map.get(id)!);
  }, [rows]);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Kết quả KPI & tiền thưởng</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Tính từ dữ liệu Lead, Inbox, Post, Comment thật của tuần đang chọn.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase text-muted-foreground">Tổng thưởng</div>
          <div className="text-lg font-bold text-foreground">
            {formatVnd(rows.reduce((sum, row) => sum + row.totalReward, 0))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-[10px] xl:text-[11px]">
          <thead>
            <tr>
              <th rowSpan={2} className="w-[18%] border border-border bg-slate-50 px-2 py-1.5">Thành viên</th>
              <th rowSpan={2} className="w-[7%] border border-border bg-slate-50 px-1 py-1.5 text-right">%KPI</th>
              <th rowSpan={2} className="w-[8%] border border-border bg-slate-50 px-1 py-1.5 text-right">Bonus</th>
              <th colSpan={2} className="border border-border bg-violet-700 px-1 py-1.5 text-center font-black text-white">LEAD</th>
              <th colSpan={2} className="border border-border bg-amber-600 px-1 py-1.5 text-center font-black text-white">INBOX</th>
              <th colSpan={2} className="border border-border bg-blue-700 px-1 py-1.5 text-center font-black text-white">POST</th>
              <th colSpan={2} className="border border-border bg-sky-700 px-1 py-1.5 text-center font-black text-white">COMMENT</th>
            </tr>
            <tr>
              {(["lead", "inbox", "post", "comment"] as const).flatMap((metric) => [
                <th key={`${metric}-actual`} className="border border-border bg-slate-50 px-1 py-1.5 text-right">SL/KPI</th>,
                <th key={`${metric}-status`} className="border border-border bg-slate-50 px-1 py-1.5 text-center">Trạng thái</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {groupedByTeam.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-border px-4 py-12 text-center text-muted-foreground">
                  Chưa có dữ liệu thưởng cho team và tuần này.
                </td>
              </tr>
            ) : (
              groupedByTeam.flatMap((group, groupIndex) => {
                const color = TEAM_COLORS[groupIndex % TEAM_COLORS.length];
                const memberRows = group.rows.map((row) => (
                  <tr key={`${row.teamId}-${row.memberId}`} className="bg-white">
                    <td
                      className="border border-border px-2 py-1.5"
                      style={{ borderLeftWidth: 4, borderLeftColor: color }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0 truncate font-semibold text-foreground">{row.memberName}</div>
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">{row.memberEmail}</div>
                    </td>
                    <td className="border border-border px-1 py-1.5 text-right font-bold text-foreground tabular-nums">
                      {formatNumber(row.kpiPercent ?? 0)}%
                    </td>
                    <td className="border border-border bg-emerald-200 px-1 py-1.5 text-right font-bold text-emerald-900 tabular-nums">
                      {formatVnd(row.totalReward)}
                    </td>
                    {(["lead", "inbox", "post", "comment"] as const).map((metric) => (
                      <Fragment key={metric}>
                        <td key={`${metric}-actual-${row.memberId}`} className="border border-border px-1 py-1.5 text-right tabular-nums whitespace-nowrap">
                          {formatNumber(row.actuals[metric])}/{formatNumber(row.targets[metric])}
                        </td>
                        <td key={`${metric}-status-${row.memberId}`} className="border border-border px-1 py-1.5 text-center">
                          <KpiGoalBadge status={row.metricStatuses?.[metric] ?? "chua_dat"} percent={row.metricPercents?.[metric] ?? 0} />
                        </td>
                      </Fragment>
                    ))}
                  </tr>
                ));

                if (teamId) return memberRows;

                const headerTextClass = TEAM_COLORS_DARK_TEXT.has(color) ? "text-black" : "text-white";
                return [
                  <tr key={`team-header-${group.teamId}`}>
                    <td
                      colSpan={11}
                      className={cn("border border-border px-3 py-2 text-[12px] font-bold", headerTextClass)}
                      style={{ backgroundColor: color }}
                    >
                      {group.teamName}
                      <span className="ml-1.5 font-normal opacity-80">
                        ({group.rows.length} thành viên)
                      </span>
                    </td>
                  </tr>,
                  ...memberRows,
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function LeaderKpiRewardSections({
  teamId,
  selectedWeek,
}: {
  teamId: string;
  selectedWeek: string;
}) {
  const { startDate, endDate } = splitWeek(selectedWeek);
  const [summary, setSummary] = useState<KpiRewardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const res = await kpiRewardsService.summary({ startDate, endDate, teamId });
      setSummary(res.success && res.data ? res.data : null);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  if (!teamId) return null;

  return (
    <div className="mt-5 space-y-5">
      {isLoading ? (
        <div className="rounded-xl border border-border bg-white px-5 py-8 text-center text-[13px] text-muted-foreground">
          Đang tính thưởng...
        </div>
      ) : (
        <KpiRewardResultsTable summary={summary} teamId={teamId} />
      )}
    </div>
  );
}

export function MemberKpiRewardOverview() {
  const { user } = useAppAuth();
  const selectedWeek = useMemo(() => getCurrentWeekValue(), []);
  const { startDate, endDate } = splitWeek(selectedWeek);
  const [summary, setSummary] = useState<KpiRewardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!user?.id || user.role !== "member") return;
    setIsLoading(true);
    try {
      const res = await kpiRewardsService.summary({ startDate, endDate });
      setSummary(res.success && res.data ? res.data : null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role, startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  if (user?.role !== "member") return null;

  const teamIds = Array.from(new Set((summary?.memberSummaries || []).map((item) => item.teamId)));

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Rule KPI & thưởng tuần này</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Member chỉ xem rule và kết quả của mình. Admin/Leader chỉnh rule ở trang Teams.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">
            {startDate} - {endDate}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-[13px] text-muted-foreground">
          Đang tải rule KPI...
        </div>
      ) : teamIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <MaterialIcon name="assignment" className="text-3xl text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">Chưa có rule KPI & thưởng cho tuần này</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Khi Leader/Admin cài rule cho team của bạn, bảng rule sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        teamIds.map((teamId) => (
          <div key={teamId} className="space-y-4">
            <KpiRewardRuleTable teamId={teamId} selectedWeek={selectedWeek} readOnly />
            <KpiRewardResultsTable summary={summary} teamId={teamId} />
          </div>
        ))
      )}
    </section>
  );
}

// Bang tong Cai dat Bonus KPI cho Admin - 1 bang duy nhat, moi team 1 dong tu tren
// xuong duoi (khong phai bam chon tung team roi xem rieng nhu Leader/Member).
// Admin bam "Sua" tren dung dong cua team nao thi khoa nhap mo ra cho dong do,
// bam "Lich su" de xem nhat ky chinh sua rieng cua team do.
function AdminAllTeamsKpiRuleTable({
  teams,
  selectedWeek,
  onChanged,
}: {
  teams: TeamRow[];
  selectedWeek: string;
  onChanged?: () => void;
}) {
  const { startDate, endDate } = splitWeek(selectedWeek);
  const [rulesByTeam, setRulesByTeam] = useState<Record<string, KpiRewardRule[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingTeamIds, setEditingTeamIds] = useState<Set<string>>(new Set());
  const [savingTeamIds, setSavingTeamIds] = useState<Set<string>>(new Set());
  const [logsTeamId, setLogsTeamId] = useState<string | null>(null);
  const [logsByTeam, setLogsByTeam] = useState<Record<string, KpiRewardRuleLog[]>>({});
  const [summary, setSummary] = useState<KpiRewardSummary | null>(null);

  const teamIdsKey = teams.map((team) => team.id).join(",");

  // Total Bonus / Max Bonus hien thi trong bang la so that tinh tu du lieu that cua tuan -
  // gop rewards/targets cua tung thanh vien trong team lai theo tung metric.
  const teamAggregates = useMemo(() => {
    const map: Record<string, { targets: Record<"lead" | "inbox" | "post" | "comment", number>; rewards: Record<KpiRewardMetric, number> }> = {};
    for (const member of summary?.memberSummaries || []) {
      const agg = map[member.teamId] || {
        targets: { lead: 0, inbox: 0, post: 0, comment: 0 },
        rewards: { lead: 0, inbox: 0, post: 0, comment: 0, total_bonus: 0 },
      };
      (["lead", "inbox", "post", "comment"] as const).forEach((metric) => {
        agg.targets[metric] += member.targets[metric] || 0;
        agg.rewards[metric] += member.rewards[metric] || 0;
      });
      agg.rewards.total_bonus += member.rewards.total_bonus || 0;
      map[member.teamId] = agg;
    }
    return map;
  }, [summary]);

  const loadAll = useCallback(async () => {
    if (teams.length === 0) return;
    setIsLoading(true);
    try {
      const results = await Promise.all(
        teams.map((team) => kpiRewardsService.effectiveRules({ teamId: team.id, startDate, endDate })),
      );
      const nextRules: Record<string, KpiRewardRule[]> = {};
      teams.forEach((team, idx) => {
        const res = results[idx];
        const effective = res.success && res.data ? res.data : { rules: [], source: "default" as const, sourceWeek: null };
        nextRules[team.id] = normalizeRules(team.id, startDate, endDate, effective.rules);
      });
      setRulesByTeam(nextRules);
      setEditingTeamIds(new Set());
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamIdsKey, startDate, endDate]);

  const loadSummary = useCallback(async () => {
    const res = await kpiRewardsService.summary({ startDate, endDate });
    setSummary(res.success && res.data ? res.data : null);
  }, [startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const updateTeamRule = (teamId: string, metric: KpiRewardMetric, patch: Partial<KpiRewardRule>) => {
    setRulesByTeam((current) => ({
      ...current,
      [teamId]: (current[teamId] || []).map((rule) => (rule.metric === metric ? { ...rule, ...patch } : rule)),
    }));
  };

  const toggleEdit = (teamId: string) => {
    setEditingTeamIds((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const toggleLogs = async (teamId: string) => {
    if (logsTeamId === teamId) {
      setLogsTeamId(null);
      return;
    }
    setLogsTeamId(teamId);
    if (!logsByTeam[teamId]) {
      const res = await kpiRewardsService.logs({ teamId, startDate, endDate });
      setLogsByTeam((current) => ({ ...current, [teamId]: res.success && res.data ? res.data : [] }));
    }
  };

  const saveTeam = async (teamId: string) => {
    const rules = rulesByTeam[teamId] || [];
    setSavingTeamIds((current) => new Set(current).add(teamId));
    try {
      const payloadRules = rules.map((rule) => ({
        metric: rule.metric,
        weight: Number(rule.weight || 0),
        threshold_value: Number(rule.thresholdValue || 0),
        reward_per_unit: Number(rule.rewardPerUnit || 0),
        max_reward: rule.maxReward === null ? null : Number(rule.maxReward || 0),
        max_rate: Number(rule.maxRate || 200),
      }));
      const res = await kpiRewardsService.saveActive({
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
        rules: payloadRules,
      });
      if (!res.success) throw new Error(res.message || "Lưu rule thất bại");
      toast.success("Đã lưu rule KPI & thưởng đang dùng");
      await loadAll();
      await loadSummary();
      if (logsByTeam[teamId] !== undefined) {
        const logRes = await kpiRewardsService.logs({ teamId, startDate, endDate });
        setLogsByTeam((current) => ({ ...current, [teamId]: logRes.success && logRes.data ? logRes.data : [] }));
      }
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu rule thất bại");
    } finally {
      setEditingTeamIds((current) => {
        const next = new Set(current);
        next.delete(teamId);
        return next;
      });
      setSavingTeamIds((current) => {
        const next = new Set(current);
        next.delete(teamId);
        return next;
      });
    }
  };

  // Moi group luon co 3 cot: co Nguong thi Nguong+Bonus+Total Bonus, khong thi
  // Bonus+Total Bonus+Max Bonus - khop dung cau truc sheet goc.
  const totalCols = RULE_GROUPS.length * 3 + 3;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Cài đặt Bonus KPI - Tất cả team</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Mỗi team 1 dòng - bấm &quot;Sửa&quot; đúng dòng của team nào thì chỉnh rule của team đó.
          </p>
        </div>
        {isLoading ? <span className="text-[12px] text-muted-foreground">Đang tải...</span> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-center text-[10px] xl:text-[11px]">
          <thead>
            <tr>
              <th rowSpan={2} className="w-[13%] border border-slate-300 bg-slate-50 px-2 py-2 text-left font-black text-slate-700">
                Team
              </th>
              {RULE_GROUPS.map((group) => (
                <th
                  key={group.key}
                  colSpan={3}
                  className={cn("border border-slate-300 px-1 py-2 text-[10px] font-black xl:text-xs", group.sectionClass)}
                >
                  <RuleGroupHeader group={group} />
                </th>
              ))}
              <th className="border border-slate-300 bg-white px-1 py-2 text-[10px] font-black text-black xl:text-xs">
                <RuleSubHeader icon="military_tech" label="MAX" />
              </th>
              <th rowSpan={2} className="w-[9%] border border-slate-300 bg-slate-50 px-1 py-2 text-slate-700">
                <RuleSubHeader icon="settings" label="Thao tác" />
              </th>
            </tr>
            <tr>
              {RULE_GROUPS.map((group) => (
                <Fragment key={group.key}>
                  {METRIC_HAS_THRESHOLD[group.key] ? (
                    <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                      <RuleSubHeader icon="track_changes" label="Ngưỡng (%)" />
                    </th>
                  ) : null}
                  <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                    <RuleSubHeader icon="paid" label="Bonus" />
                  </th>
                  <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                    <RuleSubHeader icon="card_giftcard" label="Total Bonus" />
                  </th>
                  {!METRIC_HAS_THRESHOLD[group.key] ? (
                    <th className={cn("border border-slate-300 px-1 py-2", group.sectionClass)}>
                      <RuleSubHeader icon="shield" label="Max Bonus" />
                    </th>
                  ) : null}
                </Fragment>
              ))}
              <th className="border border-slate-300 bg-white px-1 py-2 font-black text-black">Max Rate</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="border border-border px-4 py-10 text-center text-muted-foreground">
                  Chưa có team nào.
                </td>
              </tr>
            ) : (
              teams.flatMap((team) => {
                const rules = rulesByTeam[team.id] || defaultRules(team.id, startDate, endDate);
                const isEditing = editingTeamIds.has(team.id);
                const isSaving = savingTeamIds.has(team.id);
                const aggregates = teamAggregates[team.id];

                const mainRow = (
                  <tr key={team.id}>
                    <td className="border border-border bg-slate-50 px-2 py-2 text-left align-top">
                      <div className="font-bold text-foreground">{team.name_team}</div>
                    </td>
                    {RULE_GROUPS.map((group) => {
                      const rule = getRule(rules, group.key);
                      const totalBonus = aggregates?.rewards[group.key] ?? 0;
                      const targetSum = group.key === "total_bonus" ? 0 : (aggregates?.targets[group.key as "lead" | "inbox" | "post" | "comment"] ?? 0);
                      const maxBonus = targetSum * (rule.rewardPerUnit || 0) * ((rule.maxRate || 200) / 100);
                      return (
                        <Fragment key={group.key}>
                          {METRIC_HAS_THRESHOLD[group.key] ? (
                            <td className="border border-slate-300 bg-white p-1">
                              <RuleInput
                                value={rule.thresholdValue}
                                suffix="%"
                                tone="percent"
                                editable={isEditing}
                                disabled={!isEditing}
                                onChange={(value) => updateTeamRule(team.id, group.key, { thresholdValue: value ?? 0 })}
                              />
                            </td>
                          ) : null}
                          <td className="border border-slate-300 bg-white p-1">
                            <RuleInput
                              value={rule.rewardPerUnit}
                              editable={isEditing}
                              disabled={!isEditing}
                              onChange={(value) => updateTeamRule(team.id, group.key, { rewardPerUnit: value ?? 0 })}
                            />
                          </td>
                          <td className="border border-slate-300 bg-emerald-200 px-1 py-2 text-right font-bold text-emerald-900 tabular-nums">
                            {formatVnd(totalBonus)}
                          </td>
                          {!METRIC_HAS_THRESHOLD[group.key] ? (
                            <td className="border border-slate-300 bg-white px-1 py-2 text-right font-semibold text-rose-700 tabular-nums">
                              {formatVnd(maxBonus)}
                            </td>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    <td className="border border-slate-300 bg-white p-1">
                      <RuleInput
                        value={getRule(rules, "lead").maxRate}
                        suffix="%"
                        tone="max"
                        editable={isEditing}
                        disabled={!isEditing}
                        onChange={(value) => {
                          const maxRate = value ?? 0;
                          RULE_GROUPS.forEach((group) => updateTeamRule(team.id, group.key, { maxRate }));
                        }}
                      />
                    </td>
                    <td className="border border-border bg-slate-50 px-1 py-2 align-top">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleEdit(team.id)}
                          className={cn(
                            "flex h-7 w-full items-center justify-center gap-1 rounded px-2 text-[10px] font-semibold transition",
                            isEditing ? "bg-emerald-600 text-white" : "bg-zinc-100 text-foreground hover:bg-zinc-200",
                          )}
                        >
                          <MaterialIcon name={isEditing ? "lock_reset" : "edit"} className="text-sm" />
                          {isEditing ? "Đang sửa" : "Sửa"}
                        </button>
                        {isEditing ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => saveTeam(team.id)}
                            className="flex h-7 w-full items-center justify-center gap-1 rounded bg-primary px-2 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            {isSaving ? "..." : "Lưu"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void toggleLogs(team.id)}
                          className="flex h-7 w-full items-center justify-center gap-1 rounded bg-zinc-100 px-2 text-[10px] font-semibold text-foreground hover:bg-zinc-200"
                        >
                          <MaterialIcon name="history" className="text-sm" />
                          Log
                        </button>
                      </div>
                    </td>
                  </tr>
                );

                if (logsTeamId !== team.id) return [mainRow];

                const logs = logsByTeam[team.id] || [];
                const logRow = (
                  <tr key={`${team.id}-logs`}>
                    <td colSpan={totalCols} className="border border-border bg-muted/20 px-4 py-3 text-left">
                      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                        Nhật ký chỉnh sửa - {team.name_team}
                      </p>
                      {logs.length === 0 ? (
                        <p className="text-[12px] text-muted-foreground">Chưa có thay đổi nào cho team và tuần này.</p>
                      ) : (
                        <ul className="space-y-2">
                          {logs.map((log) => (
                            <li key={log.id} className="rounded-lg border border-border bg-white px-3 py-2 text-[12px]">
                              <div className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                                <MaterialIcon name="person" className="text-sm text-muted-foreground" />
                                {log.changedByName}
                                <span className="font-normal text-muted-foreground">
                                  · {new Date(log.createdAt).toLocaleString("vi-VN")}
                                </span>
                              </div>
                              <ul className="mt-1 space-y-0.5 pl-5 text-muted-foreground">
                                {log.changes.map((change, idx) => (
                                  <li key={`${log.id}-${idx}`}>
                                    {change.metricLabel} · {change.fieldLabel}:{" "}
                                    <span className="font-semibold text-rose-700">{formatLogValue(change.field, change.oldValue)}</span>
                                    {" → "}
                                    <span className="font-semibold text-emerald-700">{formatLogValue(change.field, change.newValue)}</span>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
                return [mainRow, logRow];
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminKpiRewardsPanel({
  view,
  selectedWeek,
  selectedTeamId: controlledTeamId,
}: {
  view: "kpi-rules" | "kpi-summary";
  selectedWeek: string;
  // Bo loc team cho view kpi-summary gio nam o thanh tieu de trang (component cha) -
  // truyen xuong day thay vi tu quan ly rieng, tranh 2 bo loc chiem dien tich.
  selectedTeamId?: string;
}) {
  const { user } = useAppAuth();
  const role = user?.role as string | undefined;
  const { startDate, endDate } = splitWeek(selectedWeek);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const selectedTeamId = controlledTeamId ?? "";
  const [summary, setSummary] = useState<KpiRewardSummary | null>(null);

  const loadTeams = useCallback(async () => {
    const res = await teamsService.getAll();
    const allTeams = res.success && res.data ? res.data : [];
    const scopedTeams = allTeams.filter((team) => {
      if (role === "admin" || role === "superadmin") return true;
      if (role === "leader") {
        return String(team.id_leader || "") === String(user?.id || "") || team.leader_email === user?.email;
      }
      return (team.members || []).some((member) => (
        String(member.id || "") === String(user?.id || "") || member.email === user?.email
      ));
    });
    setTeams(scopedTeams);
  }, [role, user?.email, user?.id]);

  const loadData = useCallback(async () => {
    try {
      const summaryRes = await kpiRewardsService.summary({ startDate, endDate, teamId: selectedTeamId || undefined });
      setSummary(summaryRes.success && summaryRes.data ? summaryRes.data : null);
    } catch {
      setSummary(null);
    }
  }, [startDate, endDate, selectedTeamId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTeams();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTeams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  if (view === "kpi-rules") {
    const isAdmin = role === "admin" || role === "superadmin";
    const isReadOnly = role === "member";

    // Admin quan ly nhieu team cung luc -> 1 bang to, moi team 1 dong (khong bam chon
    // tung team). Leader/member chi co dung 1 team lien quan -> giu bang rule don nhu cu.
    if (isAdmin) {
      return (
        <AdminAllTeamsKpiRuleTable teams={teams} selectedWeek={selectedWeek} onChanged={loadData} />
      );
    }

    const activeTeamId = teams[0]?.id || "";
    return (
      <div className="space-y-5">
        {!activeTeamId ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-[13px] text-muted-foreground">
            Chưa có team để cài rule KPI.
          </div>
        ) : (
          <KpiRewardRuleTable
            teamId={activeTeamId}
            selectedWeek={selectedWeek}
            readOnly={isReadOnly}
            onChanged={loadData}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Tổng thưởng hệ thống</div>
          <div className="mt-2 text-2xl font-bold">{formatVnd(summary?.totals.totalReward || 0)}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Đang dùng</div>
          <div className="mt-2 text-2xl font-bold">{formatVnd(summary?.totals.approvedReward || 0)}</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Dự kiến</div>
          <div className="mt-2 text-2xl font-bold">{formatVnd(summary?.totals.estimatedReward || 0)}</div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-foreground">Tổng thưởng từng team</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Leader</th>
                <th className="px-4 py-3 text-right">Thành viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Tổng thưởng</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.teamSummaries || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Chưa có dữ liệu tổng hợp cho tuần này.
                  </td>
                </tr>
              ) : (
                summary!.teamSummaries.map((team) => (
                  <tr key={team.teamId} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold">{team.teamName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{team.leaderEmail}</td>
                    <td className="px-4 py-3 text-right">{team.memberCount}</td>
                    <td className="px-4 py-3"><StatusBadge status={team.status} /></td>
                    <td className="px-4 py-3 text-right font-bold">{formatVnd(team.totalReward)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <KpiRewardResultsTable summary={summary} teamId={selectedTeamId || undefined} />
    </div>
  );
}
