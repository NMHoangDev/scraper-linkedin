"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";
import type { WeeklyVsTodayChartData } from "@/types/seeding-account.types";

interface Props {
  data: WeeklyVsTodayChartData[];
}

interface ChartPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface DotPayload {
  cx?: number;
  cy?: number;
  payload?: WeeklyVsTodayChartData;
}

function formatHourMin(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${String(m).padStart(2, "0")}p`;
}

function CustomTooltip(props: { active?: boolean; payload?: ChartPayloadEntry[]; label?: string }) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-[#e7e9ef] bg-white px-3 py-2 text-[12px] shadow-sm">
      <p className="mb-1 font-bold text-[#252733]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name}:{" "}
          {entry.dataKey === "todayHours"
            ? formatHourMin(entry.value)
            : `${Math.round(entry.value)}h`}
        </p>
      ))}
    </div>
  );
}

function renderWaveDot(props: DotPayload) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="#c71f4d" strokeWidth={2.5} />
      <text x={cx} y={cy - 14} textAnchor="middle" fill="#e83f6f" fontSize={11} fontWeight={800}>
        {formatHourMin(payload?.todayHours || 0)}
      </text>
    </g>
  );
}

function CustomLegend() {
  return (
    <div className="flex flex-wrap gap-[18px] px-0 pb-1">
      <div className="flex items-center gap-[7px] text-[12px] font-semibold text-[#585c68]">
        <span
          className="inline-block h-[12px] w-[12px] shrink-0 rounded-[3px]"
          style={{ background: "#4f46e5" }}
        />
        Tổng giờ online tuần này (cột)
      </div>
      <div className="flex items-center gap-[7px] text-[12px] font-semibold text-[#585c68]">
        <span
          className="inline-block h-[12px] w-[12px] shrink-0 rounded-full"
          style={{ background: "#c71f4d" }}
        />
        Giờ online hôm nay (đường sóng)
      </div>
    </div>
  );
}

export function SeedingActivityComboChart({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.accountName,
        shortName: d.accountName,
        weeklyHours: d.weeklyHours,
        todayHours: d.todayHours,
      })),
    [data],
  );

  const maxWeekly = Math.max(...chartData.map((d) => d.weeklyHours));
  const maxToday = Math.max(...chartData.map((d) => d.todayHours));
  const weeklyCeil = Math.ceil(maxWeekly / 9) * 9 || 9;
  const todayCeil = Math.ceil(maxToday / 2) * 2 || 2;

  const leftTicks = [0, Math.round(weeklyCeil * 0.25), Math.round(weeklyCeil * 0.5), Math.round(weeklyCeil * 0.75), weeklyCeil].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const rightTicks = [0, Math.round(todayCeil * 0.25), Math.round(todayCeil * 0.5), Math.round(todayCeil * 0.75), todayCeil].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-[15px] border border-[#e7e9ef] bg-white"
        style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
      >
        <div className="flex items-center justify-between border-b border-[#e7e9ef] px-4 py-[15px]">
          <h3 className="m-0 text-[15px] font-bold text-[#252733]">So sánh hoạt động tài khoản</h3>
          <div className="flex gap-[6px]">
            <button
              type="button"
              className="rounded-[8px] border-0 bg-[#c71f4d] px-[10px] py-[7px] text-[12px] font-bold text-white"
            >
              Top 6 tài khoản
            </button>
          </div>
        </div>
        <div className="flex h-[200px] items-center justify-center text-[13px] text-[#737785]">
          Chưa có dữ liệu
        </div>
      </div>
    );
  }

  return (
    <div
      className="combo-panel rounded-[15px] border border-[#e7e9ef] bg-white"
      style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
    >
      <div className="flex items-center justify-between border-b border-[#e7e9ef] px-4 py-[15px]">
        <h3 className="m-0 text-[15px] font-bold text-[#252733]">So sánh hoạt động tài khoản</h3>
        <div className="flex gap-[6px]">
          <button
            type="button"
            className="rounded-[8px] border-0 bg-[#c71f4d] px-[10px] py-[7px] text-[12px] font-bold text-white"
          >
            Top 6 tài khoản
          </button>
        </div>
      </div>

      <div className="px-4 pb-1 pt-2">
        <CustomLegend />
      </div>

      <div className="overflow-x-auto px-2 pb-[14px] pt-1">
        <ResponsiveContainer width="100%" height={300} minWidth={640}>
          <ComposedChart data={chartData} margin={{ top: 18, right: 40, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="waveFillSeeding" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c71f4d" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#c71f4d" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              stroke="#eef0f4"
              strokeWidth={1}
            />

            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 12, fontWeight: 700, fill: "#3a3d47" }}
              axisLine={{ stroke: "#dfe2e8", strokeWidth: 1.5 }}
              tickLine={false}
              dy={6}
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, weeklyCeil]}
              ticks={leftTicks}
              tick={{ fontSize: 11, fill: "#8a8f9c" }}
              axisLine={false}
              tickLine={false}
              dx={-4}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, todayCeil]}
              ticks={rightTicks}
              tick={{ fontSize: 11, fill: "#8a8f9c" }}
              axisLine={false}
              tickLine={false}
              dx={4}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              yAxisId="left"
              dataKey="weeklyHours"
              fill="#4f46e5"
              opacity={0.85}
              radius={[6, 6, 0, 0]}
              barSize={46}
              name="Tổng giờ online tuần này"
              label={{
                position: "top" as const,
                fill: "#4f46e5",
                fontSize: 11,
                fontWeight: 800,
                formatter: ((val: number | string) => `${Math.round(Number(val))}h`) as any,
              }}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="todayHours"
              fill="url(#waveFillSeeding)"
              stroke="none"
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="todayHours"
              stroke="#c71f4d"
              strokeWidth={3}
              dot={renderWaveDot as any}
              activeDot={{ r: 6, fill: "#fff", stroke: "#c71f4d", strokeWidth: 3 } as any}
              name="Giờ online hôm nay"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
