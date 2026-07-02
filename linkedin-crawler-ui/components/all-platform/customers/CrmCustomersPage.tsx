"use client";

import { useEffect, useState, useCallback } from "react";
import { CrmCustomerModal } from "@/components/all-platform/components/CrmCustomerModal";
import {
  customerLeadService,
  type Customer,
  type SourcePlatform,
  SOURCE_PLATFORM_OPTIONS,
  INDUSTRY_OPTIONS,
  CITY_OPTIONS,
} from "@/services/customer-lead.service";
import { toast } from "sonner";

/* ─── Helpers ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Đang chờ",  cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    closed:     { label: "Đã chốt",   cls: "bg-green-100  text-green-800  border-green-200"  },
    rejected:   { label: "Từ chối",   cls: "bg-red-100    text-red-800    border-red-200"    },
  };
  const fallback = { label: status, cls: "bg-gray-100 text-gray-800 border-gray-200" };
  const { label, cls } = map[status] ?? fallback;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>;
}

function ActivityBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:  { label: "Active",      cls: "bg-blue-100   text-blue-800   border-blue-200"   },
    paused:  { label: "Tạm ngưng",   cls: "bg-orange-100 text-orange-800 border-orange-200" },
    churned: { label: "Đã rời",      cls: "bg-gray-100  text-gray-600  border-gray-200"   },
  };
  const fallback = { label: status, cls: "bg-gray-100 text-gray-800 border-gray-200" };
  const { label, cls } = map[status] ?? fallback;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    FB_Inbox:  { label: "FB Inbox",  cls: "bg-blue-100 text-blue-800 border-blue-200" },
    FB_Group:  { label: "FB Group", cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    Zalo:      { label: "Zalo",     cls: "bg-cyan-100 text-cyan-800 border-cyan-200" },
    Manual:    { label: "Nhập tay", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const { label, cls } = map[source] ?? { label: source, cls: "bg-gray-100 text-gray-800" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

function BudgetBadge({ hasBudget }: { hasBudget: boolean }) {
  return hasBudget
    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Có ngân sách</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200">Chưa có NS</span>;
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

function FilterBar({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  const set = (key: keyof FilterState, val: string) => onChange({ ...filters, [key]: val });

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Tìm tên, công ty, SĐT, email..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
        />
      </div>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => set("status", e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="pending">Đang chờ</option>
        <option value="closed">Đã chốt</option>
        <option value="rejected">Từ chối</option>
      </select>

      {/* Source */}
      <select
        value={filters.source_platform}
        onChange={(e) => set("source_platform", e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
      >
        <option value="">Tất cả nguồn</option>
        {SOURCE_PLATFORM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* City */}
      <select
        value={filters.city}
        onChange={(e) => set("city", e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 min-w-[150px]"
      >
        <option value="">Tất cả thành phố</option>
        {CITY_OPTIONS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Industry */}
      <select
        value={filters.industry}
        onChange={(e) => set("industry", e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 min-w-[180px]"
      >
        <option value="">Tất cả lĩnh vực</option>
        {INDUSTRY_OPTIONS.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>

      {/* Reset */}
      {(filters.search || filters.status || filters.city || filters.industry || filters.source_platform) && (
        <button
          onClick={() => onChange({ search: "", status: "", city: "", industry: "", source_platform: "" })}
          className="px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ↺ Xóa lọc
        </button>
      )}
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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerLeadService.getAll({
        search: filters.search || undefined,
        status: filters.status || undefined,
        city: filters.city || undefined,
        industry: filters.industry || undefined,
        source_platform: filters.source_platform || undefined,
        page,
        page_size: pageSize,
      });
      setCustomers(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      toast.error("Lỗi khi tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filters]);

  const handleFilterChange = (f: FilterState) => {
    setFilters(f);
    setPage(1);
  };

  const handleSaved = () => {
    fetchCustomers();
  };

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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Khách hàng (CRM)</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {total > 0 ? `${total} khách hàng` : "Chưa có dữ liệu"}
          </p>
        </div>
        <button
          onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
          className="px-4 py-2.5 bg-[#E3000F] hover:bg-red-700 text-white rounded-lg font-semibold text-sm
                     flex items-center gap-2 transition-colors shadow-sm shadow-red-500/20"
        >
          <span className="text-lg leading-none">+</span> Thêm khách hàng
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
        <FilterBar filters={filters} onChange={handleFilterChange} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nguồn</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày chốt</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E3000F]" />
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Chưa có khách hàng nào
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    {/* Customer info */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{c.customer_name}</div>
                      {c.company_name && (
                        <div className="text-slate-500 text-xs mt-0.5">{c.company_name}</div>
                      )}
                      {c.city && (
                        <div className="text-slate-400 text-xs">{c.city}</div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      {c.phone && <div className="text-slate-700">{c.phone}</div>}
                      {c.email && <div className="text-slate-400 text-xs">{c.email}</div>}
                      {c.industry && <div className="text-slate-400 text-xs">{c.industry}</div>}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <SourceBadge source={c.source_platform ?? "Manual"} />
                      <div className="mt-1">
                        <BudgetBadge hasBudget={c.has_budget ?? false} />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div><StatusBadge status={c.status ?? "pending"} /></div>
                      <div className="mt-1"><ActivityBadge status={c.activity_status ?? "active"} /></div>
                      {c.review_result && c.review_result !== "Chua_xem_xet" && (
                        <div className={`mt-1 text-xs font-medium ${
                          c.review_result === "Qualify" ? "text-green-600" : "text-red-500"
                        }`}>
                          {c.review_result === "Qualify" ? "✓ Qualify" : "✗ Disqualify"}
                        </div>
                      )}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700">{formatVND(c.lifetime_value)}</div>
                      {c.service_package && (
                        <div className="text-xs text-slate-400">{c.service_package}</div>
                      )}
                      {c.contract_status && c.contract_status !== "active" && (
                        <div className="text-xs text-slate-400">HĐ: {c.contract_status}</div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      <div>Tạo: {formatDate(c.created_at)}</div>
                      {c.customer_since && <div>Chốt: {formatDate(c.customer_since)}</div>}
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {(c.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                        {(c.tags ?? []).length > 3 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                            +{c.tags!.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {c.conv_id && (
                          <a
                            href={`/all-platform/inbox?conv=${c.conv_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                            title="Mở hội thoại"
                          >
                            💬
                          </a>
                        )}
                        <button
                          onClick={() => { setEditingCustomer(c); setModalOpen(true); }}
                          className="px-2 py-1 text-xs text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
                          title="Sửa"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(c.id)}
                          className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                          title="Xóa"
                        >
                          🗑️
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-500">
              Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                ←
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return p <= totalPages ? (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                      p === page
                        ? "bg-[#E3000F] text-white border-[#E3000F]"
                        : "border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ) : null;
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <CrmCustomerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
        onSuccess={handleSaved}
      />

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-slate-500 mb-5">
              Bạn có chắc muốn xóa khách hàng này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
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
