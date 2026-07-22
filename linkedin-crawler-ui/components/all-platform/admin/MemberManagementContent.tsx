"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useMembers } from "@/hooks/useMembers";
import {
  allPlatformMembersService,
  usersService,
  type AppUserProfile,
} from "@/services/all-platform.service";
import type { MemberProfile, Skill } from "@/types/unified.types";
import {
  PlatformStatCard,
  PlatformStatsRow,
} from "@/components/features/shared/PlatformStatCard";

type MemberFormState = {
  id?: string;
  display_name: string;
  full_name: string;
  email: string;
  telegram_username: string;
  phone: string;
  birth_date: string;
  gender: string;
  team: string;
  position: string;
  department: string;
  experience_year: string;
  linked_user_id: string;
  linked_user_id_2: string;
  skill_ids: string[];
};

function emptyMemberForm(): MemberFormState {
  return {
    display_name: "",
    full_name: "",
    email: "",
    telegram_username: "",
    phone: "",
    birth_date: "",
    gender: "",
    team: "",
    position: "",
    department: "",
    experience_year: "0",
    linked_user_id: "",
    linked_user_id_2: "",
    skill_ids: [],
  };
}

function memberToForm(m: MemberProfile): MemberFormState {
  return {
    id: m.id,
    display_name: m.display_name,
    full_name: m.full_name,
    email: m.email || "",
    telegram_username: m.telegram_username || "",
    phone: m.phone || "",
    birth_date: m.birth_date ? m.birth_date.slice(0, 10) : "",
    gender: m.gender || "",
    team: m.team || "",
    position: m.position || "",
    department: m.department || "",
    experience_year: String(m.experience_year ?? 0),
    linked_user_id: m.linked_user_id || "",
    linked_user_id_2: m.linked_user_id_2 || "",
    skill_ids: m.skill_ids || [],
  };
}

