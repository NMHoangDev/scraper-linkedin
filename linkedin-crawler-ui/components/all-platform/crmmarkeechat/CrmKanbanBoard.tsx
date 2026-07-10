"use client";

// crmmarkeechat/CrmKanbanBoard.tsx — port từ CrmKanbanBoard.vue (Chatwoot CRM).
// Pipeline 7 cột kéo-thả + khu vực terminal (Won/Lost/On Hold) bên dưới.

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  PauseCircle,
  Phone,
  Tag,
  UserCog,
  Wallet,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDragAutoScroll } from "@/hooks/useDragAutoScroll";
import type { CrmDeal, DealStage } from "./types";
import {
  DEAL_STAGE_META,
  PIPELINE_COLUMNS,
  formatDate,
  formatVND,
  getCurrentStage,
  validateTransition,
} from "./crmConfig";

const TERMINAL_STAGES: DealStage[] = ["won", "lost", "on_hold"];

const TERMINAL_META: Record<
  "won" | "lost" | "on_hold",
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  won: { label: "Thắng", color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
  lost: { label: "Thất bại", color: "#ef4444", bg: "#fee2e2", icon: XCircle },
  on_hold: { label: "Tạm giữ", color: "#f59e0b", bg: "#fffbeb", icon: PauseCircle },
};

function getDaysSinceCreated(deal: CrmDeal): number {
  const created = new Date(deal.created_at).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86400000));
}

function getOwnerInitial(deal: CrmDeal): string {
  const name = deal.sdr_name || deal.lead_name || "?";
  return name.charAt(0).toUpperCase();
}

function shouldShowBudget(deal: CrmDeal): boolean {
  const stage = getCurrentStage(deal);
  return stage !== "new_lead" && stage !== "contacted" && Number(deal.estimated_budget || 0) > 0;
}

function getNotePreview(deal: CrmDeal): string | null {
  if (!deal.note) return null;
  return deal.note.length > 60 ? `${deal.note.slice(0, 60)}...` : deal.note;
}

function getContractLabel(deal: CrmDeal): string | null {
  return deal.last_attachment_name || null;
}

function getImportantDateLabel(deal: CrmDeal): { label: string; value: string } | null {
  const stage = getCurrentStage(deal);
  if (stage === "won" && deal.closed_at) return { label: "Chốt", value: formatDate(deal.closed_at) };
  if (stage === "on_hold" && deal.follow_up_date) return { label: "Follow-up", value: formatDate(deal.follow_up_date) };
  if (deal.warranty_expires_at) return { label: "Bảo hành", value: formatDate(deal.warranty_expires_at) };
  return null;
}

function getLostReasonLabel(deal: CrmDeal): string | null {
  return deal.reject_reason_text || deal.reject_reason || null;
}

interface DealCardProps {
  deal: CrmDeal;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}

