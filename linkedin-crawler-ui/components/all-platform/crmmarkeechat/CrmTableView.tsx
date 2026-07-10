"use client";

// crmmarkeechat/CrmTableView.tsx — port từ CrmTableView.vue.

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmDeal } from "./types";
import { DEAL_STAGE_META, formatDate, formatVND, getCurrentStage } from "./crmConfig";

type SortKey =
  | "customer_name"
  | "company_name"
  | "deal_stage"
  | "estimated_budget"
  | "source_platform"
  | "created_at"
  | "follow_up_date";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
}

const COLUMNS: Column[] = [
  { key: "customer_name", label: "Khách hàng" },
  { key: "company_name", label: "Công ty" },
  { key: "deal_stage", label: "Giai đoạn" },
  { key: "estimated_budget", label: "Ngân sách" },
  { key: "source_platform", label: "Nguồn" },
  { key: "follow_up_date", label: "Follow-up" },
  { key: "created_at", label: "Ngày tạo" },
];

export interface CrmTableViewProps {
  deals: CrmDeal[];
  onRowClick: (deal: CrmDeal) => void;
  onEdit: (deal: CrmDeal) => void;
  onDelete: (deal: CrmDeal) => void;
}

export default function CrmTableView({ deals, onRowClick, onEdit, onDelete }: CrmTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...deals];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" || typeof bv === "number") {
        cmp = Number(av || 0) - Number(bv || 0);
      } else {
        cmp = String(av || "").localeCompare(String(bv || ""), "vi");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [deals, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className="cursor-pointer select-none px-3 py-2 hover:bg-slate-100"
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-slate-300" />
                  )}
                </span>
              </th>
            ))}
            <th className="px-3 py-2 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((deal) => {
            const meta = DEAL_STAGE_META[getCurrentStage(deal)];
            return (
              <tr
                key={deal.id}
                onClick={() => onRowClick(deal)}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-2 font-medium text-slate-800">{deal.customer_name}</td>
                <td className="px-3 py-2 text-slate-600">{deal.company_name || "-"}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      meta.badgeClass,
                    )}
                  >
                    {meta.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {deal.estimated_budget ? formatVND(deal.estimated_budget) : "-"}
                </td>
                <td className="px-3 py-2 text-slate-600">{deal.source_platform || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{formatDate(deal.follow_up_date) || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{formatDate(deal.created_at) || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(deal);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(deal);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(deal);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-slate-400">
                Không có deal nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