export function MemberManagementContent() {
  const { members, loading, error: membersError, loadMembers } = useMembers();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<MemberFormState>(emptyMemberForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MemberProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tạo tài khoản đăng nhập mới (chưa từng có trong app_users) ngay trong modal
  // thành viên — trước đây chỉ chọn được tài khoản CÓ SẴN, không có cách nào
  // thêm mới từ đây, buộc phải nhờ dev thêm tay khi Google Sign-In báo "Email
  // chưa được cấp tài khoản".
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAccountRole, setNewAccountRole] = useState("member");
  const [newAccountError, setNewAccountError] = useState<string | null>(null);
  const [newAccountNotice, setNewAccountNotice] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    skipped: Array<{ row: number; reason: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load skills + app_users 1 lần khi mount (không phụ thuộc filter).
  useEffect(() => {
    void (async () => {
      const res = await allPlatformMembersService.getSkills();
      setSkills(res.data || []);
    })();
    void (async () => {
      const res = await usersService.getAllProfiles();
      setAppUsers(res.data || []);
    })();
  }, []);

  const teamOptions = useMemo(
    () => Array.from(new Set(members.map(m => m.team).filter(Boolean))) as string[],
    [members]
  );

  const skillsByCategory = useMemo(() => {
    const groups = new Map<string, Skill[]>();
    for (const skill of skills) {
      const key = skill.category || "Khác";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(skill);
    }
    return Array.from(groups.entries());
  }, [skills]);

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return members.filter(m => {
      if (teamFilter && m.team !== teamFilter) return false;
      if (!term) return true;
      return (
        m.display_name.toLowerCase().includes(term) ||
        m.full_name.toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term)
      );
    });
  }, [members, searchTerm, teamFilter]);

  function openAddModal() {
    setForm(emptyMemberForm());
    setModalError(null);
    setModalMode("add");
  }

  function openEditModal(member: MemberProfile) {
    setForm(memberToForm(member));
    setModalError(null);
    setModalMode("edit");
  }

  function toggleSkill(skillId: string) {
    setForm(current => ({
      ...current,
      skill_ids: current.skill_ids.includes(skillId)
        ? current.skill_ids.filter(id => id !== skillId)
        : [...current.skill_ids, skillId],
    }));
  }

  async function handleCreateAccount() {
    setNewAccountError(null);
    setNewAccountNotice(null);
    if (!form.email.trim()) {
      setNewAccountError("Nhập email ở phần \"Thông tin cá nhân\" trước.");
      return;
    }
    setIsCreatingAccount(true);
    try {
      const res = await usersService.createAccount({
        email: form.email.trim(),
        name: form.full_name.trim() || undefined,
        role: newAccountRole,
      });
      // res.message giờ luôn phản ánh lỗi backend thật (403/401/422...) thay vì
      // rơi vào thông báo chung — xem fix ở requestJson() trong all-platform.service.ts.
      if (!res.success || !res.data) {
        throw new Error(res.message || "Không tạo được tài khoản");
      }
      const account = res.data as AppUserProfile & { already_existed?: boolean };
      setAppUsers(prev => (prev.some(u => u.id === account.id) ? prev : [...prev, account]));
      setForm(current => ({ ...current, linked_user_id: account.id }));

      // Đang sửa 1 member đã tồn tại (có id) -> lưu liên kết ngay lập tức, không
      // đợi admin bấm "Lưu thay đổi" ở form chính — tránh trường hợp tạo tài
      // khoản xong nhưng quên lưu, mất liên kết vừa tạo.
      if (form.id) {
        const linkRes = await allPlatformMembersService.update({ id: form.id, linked_user_id: account.id });
        if (!linkRes.success) {
          throw new Error(linkRes.message || "Tạo tài khoản thành công nhưng lưu liên kết thất bại.");
        }
      }

      setNewAccountNotice(
        account.already_existed
          ? `Email này đã có tài khoản (role: ${account.role}) — đã liên kết vào tài khoản đó.`
          : "Đã tạo tài khoản và liên kết thành công."
      );
      setCreatingAccount(false);
    } catch (err) {
      setNewAccountError(err instanceof Error ? err.message : "Không tạo được tài khoản");
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_name.trim() || !form.full_name.trim()) {
      setModalError("Vui lòng nhập đầy đủ Display Name và Họ và tên.");
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        display_name: form.display_name.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        telegram_username: form.telegram_username.trim() || undefined,
        phone: form.phone.trim() || undefined,
        birth_date: form.birth_date || undefined,
        gender: form.gender || undefined,
        team: form.team.trim() || undefined,
        position: form.position.trim() || undefined,
        department: form.department.trim() || undefined,
        experience_year: Number(form.experience_year) || 0,
        linked_user_id: form.linked_user_id || undefined,
        linked_user_id_2: form.linked_user_id_2 || undefined,
        skill_ids: form.skill_ids,
      };
      const res =
        modalMode === "add"
          ? await allPlatformMembersService.add(payload)
          : await allPlatformMembersService.update({ ...payload, id: form.id! });
      if (!res.success) {
        setModalError(res.message || "Lưu thất bại. Vui lòng thử lại.");
        return;
      }
      setModalMode(null);
      await loadMembers();
    } catch {
      setModalError("Lỗi hệ thống khi gửi yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await allPlatformMembersService.delete(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        await loadMembers();
      } else {
        alert(res.message || "Lỗi khi xóa thành viên");
      }
    } catch {
      alert("Lỗi kết nối khi xóa");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportSummary(null);
    try {
      const summary = await allPlatformMembersService.importExcel(file);
      setImportSummary(summary);
      await loadMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import thất bại");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 font-sans">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <MaterialIcon name="manage_accounts" className="text-primary text-3xl" />
        </div>
        <div>
          <h1 className="text-h1 text-on-background font-semibold">Quản lý thành viên</h1>
          <p className="text-body-md text-on-surface-variant">
            Danh bạ nhân sự nội bộ — nguồn dữ liệu duy nhất cho mọi dropdown liên quan tới nhân sự trong app.
          </p>
        </div>
      </div>

      <PlatformStatsRow>
        <PlatformStatCard label="Tổng thành viên" value={members.length} accent="primary" />
        <PlatformStatCard label="Đã liên kết tài khoản" value={members.filter(m => m.linked_user_id).length} accent="success" />
        <PlatformStatCard label="Số team" value={teamOptions.length} accent="warning" />
        <PlatformStatCard label="Kỹ năng đã khai báo" value={skills.length} accent="primary" />
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
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="shrink-0 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-none cursor-pointer"
            >
              <option value="">Tất cả Team</option>
              {teamOptions.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => { setImportOpen(true); setImportSummary(null); }}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border border-outline-variant hover:bg-surface-container-low text-on-surface px-4 py-2 rounded-xl text-xs font-bold transition sm:flex-none"
            >
              <MaterialIcon name="attach_file" className="text-base" /> Import Excel
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap bg-primary hover:bg-on-primary-fixed-variant text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm sm:flex-none"
            >
              <MaterialIcon name="add" className="text-base" /> Thêm thành viên
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase">
              <tr>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Chức vụ</th>
                <th className="py-3 px-4">Telegram</th>
                <th className="py-3 px-4">Tài khoản đăng nhập</th>
                <th className="py-3 px-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-on-surface-variant">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">Đang tải danh sách thành viên...</td></tr>
              ) : membersError ? (
                <tr><td colSpan={7} className="py-12 text-center text-red-600 font-medium">{membersError}</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center italic">Chưa có thành viên nào.</td></tr>
              ) : (
                filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-surface-container-low transition">
                    <td className="py-3 px-4 font-semibold text-on-surface">{m.display_name}</td>
                    <td className="py-3 px-4">{m.full_name}</td>
                    <td className="py-3 px-4">{m.team || "—"}</td>
                    <td className="py-3 px-4">{m.position || "—"}</td>
                    <td className="py-3 px-4">{m.telegram_username || "—"}</td>
                    <td className="py-3 px-4">
                      {m.linked_user_id ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-100 bg-emerald-50 text-emerald-700">Đã liên kết</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-outline-variant bg-surface-container-low text-on-surface-variant">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => openEditModal(m)} className="p-1.5 hover:bg-surface-container-low rounded-lg transition" title="Sửa">
                          <MaterialIcon name="edit" className="text-base" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(m)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Xóa">
                          <MaterialIcon name="delete" className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
          <div style={{ width: "100%", maxWidth: "760px" }} className="bg-surface rounded-xl border border-outline-variant shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low shrink-0">
              <h3 className="font-bold text-on-surface uppercase text-sm">
                {modalMode === "add" ? "Thêm thành viên mới" : "Chỉnh sửa thành viên"}
              </h3>
              <button type="button" onClick={() => setModalMode(null)} className="p-1.5 rounded-lg hover:bg-surface-container-low">
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={e => void handleSave(e)} className="p-6 space-y-5 overflow-y-auto flex-1">
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant border-b border-outline-variant pb-1">Thông tin cá nhân</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Display Name" required>
                    <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="Vd: 1.Minhpn" />
                  </Field>
                  <Field label="Họ và tên" required>
                    <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Vd: Nguyễn Văn A" />
                  </Field>
                  <Field label="Email">
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                  </Field>
                  <Field label="Telegram">
                    <input value={form.telegram_username} onChange={e => setForm({ ...form, telegram_username: e.target.value })} placeholder="@username" />
                  </Field>
                  <Field label="Số điện thoại">
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" />
                  </Field>
                  <Field label="Ngày sinh">
                    <input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                  </Field>
                  <Field label="Giới tính">
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                      <option value="">-- Chọn --</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant border-b border-outline-variant pb-1">Thông tin tổ chức</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Team" required>
                    <input value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} placeholder="Vd: Sales" list="member-team-options" />
                    <datalist id="member-team-options">
                      {teamOptions.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </Field>
                  <Field label="Chức vụ">
                    <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Vd: Nhân viên" />
                  </Field>
                  <Field label="Phòng ban">
                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Vd: Kinh doanh" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Liên kết tài khoản đăng nhập" hint="tùy chọn">
                    <select value={form.linked_user_id} onChange={e => setForm({ ...form, linked_user_id: e.target.value })}>
                      <option value="">-- Chưa liên kết --</option>
                      {appUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Liên kết tài khoản đăng nhập (phụ)" hint="tùy chọn — dùng khi 1 người có 2 email">
                    <select value={form.linked_user_id_2} onChange={e => setForm({ ...form, linked_user_id_2: e.target.value })}>
                      <option value="">-- Chưa liên kết --</option>
                      {appUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Đặt ngoài grid 2 cột phía trên — để 2 ô "Liên kết tài khoản"
                 * chính/phụ luôn cùng chiều cao, không bị lệch nhau khi khối
                 * tạo tài khoản này mở rộng ra (trước đây nằm lồng trong ô
                 * chính, làm 2 cột cao thấp không đều). */}
                {!creatingAccount ? (
                  <button
                    type="button"
                    onClick={() => { setCreatingAccount(true); setNewAccountError(null); setNewAccountNotice(null); }}
                    className="text-[11px] text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left"
                  >
                    + Chưa có tài khoản? Tạo mới từ email ở trên (để đăng nhập Google)
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low p-2">
                    <p className="text-[11px] text-on-surface-variant">
                      Tạo tài khoản đăng nhập cho <b>{form.email || "(chưa nhập email)"}</b> — chỉ đăng nhập được qua Google, không có mật khẩu.
                    </p>
                    <select value={newAccountRole} onChange={e => setNewAccountRole(e.target.value)}>
                      <option value="member">member</option>
                      <option value="leader">leader</option>
                      <option value="admin">admin</option>
                    </select>
                    {newAccountError && <p className="text-[11px] text-error">{newAccountError}</p>}
                    {newAccountNotice && <p className="text-[11px] text-emerald-600">{newAccountNotice}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isCreatingAccount}
                        onClick={handleCreateAccount}
                        className="text-[11px] font-semibold text-white bg-primary rounded px-2 py-1 border-0 cursor-pointer disabled:opacity-60"
                      >
                        {isCreatingAccount ? "Đang tạo..." : "Tạo tài khoản"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreatingAccount(false)}
                        className="text-[11px] text-on-surface-variant bg-transparent border-0 cursor-pointer"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant border-b border-outline-variant pb-1">Kỹ năng chuyên môn</h4>
                <Field label="Kinh nghiệm (năm)">
                  <input type="number" min={0} value={form.experience_year} onChange={e => setForm({ ...form, experience_year: e.target.value })} className="max-w-[160px]" />
                </Field>
                {skillsByCategory.length === 0 ? (
                  <p className="text-xs italic text-on-surface-variant">Chưa có kỹ năng nào được khai báo. Thêm kỹ năng ở trang Quản lý danh mục.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {skillsByCategory.map(([category, list]) => (
                      <div key={category} className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-on-surface-variant">{category}</p>
                        <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-outline-variant p-2">
                          {list.map(skill => (
                            <label key={skill.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.skill_ids.includes(skill.id)}
                                onChange={() => toggleSkill(skill.id)}
                                className="cursor-pointer accent-primary"
                              />
                              {skill.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">{modalError}</div>
              )}
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low shrink-0">
              <button type="button" onClick={() => setModalMode(null)} className="flex-1 border border-outline-variant hover:bg-surface-container-low text-on-surface font-bold py-2 rounded-xl text-xs transition">
                Hủy
              </button>
              <button type="submit" onClick={e => void handleSave(e as unknown as React.FormEvent)} disabled={isSubmitting} className="flex-1 bg-primary hover:bg-on-primary-fixed-variant text-white font-bold py-2 rounded-xl text-xs transition shadow-sm">
                {isSubmitting ? "Đang lưu..." : modalMode === "add" ? "Thêm thành viên" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
          <div style={{ width: "100%", maxWidth: "420px" }} className="bg-surface rounded-xl border border-outline-variant shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-bold text-on-surface flex items-center gap-2"><span className="text-xl">⚠️</span> Xác nhận xóa</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1.5 rounded-lg hover:bg-surface-container-low" disabled={isDeleting}>
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs leading-relaxed text-on-surface">
                Bạn có chắc chắn muốn xóa thành viên <span className="font-semibold">{deleteTarget.display_name}</span> không?
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition" disabled={isDeleting}>
                Hủy bỏ
              </button>
              <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition shadow-sm">
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
          <div style={{ width: "100%", maxWidth: "480px" }} className="bg-surface rounded-xl border border-outline-variant shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-bold text-on-surface">Import danh sách từ Excel</h3>
              <button onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-container-low">
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                File .xlsx với cột: Display Name, Họ tên, Team, Chức vụ, Phòng ban, Telegram, Email.
                Ghép theo email (nếu có) hoặc Display Name — dòng trùng sẽ được cập nhật, không tạo bản ghi mới.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                disabled={importing}
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); }}
                className="w-full text-xs"
              />
              {importing && <p className="text-xs text-on-surface-variant">Đang import...</p>}
              {importSummary && (
                <div className="space-y-2 rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs">
                  <p>Đã tạo mới: <span className="font-bold text-emerald-600">{importSummary.created}</span></p>
                  <p>Đã cập nhật: <span className="font-bold text-sky-600">{importSummary.updated}</span></p>
                  <p>Bỏ qua: <span className="font-bold text-red-600">{importSummary.skipped.length}</span></p>
                  {importSummary.skipped.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1 pt-2 border-t border-outline-variant">
                      {importSummary.skipped.map((s, i) => (
                        <p key={i} className="text-[11px] text-red-600">Dòng {s.row}: {s.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-surface-container-low flex justify-end border-t border-outline-variant">
              <button type="button" onClick={() => setImportOpen(false)} className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-xl text-xs font-semibold transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase text-on-surface-variant">
        {label} {hint ? <em className="normal-case font-normal">({hint})</em> : null} {required ? <b className="text-error">*</b> : null}
      </span>
      <div
        className={cn(
          "[&>input]:w-full [&>input]:px-3 [&>input]:py-2 [&>input]:bg-surface-container-low [&>input]:border [&>input]:border-outline-variant [&>input]:rounded-xl [&>input]:text-xs",
          "[&>select]:w-full [&>select]:px-3 [&>select]:py-2 [&>select]:bg-surface-container-low [&>select]:border [&>select]:border-outline-variant [&>select]:rounded-xl [&>select]:text-xs [&>select]:cursor-pointer"
        )}
      >
        {children}
      </div>
    </label>
  );
}