function DealCard({ deal, onClick, onEdit, onDelete, compact }: DealCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stage = getCurrentStage(deal);
  const meta = DEAL_STAGE_META[stage];
  const days = getDaysSinceCreated(deal);
  const notePreview = getNotePreview(deal);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ id: deal.id }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className={cn(
        "group relative flex cursor-grab flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing",
        compact && "p-2.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-slate-800">
            {deal.customer_name || "Chưa có tên"}
          </h4>
          {deal.company_name && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <Building2 className="h-3 w-3 shrink-0" />
              {deal.company_name}
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-10 w-28 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                Sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
              >
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {shouldShowBudget(deal) && (
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
          <Wallet className="h-3 w-3" />
          {formatVND(deal.estimated_budget)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        {deal.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> {deal.phone}
          </span>
        )}
        {deal.email && (
          <span className="flex max-w-[120px] items-center gap-1 truncate">
            <Mail className="h-3 w-3 shrink-0" /> {deal.email}
          </span>
        )}
      </div>

      {deal.city && (
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3" /> {deal.city}
        </div>
      )}

      {notePreview && (
        <div className="flex items-start gap-1 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
          <FileText className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="truncate">{notePreview}</span>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2">
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
        >
          <Tag className="h-2.5 w-2.5" />
          {deal.priority || "medium"}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {days}d
          </span>
          <span
            title={deal.sdr_name || deal.lead_name || ""}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600"
          >
            {getOwnerInitial(deal)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface TerminalDealRowProps {
  deal: CrmDeal;
  onClick: () => void;
}

function TerminalDealRow({ deal, onClick }: TerminalDealRowProps) {
  const stage = getCurrentStage(deal) as "won" | "lost" | "on_hold";
  const contract = getContractLabel(deal);
  const dateInfo = getImportantDateLabel(deal);
  const lostReason = stage === "lost" ? getLostReasonLabel(deal) : null;

  return (
    <div
      onClick={onClick}
      className="flex min-w-[220px] shrink-0 cursor-pointer flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md"
    >
      <h5 className="truncate text-sm font-semibold text-slate-800">
        {deal.customer_name || "Chưa có tên"}
      </h5>
      {deal.company_name && (
        <p className="truncate text-xs text-slate-500">{deal.company_name}</p>
      )}
      {Number(deal.estimated_budget || 0) > 0 && (
        <p className="text-xs font-semibold text-emerald-700">
          {formatVND(deal.estimated_budget)}
        </p>
      )}
      {contract && (
        <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
          <FileText className="h-3 w-3 shrink-0" /> {contract}
        </p>
      )}
      {dateInfo && (
        <p className="flex items-center gap-1 text-[11px] text-slate-500">
          <CalendarDays className="h-3 w-3" /> {dateInfo.label}: {dateInfo.value}
        </p>
      )}
      {lostReason && (
        <p className="truncate text-[11px] text-red-500">{lostReason}</p>
      )}
      {(deal.leaded_by || deal.sdr_id) && (
        <p className="flex items-center gap-1 text-[11px] text-slate-400">
          <UserCog className="h-3 w-3" /> {deal.sdr_name || deal.lead_name}
        </p>
      )}
    </div>
  );
}

export interface CrmKanbanBoardProps {
  deals: CrmDeal[];
  onCardClick: (deal: CrmDeal) => void;
  onEdit: (deal: CrmDeal) => void;
  onDelete: (deal: CrmDeal) => void;
  onRequestMove: (deal: CrmDeal, toStage: DealStage) => void;
}

export default function CrmKanbanBoard({
  deals,
  onCardClick,
  onEdit,
  onDelete,
  onRequestMove,
}: CrmKanbanBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const containerRef = useDragAutoScroll<HTMLDivElement>({ scrollOn: "window" });

  const grouped = useMemo(() => {
    const map: Record<DealStage, CrmDeal[]> = {
      new_lead: [], contacted: [], qualified: [], requirement: [],
      proposal_sent: [], negotiation: [], contract_sent: [],
      won: [], lost: [], on_hold: [],
    };
    deals.forEach((deal) => {
      const stage = getCurrentStage(deal);
      if (!map[stage]) map[stage] = [];
      map[stage].push(deal);
    });
    return map;
  }, [deals]);

  const terminalStats = useMemo(
    () => ({
      won: grouped.won.length,
      lost: grouped.lost.length,
      on_hold: grouped.on_hold.length,
    }),
    [grouped],
  );

  function handleDrop(e: React.DragEvent, toStage: DealStage) {
    e.preventDefault();
    setDragOverStage(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const deal = deals.find((d) => d.id === data.id);
      if (!deal) return;
      const fromStage = getCurrentStage(deal);
      if (fromStage === toStage) return;
      if (!validateTransition(fromStage, toStage)) return;
      onRequestMove(deal, toStage);
    } catch {
      // ignore malformed drag payload
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* Pipeline chính — 7 cột kéo ngang */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_COLUMNS.map((stage) => {
          const meta = DEAL_STAGE_META[stage];
          const items = grouped[stage] || [];
          const isOver = dragOverStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => handleDrop(e, stage)}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50/60 p-2",
                isOver && "border-dashed border-slate-400 bg-slate-100",
              )}
            >
              <div className={cn("mb-2 flex items-center justify-between rounded-md px-2 py-1.5", meta.headerClass)}>
                <span className="text-xs font-semibold">{meta.label}</span>
                <span className="rounded-full bg-white/70 px-1.5 text-[11px] font-semibold">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onClick={() => onCardClick(deal)}
                    onEdit={() => onEdit(deal)}
                    onDelete={() => onDelete(deal)}
                    compact
                  />
                ))}
                {items.length === 0 && (
                  <p className="py-4 text-center text-[11px] text-slate-400">Trống</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Khu vực terminal — Won / Lost / On Hold */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Terminal States
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TERMINAL_STAGES.map((stage) => {
            const t = TERMINAL_META[stage as "won" | "lost" | "on_hold"];
            const Icon = t.icon;
            const items = grouped[stage] || [];
            const isOver = dragOverStage === stage;
            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => handleDrop(e, stage)}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border-2 border-dashed p-3 transition-colors",
                  isOver && "border-solid",
                )}
                style={{
                  borderColor: isOver ? t.color : `${t.color}55`,
                  backgroundColor: t.bg,
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: t.color }} />
                  <span className="text-sm font-semibold" style={{ color: t.color }}>
                    {t.label}
                  </span>
                  <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold" style={{ color: t.color }}>
                    {terminalStats[stage as "won" | "lost" | "on_hold"]}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {items.length === 0 && (
                    <p className="py-3 text-[11px] text-slate-400">Kéo thẻ vào đây</p>
                  )}
                  {items.map((deal) => (
                    <TerminalDealRow key={deal.id} deal={deal} onClick={() => onCardClick(deal)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
