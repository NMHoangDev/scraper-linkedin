"use client";

/**
 * CrmKanbanBoard — layout theo thiết kế tham khảo "SalesFlow CRM".
 *
 * Cấu trúc 2 phần rõ ràng:
 *
 *  ┌───────────────────────────────────────────────────────────────┐
 *  │  PHẦN 1: PIPELINE CHÍNH (7 stage — scroll ngang)             │
 *  │  New Lead → Contacted → Qualified → Requirement →            │
 *  │  Proposal → Negotiation → Contract Sent                      │
 *  │                                                               │
 *  │  Mỗi stage là 1 cột dọc, có dot màu + count + danh sách    │
 *  │  card. Màu dot giảm dần theo stage (primary → primary/5).    │
 *  │  Card: tên deal + giá trị VND + số ngày ở stage + tag.      │
 *  ├───────────────────────────────────────────────────────────────┤
 *  │  ─── Terminal States ───                                      │
 *  │  PHẦN 2: 3 DROPTARGET LỚN (Won / Lost / On Hold)            │
 *  │  3 ô dashed-border lớn, mỗi ô có icon tròn + tiêu đề +      │
 *  │  mô tả. Kéo thẻ từ pipeline vào đây để chuyển stage cuối.  │
 *  └───────────────────────────────────────────────────────────────┘
 *
 * Logic nghiệp vụ (state machine, validation, audit log) đã có ở
 * CrmCustomersPage — chỉ cần gọi `onRequestMove(customer, toStage)`
 * với `toStage` tương ứng khi user kéo-thả.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Wallet,
  Clock,
  CalendarDays,
  FileText,
  MapPin,
  UserCog,
  Inbox,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Customer, DealStage } from "@/services/customer-lead.service";
import {
  DEAL_STAGE_META,
  PIPELINE_COLUMNS,
} from "@/services/customer-lead.service";
import {
  getCurrentStage,
  validateTransition,
} from "@/services/crm-pipeline.helpers";
import { useDragAutoScroll } from "@/hooks/useDragAutoScroll";

/* ─────────── helpers ─────────── */

function formatVND(value: number | null | undefined) {
  if (!value) return null;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN");
}

function contractStatusLabel(value: Customer["contract_status"] | null | undefined) {
  if (value === "completed") return "Hoàn thành";
  if (value === "maintenance") return "Bảo trì";
  return "Đang HĐ";
}

/** Tỉ lệ opacity cho dot màu của 7 stage (giảm dần như thiết kế SalesFlow). */
const STAGE_DOT_OPACITY: DealStage[] = [
  "new_lead",       // 100%
  "contacted",      // 60%
  "qualified",      // 40%
  "requirement",    // 30%
  "proposal_sent",  // 20%
  "negotiation",    // 10%
  "contract_sent",  // 5%
];

/* ─────────── Deal card ─────────── */

