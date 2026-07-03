"use client";

/**
 * Trang CRM Khách hàng — /all-platform/customers
 *
 * 2 chế độ xem:
 * - Kanban (mặc định): khách chia theo cột trạng thái (Đang chờ / Đã chốt / Từ chối),
 *   kéo-thả thẻ giữa các cột để đổi trạng thái (giống SlimCRM/pipeline).
 * - Bảng: danh sách đầy đủ như cũ.
 *
 * Nút 💬 KHÔNG chuyển trang nữa — mở QuickChatBox (box chat nổi góc phải kiểu
 * Messenger) để nhắn nhanh với khách ngay tại đây.
 */

import { useEffect, useState, useCallback } from "react";
import { CrmCustomerModal } from "@/components/all-platform/components/CrmCustomerModal";
import { QuickChatBox } from "./QuickChatBox";
import {
  customerLeadService,
  type Customer,
  type LeadStatus,
  SOURCE_PLATFORM_OPTIONS,
  INDUSTRY_OPTIONS,
  CITY_OPTIONS,
} from "@/services/customer-lead.service";
import { toast } from "sonner";
import {
  MessageCircle,
  Pencil,
  Trash2,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Badges ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Đang chờ", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    closed:   { label: "Đã chốt",  cls: "bg-green-100  text-green-800  border-green-200"  },
    rejected: { label: "Từ chối",  cls: "bg-red-100    text-red-800    border-red-200"    },
  };
  const fallback = { label: status, cls: "bg-muted text-muted-foreground border-border" };
  const { label, cls } = map[status] ?? fallback;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>;
}

function ActivityBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:  { label: "Active",    cls: "bg-blue-100   text-blue-800   border-blue-200"   },
    paused:  { label: "Tạm ngưng", cls: "bg-orange-100 text-orange-800 border-orange-200" },
    churned: { label: "Đã rời",    cls: "bg-muted text-muted-foreground border-border" },
  };
  const fallback = { label: status, cls: "bg-muted text-muted-foreground border-border" };
  const { label, cls } = map[status] ?? fallback;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    FB_Inbox: { label: "FB Inbox", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    FB_Group: { label: "FB Group", cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    Zalo:     { label: "Zalo",     cls: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    Manual:   { label: "Nhập tay", cls: "bg-muted text-muted-foreground border-border" },
  };
  const { label, cls } = map[source] ?? { label: source, cls: "bg-muted text-muted-foreground" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

function BudgetBadge({ hasBudget }: { hasBudget: boolean }) {
  return hasBudget
    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Có ngân sách</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">Chưa có NS</span>;
}

function formatVND(value: number | null) {
  if (value == null || value === 0) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(value);
}

function formatDate(v: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("vi-VN"); } catch { return v; }
}

/* ─── Filter Bar ──────────────────────────────────────────── */

interface FilterState {
  search: string;
  status: string;
  city: string;
  industry: string;
  source_platform: string;
}

const inputCls =
  "px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring";

function FilterBar({ filters, onChange, hideStatus }: { filters: FilterState; onChange: (f: FilterState) => void; hideStatus?: boolean }) {
  const set = (key: keyof FilterState, val: string) => onChange({ ...filters, [key]: val });

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Tìm tên, công ty, SĐT, email..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className={cn(inputCls, "w-full")}
        />
      </div>

      {!hideStatus && (
        <select value={filters.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Đang chờ</option>
          <option value="closed">Đã chốt</option>
          <option value="rejected">Từ chối</option>
        </select>
      )}

      <select value={filters.source_platform} onChange={(e) => set("source_platform", e.target.value)} className={inputCls}>
        <option value="">Tất cả nguồn</option>
        {SOURCE_PLATFORM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select value={filters.city} onChange={(e) => set("city", e.target.value)} className={cn(inputCls, "min-w-[150px]")}>
        <option value="">Tất cả thành phố</option>
        {CITY_OPTIONS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select value={filters.industry} onChange={(e) => set("industry", e.target.value)} className={cn(inputCls, "min-w-[180px]")}>
        <option value="">Tất cả lĩnh vực</option>
        {INDUSTRY_OPTIONS.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>

      {(filters.search || filters.status || filters.city || filters.industry || filters.source_platform) && (
        <button
          onClick={() => onChange({ search: "", status: "", city: "", industry: "", source_platform: "" })}
          className="px-3 py-2 text-sm text-muted-foreground border border-input rounded-lg hover:bg-accent transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="size-3.5" /> Xóa lọc
        </button>
      )}
    </div>
  );
}

/* ─── Kanban ──────────────────────────────────────────────── */

const KANBAN_COLUMNS: { status: LeadStatus; label: string; headerCls: string; countCls: string }[] = [
  { status: "pending",  label: "ĐANG CHỜ / TƯ VẤN", headerCls: "bg-amber-500",  countCls: "text-amber-600" },
  { status: "closed",   label: "ĐÃ CHỐT",           headerCls: "bg-green-600",  countCls: "text-green-600" },
  { status: "rejected", label: "TỪ CHỐI",           headerCls: "bg-primary",    countCls: "text-primary" },
];

function KanbanCard({
  customer,
  onEdit,
  onChat,
  onDelete,
}: {
  customer: Customer;
  onEdit: () => void;
  onChat: (() => void) | null;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/customer-id", customer.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{customer.customer_name}</div>
          {customer.company_name && (
            <div className="truncate text-xs text-muted-foreground">{customer.company_name}</div>
          )}
        </div>
        <SourceBadge source={customer.source_platform ?? "Manual"} />
      </div>

      {customer.phone && <div className="text-xs text-foreground">📞 {customer.phone}</div>}
      {customer.industry && <div className="truncate text-xs text-muted-foreground">{customer.industry}</div>}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <BudgetBadge hasBudget={customer.has_budget ?? false} />
        {(customer.tags ?? []).slice(0, 2).map((tag) => (
          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
        <span className="text-[11px] text-muted-foreground">
          {formatVND(customer.lifetime_value) !== "—" ? formatVND(customer.lifetime_value) : `Tạo: ${formatDate(customer.created_at)}`}
        </span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          {onChat && (
            <button
              onClick={onChat}
              title="Inbox nhanh (mở box chat)"
              className="rounded p-1 text-blue-600 transition hover:bg-blue-50"
            >
              <MessageCircle className="size-4" />
            </button>
          )}
          <button onClick={onEdit} title="Sửa" className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <Pencil className="size-4" />
          </button>
          <button onClick={onDelete} title="Xóa" className="rounded p-1 text-destructive transition hover:bg-destructive/10">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({
  customers,
  onMove,
  onEdit,
  onChat,
  onDelete,
}: {
  customers: Customer[];
  onMove: (id: string, status: LeadStatus) => void;
  onEdit: (c: Customer) => void;
  onChat: (c: Customer) => void;
  onDelete: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {KANBAN_COLUMNS.map((col) => {
        const items = customers.filter((c) => (c.status ?? "pending") === col.status);
        const totalValue = items.reduce((s, c) => s + (c.lifetime_value ?? 0), 0);
        return (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.status); }}
            onDragLeave={() => setDragOver((d) => (d === col.status ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/customer-id");
              if (id) onMove(id, col.status);
            }}
            className={cn(
              "flex min-h-[300px] flex-col rounded-xl border bg-muted/40 transition",
              dragOver === col.status ? "border-primary/60 bg-primary/5" : "border-border",
            )}
          >
            {/* Header cột — dải màu đậm kiểu SlimCRM */}
            <div className={cn("flex items-center justify-between rounded-t-xl px-3 py-2 text-white", col.headerCls)}>
              <span className="text-xs font-bold tracking-wide">{col.label}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{items.length}</span>
            </div>
            {totalValue > 0 && (
              <div className="border-b border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                Tổng giá trị: <span className={col.countCls}>{formatVND(totalValue)}</span>
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-2">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-8 text-xs text-muted-foreground">
                  Kéo thẻ khách vào đây
                </div>
              ) : (
                items.map((c) => (
                  <KanbanCard
                    key={c.id}
                    customer={c}
                    onEdit={() => onEdit(c)}
                    onChat={c.conv_id ? () => onChat(c) : null}
                    onDelete={() => onDelete(c.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */

export default function CrmCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table">("kanban");

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    city: "",
    industry: "",
    source_platform: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [quickChatCustomer, setQuickChatCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerLeadService.getAll({
        search: filters.search || undefined,
        // Kanban tự chia cột theo status nên không lọc status ở server
        status: view === "kanban" ? undefined : filters.status || undefined,
        city: filters.city || undefined,
        industry: filters.industry || undefined,
        source_platform: filters.source_platform || undefined,
        page: view === "kanban" ? 1 : page,
        page_size: view === "kanban" ? 200 : pageSize,
      });
      setCustomers(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      toast.error("Lỗi khi tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, view]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [filters]);

  const handleFilterChange = (f: FilterState) => {
    setFilters(f);
    setPage(1);
  };

  const handleSaved = () => { fetchCustomers(); };

  const handleDelete = async (id: string) => {
    try {
      const res = await customerLeadService.delete(id);
      if (res.success) {
        toast.success("Đã xóa khách hàng");
        setShowDeleteConfirm(null);
        fetchCustomers();
      } else {
        toast.error(res.message || "Xóa thất bại");
      }
    } catch {
      toast.error("Lỗi khi xóa");
    }
  };

  // Kéo-thả kanban: đổi trạng thái, cập nhật lạc quan rồi gọi API
  const handleMove = async (id: string, status: LeadStatus) => {
    const target = customers.find((c) => c.id === id);
    if (!target || (target.status ?? "pending") === status) return;
    const prev = customers;
    setCustomers((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      const res = await customerLeadService.update(id, { status });
      if (res?.success === false) throw new Error(res?.message);
      toast.success(`Đã chuyển "${target.customer_name}" sang cột mới`);
    } catch {
      setCustomers(prev);
      toast.error("Đổi trạng thái thất bại");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý Khách hàng (CRM)</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total > 0 ? `${total} khách hàng` : "Chưa có dữ liệu"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle view */}
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                view === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TableIcon className="size-3.5" /> Bảng
            </button>
          </div>
          <button
            onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="size-4" /> Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <FilterBar filters={filters} onChange={handleFilterChange} hideStatus={view === "kanban"} />
      </div>

      {loading ? (
        <div className="flex justify-center rounded-xl border border-border bg-card py-16">
          <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          customers={customers}
          onMove={handleMove}
          onEdit={(c) => { setEditingCustomer(c); setModalOpen(true); }}
          onChat={(c) => setQuickChatCustomer(c)}
          onDelete={(id) => setShowDeleteConfirm(id)}
        />
      ) : (
        /* ─── Bảng ─── */
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Liên hệ</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Nguồn</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Giá trị</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Ngày chốt</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      Chưa có khách hàng nào
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{c.customer_name}</div>
                        {c.company_name && <div className="mt-0.5 text-xs text-muted-foreground">{c.company_name}</div>}
                        {c.city && <div className="text-xs text-muted-foreground">{c.city}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {c.phone && <div className="text-foreground">{c.phone}</div>}
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                        {c.industry && <div className="text-xs text-muted-foreground">{c.industry}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={c.source_platform ?? "Manual"} />
                        <div className="mt-1"><BudgetBadge hasBudget={c.has_budget ?? false} /></div>
                      </td>
                      <td className="px-4 py-3">
                        <div><StatusBadge status={c.status ?? "pending"} /></div>
                        <div className="mt-1"><ActivityBadge status={c.activity_status ?? "active"} /></div>
                        {c.review_result && c.review_result !== "Chua_xem_xet" && (
                          <div className={`mt-1 text-xs font-medium ${c.review_result === "Qualify" ? "text-green-600" : "text-red-500"}`}>
                            {c.review_result === "Qualify" ? "✓ Qualify" : "✗ Disqualify"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{formatVND(c.lifetime_value)}</div>
                        {c.service_package && <div className="text-xs text-muted-foreground">{c.service_package}</div>}
                        {c.contract_status && c.contract_status !== "active" && (
                          <div className="text-xs text-muted-foreground">HĐ: {c.contract_status}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        <div>Tạo: {formatDate(c.created_at)}</div>
                        {c.customer_since && <div>Chốt: {formatDate(c.customer_since)}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[140px] flex-wrap gap-1">
                          {(c.tags ?? []).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
                          ))}
                          {(c.tags ?? []).length > 3 && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">+{c.tags!.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {c.conv_id && (
                            <button
                              onClick={() => setQuickChatCustomer(c)}
                              className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                              title="Inbox nhanh (mở box chat)"
                            >
                              <MessageCircle className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingCustomer(c); setModalOpen(true); }}
                            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Sửa"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(c.id)}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                            title="Xóa"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border border-input px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-40"
                >
                  ←
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return p <= totalPages ? (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                        p === page ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
                      }`}
                    >
                      {p}
                    </button>
                  ) : null;
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded border border-input px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal thêm/sửa */}
      <CrmCustomerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
        onSuccess={handleSaved}
      />

      {/* Quick chat nổi góc phải */}
      {quickChatCustomer?.conv_id && (
        <QuickChatBox
          key={quickChatCustomer.conv_id}
          convId={quickChatCustomer.conv_id}
          customerName={quickChatCustomer.customer_name}
          onClose={() => setQuickChatCustomer(null)}
        />
      )}

      {/* Xác nhận xóa */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="rounded-xl bg-card p-6 shadow-xl"
            style={{ width: "100%", maxWidth: "384px", minWidth: "280px" }}
          >
            <h3 className="mb-2 text-lg font-bold text-foreground">Xác nhận xóa</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Bạn có chắc muốn xóa khách hàng này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="rounded-lg bg-destructive px-4 py-2 text-sm text-white hover:bg-destructive/90"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
