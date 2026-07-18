import { AdminKpiRewardsPanel } from "@/components/all-platform/kpi-rewards/KpiRewardSections";

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

export default function KpiRulesRoute() {
  return (
    <div className="p-5">
      <AdminKpiRewardsPanel view="kpi-rules" selectedWeek={getCurrentWeekValue()} />
    </div>
  );
}