function DealCard({
  customer,
  onClick,
  onEdit,
  onChat,
  onDelete,
  onDropIntoTerminal,
  /** Mở modal resume (chỉ dùng cho card đang On Hold). */
  onResume,
  compact = false,
}: {
  customer: Customer;
  onClick: () => void;
  onEdit: () => void;
  onChat?: () => void;
  onDelete: () => void;
  onDropIntoTerminal: (c: Customer) => void;
  /** Khi viewport nhỏ → compact mode (padding nhỏ, font nhỏ, ẩn một số metadata). */
  compact?: boolean;
  /** Callback resume deal đang On Hold — mở modal có dropdown chọn prev_stage/lost. */
  onResume?: () => void;
}) {
  const stage = getCurrentStage(customer);
  const budget = customer.estimated_budget ?? customer.lifetime_value ?? 0;
  const days = customer.days_in_stage ?? 0;
  const ownerInitial = (customer.sdr_name ?? customer.leader_name ?? "?")
    .toString()
    .charAt(0)
    .toUpperCase();

  // Từ stage "proposal_sent" trở đi mới show giá đã báo (estimated_budget đã được set)
  const showPrice =
    stage !== "new_lead" && stage !== "contacted" && budget > 0;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/customer-id", customer.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className={cn(
        "group flex w-full cursor-grab flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:cursor-grabbing",
        compact ? "min-h-[140px] p-2.5" : "min-h-[170px] p-3",
      )}
    >
      {/* Header: tên + menu */}
      <div className="mb-1 flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "truncate font-semibold text-foreground",
              compact ? "text-xs" : "text-sm",
            )}
            title={customer.customer_name}
          >
            {customer.customer_name}
          </h4>
          {customer.company_name && (
            <p
              className={cn(
                "truncate text-muted-foreground",
                compact ? "text-[10px]" : "text-[11px]",
              )}
              title={customer.company_name}
            >
              {customer.company_name}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition hover:bg-muted hover:text-muted-foreground group-hover:opacity-100"
        >
          <MoreVertical className="size-3.5" />
        </button>
      </div>

      {/* Sản phẩm (service_package) */}
      {customer.service_package && (
        <div
          className={cn(
            "mb-1.5 truncate rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700",
            compact ? "text-[10px]" : "text-[11px]",
          )}
          title={customer.service_package}
        >
          📦 {customer.service_package}
        </div>
      )}

      {/* Liên hệ: SĐT + email */}
      {(customer.phone || customer.email) && (
        <div
          className={cn(
            "mb-1.5 space-y-0.5 text-muted-foreground",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {customer.phone && (
            <div className="flex items-center gap-1 truncate">
              <span className="shrink-0">📞</span>
              <span className="truncate">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-1 truncate">
              <span className="shrink-0">✉</span>
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Giá đã báo (chỉ từ stage proposal_sent trở đi) */}
      {(customer.city || customer.industry || customer.decision_maker) && (
        <div
          className={cn(
            "mb-1.5 space-y-0.5 text-muted-foreground",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {customer.city && (
            <div className="flex items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{customer.city}</span>
            </div>
          )}
          {customer.industry && (
            <div className="flex items-center gap-1 truncate">
              <Inbox className="size-3 shrink-0" />
              <span className="truncate">{customer.industry}</span>
            </div>
          )}
          {customer.decision_maker && (
            <div className="flex items-center gap-1 truncate">
              <UserCog className="size-3 shrink-0" />
              <span className="truncate">{customer.decision_maker}</span>
            </div>
          )}
        </div>
      )}

      {(customer.contract_status ||
        customer.contract_signed_at ||
        customer.warranty_expires_at ||
        customer.customer_since ||
        customer.last_attachment_name) && (
        <div
          className={cn(
            "mb-1.5 space-y-0.5 text-muted-foreground",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {customer.contract_status && (
            <div className="flex items-center gap-1 truncate">
              <FileText className="size-3 shrink-0" />
              <span className="truncate">{contractStatusLabel(customer.contract_status)}</span>
            </div>
          )}
          {customer.last_attachment_name && (
            <div className="flex items-center gap-1 truncate">
              <FileText className="size-3 shrink-0" />
              <span className="truncate">{customer.last_attachment_name}</span>
            </div>
          )}
          {(customer.follow_up_date ||
            customer.contract_signed_at ||
            customer.warranty_expires_at ||
            customer.customer_since) && (
            <div className="flex items-center gap-1 truncate">
              <CalendarDays className="size-3 shrink-0" />
              <span className="truncate">
                {formatDate(
                  customer.follow_up_date ||
                    customer.contract_signed_at ||
                    customer.warranty_expires_at ||
                    customer.customer_since,
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {showPrice ? (
        <div
          className={cn(
            "mb-2 flex items-baseline gap-1 rounded-md bg-emerald-50 px-2 py-1",
          )}
        >
          <Wallet className="size-3 shrink-0 text-emerald-600" />
          <span
            className={cn(
              "truncate font-bold text-emerald-700",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {formatVND(budget)}
          </span>
          <span className="ml-auto text-[9px] font-medium uppercase text-emerald-600/70">
            đã báo
          </span>
        </div>
      ) : null}

      {/* Footer: số ngày + owner avatar (+ nút Resume nếu đang On Hold) */}
      <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-border/40 pt-1.5">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3 shrink-0" />
          <span className={cn("font-medium", compact ? "text-[10px]" : "text-[11px]")}>
            {days} ngày
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {stage === "on_hold" && onResume && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResume();
              }}
              title="Mở lại deal — chọn stage đích"
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500 px-2 font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-95",
                compact ? "h-5 text-[10px]" : "h-6 text-[11px]",
              )}
            >
              <PauseCircle className={compact ? "size-2.5" : "size-3"} />
              Mở lại
            </button>
          )}
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
              compact ? "size-5 text-[10px]" : "size-6 text-[11px]",
            )}
            title={customer.sdr_name ?? customer.leader_name ?? "Chưa phân công"}
          >
            {ownerInitial}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Stage column (dropzone cho pipeline chính) ─────────── */

function StageColumn({
  stage,
  items,
  /** Lookup toàn bộ customer theo id — cần thiết vì target có thể đang ở CỘT KHÁC. */
  customerById,
  onDrop,
  onCardClick,
  onEdit,
  onChat,
  onDelete,
  compact = false,
}: {
  stage: DealStage;
  items: Customer[];
  customerById: Map<string, Customer>;
  onDrop: (c: Customer) => void;
  onCardClick: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onChat: (c: Customer) => void;
  onDelete: (id: string) => void;
  /** Card ở chế độ thu gọn (khi 7 cột). */
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const meta = DEAL_STAGE_META[stage];
  const opacityIndex = STAGE_DOT_OPACITY.indexOf(stage);
  const dotOpacity = opacityIndex >= 0 ? (100 - opacityIndex * 15) / 100 : 0.5;
  const dotClass = `bg-primary/${Math.round(dotOpacity * 100)}`;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("text/customer-id");
        if (!id) return;
        // QUAN TRỌNG: target có thể đang ở CỘT KHÁC (vd kéo từ new_lead → contacted).
        // Lookup từ customerById (full map), KHÔNG từ `items` (chỉ chứa customer của stage hiện tại).
        const target = customerById.get(id);
        if (!target) return;
        const fromStage = getCurrentStage(target);
        if (fromStage === stage) return;
        const v = validateTransition(fromStage, stage, target);
        if (!v.ok) {
          // Phân biệt 2 loại lỗi:
          //  1. Lỗi state machine (terminal, không có transition hợp lệ, on_hold → sai stage):
          //     → chặn hẳn, không mở modal.
          //  2. Thiếu required fields (note, budget, attachment, reject_reason, follow_up_date):
          //     → vẫn cho phép — parent sẽ mở StageTransitionModal để user bổ sung.
          const isMissingFields =
            Array.isArray(v.missing) && v.missing.length > 0;
          if (!isMissingFields) {
            toast.error(v.reason || "Chuyển stage không hợp lệ");
            return;
          }
          // Thiếu data → drop vẫn hợp lệ, để parent mở modal nhập.
        }
        onDrop(target);
      }}
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-xl transition",
        dragOver && "ring-2 ring-primary/40",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", dotClass)} />
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-wider text-foreground">
            {meta.label}
          </h3>
        </div>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>

      {/* Card list — flex-col gap 2, KHÔNG giới hạn max-height.
          Cột chứa nhiều card → tự giãn dài ra (board scroll ngang).
          Đặt min-h để cột rỗng vẫn hiển thị placeholder dropzone. */}
      <div className="flex min-h-[100px] flex-col gap-2 pr-1">
        {items.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-border/60 text-[11px] text-muted-foreground/50">
            Kéo deal vào đây
          </div>
        ) : (
          items.map((c) => (
            <DealCard
              key={c.id}
              customer={c}
              compact={compact}
              onClick={() => onCardClick(c)}
              onEdit={() => onEdit(c)}
              onChat={() => onChat(c)}
              onDelete={() => onDelete(c.id)}
              onDropIntoTerminal={() => {/* không dùng trong col này */}}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─────────── Terminal dropzone lớn (Won / Lost / On Hold) ─────────── */

function TerminalDropzone({
  stage,
  count,
  totalValue,
  onDrop,
  onCardClick,
  onEdit,
  onChat,
  onDelete,
}: {
  stage: "won" | "lost" | "on_hold";
  count: number;
  totalValue: number;
  onDrop: (c: Customer) => void;
  onCardClick: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onChat: (c: Customer) => void;
  onDelete: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const meta = DEAL_STAGE_META[stage];

  // Màu theo từng terminal
  const palette = {
    won: {
      ring: "ring-secondary/50",
      border: "border-secondary",
      bg: "bg-secondary/10 hover:bg-secondary/20",
      text: "text-secondary",
      iconWrap: "bg-secondary",
    },
    lost: {
      ring: "ring-destructive/50",
      border: "border-destructive",
      bg: "bg-destructive/10 hover:bg-destructive/20",
      text: "text-destructive",
      iconWrap: "bg-destructive",
    },
    on_hold: {
      ring: "ring-amber-500/50",
      border: "border-amber-500",
      bg: "bg-amber-500/10 hover:bg-amber-500/20",
      text: "text-amber-700",
      iconWrap: "bg-amber-500",
    },
  }[stage];

  const Icon = stage === "won" ? CheckCircle2 : stage === "lost" ? XCircle : PauseCircle;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("text/customer-id");
        if (!id) return;
        // Phải lookup từ parent truyền xuống — ở đây tạm không truy cập, parent xử lý qua callback
        const fakeTarget = { id } as any;
        onDrop(fakeTarget);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all",
        palette.bg,
        palette.border,
        dragOver && `ring-4 ${palette.ring}`,
      )}
    >
      <div
        className={cn(
          "mb-1 flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-transform group-hover:scale-110",
          palette.iconWrap,
          dragOver && "scale-110",
        )}
      >
        <Icon className="size-6" />
      </div>
      <h4 className={cn("text-base font-semibold", palette.text)}>{meta.label}</h4>
      <p className="max-w-[200px] text-[11px] text-muted-foreground">
        {stage === "won" && "Kéo deal đã chốt vào đây để ghi nhận doanh thu."}
        {stage === "lost" && "Kéo deal đã mất vào đây để archive."}
        {stage === "on_hold" && "Kéo deal đang tạm dừng vào đây."}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs font-medium">
        <span className={palette.text}>{count} deal</span>
        {totalValue > 0 && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className={palette.text}>{formatVND(totalValue)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────── Main board ─────────── */

interface Props {
  customers: Customer[];
  onRequestMove: (c: Customer, to: DealStage) => void;
  onCardClick: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onChat: (c: Customer) => void;
  onDelete: (id: string) => void;
  onNewCustomer: () => void;
  /**
   * Mở modal resume deal đang On Hold — cho phép user chọn prev_stage hoặc lost
   * thay vì kéo-thả card dọc qua viewport dài (kéo ngược từ terminal section
   * lên pipeline section đứt drag-over).
   */
  onResumeOnHold?: (c: Customer) => void;
}

export function CrmKanbanBoard({
  customers,
  onRequestMove,
  onCardClick,
  onEdit,
  onChat,
  onDelete,
  onNewCustomer,
  onResumeOnHold,
}: Props) {
  // Group theo stage
  const grouped = useMemo(() => {
    const out: Record<DealStage, Customer[]> = {
      new_lead: [], contacted: [], qualified: [], requirement: [],
      proposal_sent: [], negotiation: [], contract_sent: [],
      on_hold: [], won: [], lost: [],
    };
    for (const c of customers) {
      const stage = getCurrentStage(c);
      if (out[stage]) out[stage].push(c);
    }
    return out;
  }, [customers]);

  // 7 stage chính (loại on_hold ra vì nó nằm ở terminal section)
  const pipelineStages = useMemo(
    () => PIPELINE_COLUMNS.filter((s) => s !== "on_hold"),
    [],
  );

  // Khi viewport rất rộng (2xl = 1536px) → 7 cột, card cần compact để không tràn
  // Khi nhỏ hơn → 4/3/2/1 cột, card ở dạng đầy đủ
  const [useCompactCard, setUseCompactCard] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1536,
  );

  useEffect(() => {
    const onResize = () => setUseCompactCard(window.innerWidth >= 1536);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lookup customer theo id cho dropzone terminal
  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  // Auto-scroll window khi kéo card dọc qua 2 phần board (Pipeline → Terminal).
  // Board này window-scroll (không có scrollbar riêng trên container),
  // nên dùng `scrollOn: "window"` — chỉ scroll khi con trỏ chạm mép viewport.
  // Edge 96px (≈ 1.5 ô card) để dễ kích hoạt hơn so với mặc định. Tốc độ
  // max 14px/frame (~840px/s @60fps) — đủ nhanh để cover 100vh viewport
  // trong ~1.5s, nhưng không giật.
  useDragAutoScroll<HTMLDivElement>({
    scrollOn: "window",
    edge: 96,
    maxSpeed: 14,
  });

  function handleTerminalDrop(stage: "won" | "lost" | "on_hold", fakeOrReal: Customer) {
    const c = customerById.get(fakeOrReal.id);
    if (!c) return;
    const fromStage = getCurrentStage(c);
    if (fromStage === stage) return;
    const v = validateTransition(fromStage, stage, c);
    if (!v.ok) {
      const isMissingFields = Array.isArray(v.missing) && v.missing.length > 0;
      if (!isMissingFields) {
        toast.error(v.reason || "Chuyển stage không hợp lệ");
        return;
      }
      // Thiếu data → vẫn cho qua, parent sẽ mở modal nhập lý do lost / follow-up / ...
    }
    onRequestMove(c, stage);
  }

  const terminalStats = {
    won: {
      count: grouped.won.length,
      value: grouped.won.reduce((s, c) => s + (c.estimated_budget ?? c.lifetime_value ?? 0), 0),
    },
    lost: { count: grouped.lost.length, value: 0 },
    on_hold: { count: grouped.on_hold.length, value: 0 },
  };

  return (
    <div className="space-y-10">
      {/* ── PHẦN 1: PIPELINE CHÍNH (7 stage) ── */}
      <section>
        {/* Header strip nhỏ — tiêu đề + nút thêm deal */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pipeline bán hàng</h2>
            <p className="text-xs text-muted-foreground">
              Kéo thả deal qua từng stage — có validate theo quy tắc nghiệp vụ.
            </p>
          </div>
          <button
            onClick={onNewCustomer}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-95"
          >
            <Plus className="size-4" /> Thêm deal
          </button>
        </div>

        {/* Grid responsive:
            - mobile  : 1 cột (xếp dọc)
            - md      : 2 cột
            - lg      : 3 cột
            - xl      : 4 cột
            - 2xl     : 7 cột (compact card để không tràn) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          {pipelineStages.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              items={grouped[stage]}
              customerById={customerById}
              compact={useCompactCard}
              onDrop={(c) => onRequestMove(c, stage)}
              onCardClick={onCardClick}
              onEdit={onEdit}
              onChat={onChat}
              onDelete={onDelete}
            />
          ))}
        </div>
      </section>

      {/* ── Visual separator ── */}
      <div className="my-4 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Trạng thái cuối
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── PHẦN 2: 3 DROPTARGET LỚN (Won / Lost / On Hold) ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-foreground">Kết quả cuối cùng</h2>
          <p className="text-xs text-muted-foreground">
            3 trạng thái này là <b>terminal</b> — kéo deal vào đây để đóng vòng pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <TerminalDropzone
            stage="won"
            count={terminalStats.won.count}
            totalValue={terminalStats.won.value}
            onDrop={(c) => handleTerminalDrop("won", c)}
            onCardClick={onCardClick}
            onEdit={onEdit}
            onChat={onChat}
            onDelete={onDelete}
          />
          <TerminalDropzone
            stage="lost"
            count={terminalStats.lost.count}
            totalValue={terminalStats.lost.value}
            onDrop={(c) => handleTerminalDrop("lost", c)}
            onCardClick={onCardClick}
            onEdit={onEdit}
            onChat={onChat}
            onDelete={onDelete}
          />
          <TerminalDropzone
            stage="on_hold"
            count={terminalStats.on_hold.count}
            totalValue={terminalStats.on_hold.value}
            onDrop={(c) => handleTerminalDrop("on_hold", c)}
            onCardClick={onCardClick}
            onEdit={onEdit}
            onChat={onChat}
            onDelete={onDelete}
          />
        </div>

        {/* List deal đã vào terminal (gọn, có thể xem/đóng) */}
        {(grouped.won.length > 0 ||
          grouped.lost.length > 0 ||
          grouped.on_hold.length > 0) && (
          <div className="mt-8 space-y-6">
            {grouped.on_hold.length > 0 && (
              <TerminalList
                title="Đang tạm dừng (On Hold)"
                items={grouped.on_hold}
                colorClass="text-amber-700"
                onCardClick={onCardClick}
                onEdit={onEdit}
                onChat={onChat}
                onDelete={onDelete}
                onResume={(c) => onResumeOnHold?.(c)}
              />
            )}
            {grouped.won.length > 0 && (
              <TerminalList
                title="Đã chốt (Won)"
                items={grouped.won}
                colorClass="text-secondary"
                onCardClick={onCardClick}
                onEdit={onEdit}
                onChat={onChat}
                onDelete={onDelete}
              />
            )}
            {grouped.lost.length > 0 && (
              <TerminalList
                title="Đã rớt (Lost)"
                items={grouped.lost}
                colorClass="text-destructive"
                onCardClick={onCardClick}
                onEdit={onEdit}
                onChat={onChat}
                onDelete={onDelete}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────── Helper: list deal trong từng terminal (compact) ─────────── */

function TerminalList({
  title,
  items,
  colorClass,
  onCardClick,
  onEdit,
  onChat,
  onDelete,
  onResume,
}: {
  title: string;
  items: Customer[];
  colorClass: string;
  onCardClick: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onChat?: (c: Customer) => void;
  onDelete: (id: string) => void;
  /** Callback resume deal On Hold (mở modal có dropdown chọn stage đích). */
  onResume?: (c: Customer) => void;
}) {
  return (
    <div>
      <h3 className={cn("mb-2 text-sm font-semibold", colorClass)}>
        {title} <span className="text-muted-foreground/60">· {items.length}</span>
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((c) => (
          <DealCard
            key={c.id}
            customer={c}
            compact={false}
            onClick={() => onCardClick(c)}
            onEdit={() => onEdit(c)}
            onChat={onChat ? () => onChat(c) : undefined}
            onDelete={() => onDelete(c.id)}
            onDropIntoTerminal={() => {/* không dùng ở đây */}}
            onResume={onResume ? () => onResume(c) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
