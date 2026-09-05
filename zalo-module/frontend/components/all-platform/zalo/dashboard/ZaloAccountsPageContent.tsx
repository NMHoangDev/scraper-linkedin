"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui";
import {
  getZaloAccounts,
  createZaloAccount,
  updateZaloAccount,
  deleteZaloAccount,
} from "@/services/zaloCrawlerService";
import type { ZaloAccountInfo } from "@/types/zalo-api";
import ZaloAccountAuthView from "../admin-inbox/ZaloAccountAuthView";

// Trang quản lý tài khoản Zalo (bản rút gọn cho zalo-module) — thay cho
// ZaloDashboardView + useZaloCrawlerFlow gốc (đăng nhập bằng mã QR quét qua
// Playwright, không copy sang vì zalo-module không có Playwright). Đăng
// nhập ở đây dùng đúng 1 cơ chế duy nhất: Chrome Extension (giống hệt trang
// zalo-inbox), qua ZaloAccountAuthView.
export function ZaloAccountsPageContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ZaloAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginAccountId, setLoginAccountId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getZaloAccounts();
      setAccounts(res.accounts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách tài khoản Zalo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    setSaving(true);
    try {
      await createZaloAccount({ label, phone: newPhone.trim() || undefined });
      setNewLabel("");
      setNewPhone("");
      setShowAddForm(false);
      await loadAccounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được tài khoản");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(accountId: string) {
    if (!window.confirm(`Xoá tài khoản Zalo "${accountId}"? Hành động này không xoá dữ liệu hội thoại đã lưu trừ khi chọn "Xoá cả phiên đăng nhập".`)) {
      return;
    }
    const deleteAuth = window.confirm("Xoá LUÔN phiên đăng nhập + dữ liệu hội thoại đã lưu của tài khoản này? (OK = xoá hết, Cancel = chỉ ẩn tài khoản)");
    try {
      await deleteZaloAccount(accountId, deleteAuth);
      await loadAccounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xoá được tài khoản");
    }
  }

  async function handleToggleShared(account: ZaloAccountInfo) {
    try {
      await updateZaloAccount(account.account_id, { is_shared_with_all: !account.is_shared_with_all });
      await loadAccounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được trạng thái dùng chung");
    }
  }

  function handleEnterChat(accountId: string) {
    router.push(`/all-platform/zalo-inbox?account=${encodeURIComponent(accountId)}`);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f8f9fa]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Tài khoản Zalo</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các tài khoản Zalo dùng để nhắn/nhận tin. Đăng nhập qua Chrome Extension (đọc cookie chat.zalo.me).
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 transition"
        >
          <MaterialIcon name="add" className="text-[18px]" />
          Thêm tài khoản mới
        </button>
      </div>

      {showAddForm && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Tên hiển thị</label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="VD: Zalo Sale 01"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-56"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Số điện thoại (tuỳ chọn)</label>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-44"
            />
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={saving || !newLabel.trim()}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 transition"
          >
            {saving ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800 font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Đang tải...</div>
      ) : accounts.length === 0 ? (
        <div className="text-sm text-slate-500">Chưa có tài khoản Zalo nào. Bấm "Thêm tài khoản mới" để bắt đầu.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Tài khoản</th>
                <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                <th className="px-4 py-2.5 font-semibold">Listener</th>
                <th className="px-4 py-2.5 font-semibold">Dùng chung toàn công ty</th>
                <th className="px-4 py-2.5 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => {
                const status = acc.status || "unknown";
                const isConfirmed = status === "confirmed" && !acc.listener?.auth_expired;
                return (
                  <tr key={acc.account_id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{acc.label || acc.account_id}</div>
                      <div className="text-[11px] text-slate-400">{acc.account_id}{acc.phone ? ` · ${acc.phone}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                          (isConfirmed
                            ? "bg-green-50 text-green-700"
                            : status === "session_expired"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500")
                        }
                      >
                        {isConfirmed ? "Đã đăng nhập" : status === "session_expired" ? "Hết phiên" : "Chưa đăng nhập"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {acc.listener?.connected ? (
                        <span className="text-green-600 font-semibold">● Đang kết nối</span>
                      ) : acc.listener?.running ? (
                        <span className="text-amber-600 font-semibold">● Đang khởi động</span>
                      ) : (
                        <span className="text-slate-400">○ Chưa chạy</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(acc.is_shared_with_all)}
                          onChange={() => void handleToggleShared(acc)}
                          className="h-4 w-4"
                        />
                        <span className="text-[11px] text-slate-500">Mọi nhân viên đều xem/gửi được</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEnterChat(acc.account_id)}
                          disabled={!isConfirmed}
                          className="rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 text-[11px] font-semibold transition"
                        >
                          Vào chat
                        </button>
                        <button
                          onClick={() => setLoginAccountId(acc.account_id)}
                          className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 text-[11px] font-semibold transition"
                        >
                          {isConfirmed ? "Đăng nhập lại" : "Đăng nhập"}
                        </button>
                        <button
                          onClick={() => void handleDelete(acc.account_id)}
                          className="rounded-lg hover:bg-red-50 text-red-500 px-2 py-1.5 text-[11px] font-semibold transition"
                        >
                          <MaterialIcon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loginAccountId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-xl bg-white shadow-2xl relative">
            <button
              onClick={() => setLoginAccountId(null)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-sm font-bold z-10"
              title="Đóng"
            >
              ✕
            </button>
            <ZaloAccountAuthView
              accountId={loginAccountId}
              ownerName={accounts.find((a) => a.account_id === loginAccountId)?.label || loginAccountId}
              onSuccess={() => {
                setLoginAccountId(null);
                void loadAccounts();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
