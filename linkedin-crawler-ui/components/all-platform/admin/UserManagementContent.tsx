"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { usersService, type AppUserProfile } from "@/services/all-platform.service";
import {
  PlatformStatCard,
  PlatformStatsRow,
} from "@/components/features/shared/PlatformStatCard";

const ROLE_OPTIONS = ["member", "leader", "admin"];

export function UserManagementContent() {
  const { user: currentUser } = useAppAuth();
  const isAdmin = currentUser?.role === "admin";
  const [users, setUsers] = useState<AppUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [savingEmail, setSavingEmail] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await usersService.getAllProfiles();
      if (!res.success) throw new Error(res.message || "Không tải được danh sách người dùng");
      setUsers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users
      .filter(u => !roleFilter || u.role === roleFilter)
      .filter(u => !q || u.email.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q))
      .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  }, [users, searchTerm, roleFilter]);

  async function handleRoleChange(u: AppUserProfile, role: string) {
    setSavingEmail(u.email);
    try {
      const res = await usersService.updateRole(u.email, role);
      if (!res.success) throw new Error(res.message || "Không đổi được role");
      setUsers(prev => prev.map(x => (x.email === u.email ? { ...x, role } : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không đổi được role");
    } finally {
      setSavingEmail(null);
    }
  }

  async function handleToggleActive(u: AppUserProfile) {
    const nextActive = !u.is_active;
    if (currentUser?.email === u.email && !nextActive) {
      alert("Không thể tự vô hiệu hóa chính tài khoản đang đăng nhập.");
      return;
    }
    if (!nextActive && !confirm(`Vô hiệu hóa tài khoản "${u.email}"? Người này sẽ bị đăng xuất và không đăng nhập lại được.`)) {
      return;
    }
    setSavingEmail(u.email);
    try {
      const res = await usersService.setActive(u.email, nextActive);
      if (!res.success) throw new Error(res.message || "Không cập nhật được trạng thái");
      setUsers(prev => prev.map(x => (x.email === u.email ? { ...x, is_active: nextActive } : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không cập nhật được trạng thái");
    } finally {
      setSavingEmail(null);
    }
  }

  async function handleCreate() {
    setCreateError(null);
    if (!newEmail.trim()) {
      setCreateError("Nhập email.");
      return;
    }
    setCreating(true);
    try {
      const res = await usersService.createAccount({
        email: newEmail.trim(),
        name: newName.trim() || undefined,
        role: newRole,
      });
      if (!res.success || !res.data) throw new Error(res.message || "Không tạo được tài khoản");
      setUsers(prev => [...prev, res.data as AppUserProfile]);
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewRole("member");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Không tạo được tài khoản");
    } finally {
      setCreating(false);
    }
  }

  const activeCount = users.filter(u => u.is_active !== false).length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const leaderCount = users.filter(u => u.role === "leader").length;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant space-y-2">
        <MaterialIcon name="block" className="text-5xl text-primary-container" />
        <p className="font-bold text-base text-on-surface">Quyền truy cập bị từ chối</p>
        <p className="text-sm">Trang này chỉ dành riêng cho tài khoản Admin quản trị.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <MaterialIcon name="shield_person" className="text-primary text-3xl" />
        </div>
        <div>
          <h1 className="text-h1 text-on-background font-semibold">Quản lý người dùng</h1>
          <p className="text-body-md text-on-surface-variant">
            Toàn bộ tài khoản đăng nhập (app_users) — đổi role, kích hoạt/vô hiệu hóa, tạo tài khoản mới cho Google Sign-In.
          </p>
        </div>
      </div>

      <PlatformStatsRow>
        <PlatformStatCard label="Tổng tài khoản" value={users.length} accent="primary" />
        <PlatformStatCard label="Đang hoạt động" value={activeCount} accent="success" />
        <PlatformStatCard label="Admin" value={adminCount} accent="warning" />
        <PlatformStatCard label="Leader" value={leaderCount} accent="primary" />
      </PlatformStatsRow>

      <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full min-w-0 sm:max-w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="shrink-0 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-none cursor-pointer"
            >
              <option value="">Tất cả role</option>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setCreateOpen(true); setCreateError(null); }}
            className="flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <MaterialIcon name="person_add" className="text-base" /> Tạo tài khoản mới
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600 font-medium">
            <MaterialIcon name="error" className="text-red-500 text-base" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase">
              <tr>
                <th className="py-3 px-4">Tên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-6 px-4 text-center text-on-surface-variant">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-6 px-4 text-center text-on-surface-variant">Không có tài khoản nào khớp.</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low/50">
                    <td className="py-2.5 px-4 font-medium text-on-surface">{u.name || <span className="text-on-surface-variant">—</span>}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">{u.email}</td>
                    <td className="py-2.5 px-4">
                      <select
                        value={u.role || "member"}
                        disabled={savingEmail === u.email}
                        onChange={e => handleRoleChange(u, e.target.value)}
                        className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded-lg text-xs cursor-pointer disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        disabled={savingEmail === u.email}
                        onClick={() => handleToggleActive(u)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-0 cursor-pointer disabled:opacity-60 ${
                          u.is_active !== false
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {u.is_active !== false ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-on-surface-variant">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-xl w-[420px] max-w-[90vw] p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-on-surface">Tạo tài khoản mới</h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-low p-1 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
              >
                <MaterialIcon name="close" />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Tài khoản mới chỉ đăng nhập được qua Google (không có mật khẩu dùng được) — email phải trùng đúng với tài khoản Google của người đó.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Email <b className="text-error">*</b></span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Tên</span>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Tùy chọn"
                  className="px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Role</span>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="px-3 py-2 bg-surface border border-outline-variant rounded-xl text-sm cursor-pointer"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              {createError && <p className="text-red-500 text-xs font-medium">{createError}</p>}
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="w-full py-2.5 mt-1 bg-primary text-white rounded-xl font-semibold disabled:opacity-70 transition-all active:scale-95 border-0 cursor-pointer"
              >
                {creating ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
