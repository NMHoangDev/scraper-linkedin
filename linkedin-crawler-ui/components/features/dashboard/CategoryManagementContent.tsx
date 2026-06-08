"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/components/ui";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import {
  allPlatformCategoriesService,
  teamsService,
  usersService,
  type AppUserProfile,
  type TeamRow,
} from "@/services/all-platform.service";
import type { Category, CategoryType } from "@/types/unified.types";
import { cn } from "@/lib/utils";
import {
  PlatformStatCard,
  PlatformStatsRow,
} from "@/components/features/shared/PlatformStatCard";

// ── TEAM MODAL (Multi-select members, Leader dropdown) ──────────────────────
function TeamModal({ isOpen, onClose, onSave, editing }: { isOpen: boolean; onClose: () => void; onSave: (p: any) => Promise<void>; editing?: any }) {
  const [nameTeam, setNameTeam] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  
  const [leaders, setLeaders] = useState<AppUserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      usersService.getByRole("leader").then(r => r.success && setLeaders(r.data || []));
      usersService.getByRole("member").then(r => r.success && setAllUsers(r.data || []));
    }
  }, [isOpen]);

  useEffect(() => {
    if (editing) {
      setNameTeam(editing.name_team || "");
      setLeaderEmail(editing.leader_email || "");
      setMemberEmails(editing.members || []);
    } else {
      setNameTeam("");
      setLeaderEmail("");
      setMemberEmails([]);
    }
  }, [editing, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTeam.trim() || !leaderEmail) return;
    setIsSubmitting(true);
    try {
      await onSave({
        name_team: nameTeam.trim(),
        leader_email: leaderEmail,
        member_emails: memberEmails,
        isEdit: !!editing
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (email: string) => {
    setMemberEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200">
      <div style={{ width: "100%", maxWidth: "448px" }} className="rounded-2xl bg-[#FFFFFF] border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50 bg-slate-50/50 shrink-0">
          <h3 className="font-bold text-slate-800">
            {editing ? "Sửa Team" : "Thêm Team"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Tên Team {editing ? "(không đổi)" : "*"}
            </label>
            <input
              type="text"
              value={nameTeam}
              onChange={(e) => setNameTeam(e.target.value)}
              disabled={!!editing}
              placeholder="Vd: Growth Team"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Trưởng nhóm (Leader) {editing ? "(không đổi)" : "*"}
            </label>
            <select
              value={leaderEmail}
              onChange={(e) => setLeaderEmail(e.target.value)}
              disabled={!!editing}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition cursor-pointer disabled:opacity-50"
            >
              <option value="">-- Chọn Leader --</option>
              {leaders.map(l => (
                <option key={l.email} value={l.email}>{l.name || l.email} ({l.email})</option>
              ))}
              {editing && leaderEmail && !leaders.find(l => l.email === leaderEmail) && (
                <option value={leaderEmail}>{leaderEmail}</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Thành viên (Members)</label>
            <div className="border border-slate-200/80 rounded-xl max-h-48 overflow-y-auto bg-slate-50 p-2 space-y-1">
              {allUsers.length === 0 ? (
                <div className="text-xs text-center p-2 text-slate-500">Đang tải tài khoản...</div>
              ) : (
                allUsers.map(u => {
                  const selected = memberEmails.includes(u.email);
                  return (
                    <div 
                      key={u.email} 
                      onClick={() => toggleMember(u.email)}
                      className={cn("flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition border", selected ? "bg-[#E3000F]/10 border-[#E3000F]/30" : "bg-white border-transparent hover:border-slate-200")}
                    >
                      <input type="checkbox" checked={selected} readOnly className="cursor-pointer accent-[#E3000F]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{u.name || u.email.split("@")[0]}</div>
                        <div className="text-slate-500 text-[10px] truncate">{u.email}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 text-right font-medium">Đã chọn: {memberEmails.length} người</div>
          </div>
          
          <div className="flex gap-3 pt-3 border-t border-slate-50 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl text-xs transition">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isSubmitting || !nameTeam.trim() || !leaderEmail} className="flex-1 bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
              {isSubmitting ? "Đang lưu..." : (editing ? "Lưu thay đổi" : "Thêm mới")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CategoryMeta {
  key: CategoryType;
  label: string;
  emoji: string;
  description: string;
  placeholderValue: string;
  placeholderName: string;
  valueKey: string;
  nameKey: string;
  valueLabel: string;
  nameLabel: string;
}

const CATEGORIES_METADATA: CategoryMeta[] = [
  {
    key: "intent",
    label: "Lĩnh vực",
    emoji: "🏷️",
    description: "Mục đích cào dữ liệu của nhóm (Facebook synced với Google Sheet Intents, LinkedIn forward qua n8n).",
    placeholderValue: "Vd: KOL_INFLUENCER",
    placeholderName: "Vd: Cá nhân có sức ảnh hưởng lớn",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Mã (code)",
    nameLabel: "Tên mô tả (name)",
  },
  {
    key: "industry",
    label: "Ngành (Industry)",
    emoji: "📂",
    description: "Các lĩnh vực hoạt động của nhóm (vd: Công Nghệ, Marketing).",
    placeholderValue: "Vd: IT",
    placeholderName: "Vd: Information Technology",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Mã ngành (code)",
    nameLabel: "Tên ngành (name)",
  },
  {
    key: "tier",
    label: "Tier",
    emoji: "🔥",
    description: "Độ ưu tiên theo dõi và tương tác của nhóm.",
    placeholderValue: "Vd: 1",
    placeholderName: "Vd: High Priority",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Mã cấp độ (code)",
    nameLabel: "Tên cấp độ (name)",
  },
  {
    key: "team",
    label: "Team",
    emoji: "👥",
    description: "Các bộ phận phụ trách khai thác nhóm (vd: Sales, Marketing).",
    placeholderValue: "Vd: Growth Team",
    placeholderName: "Vd: Nguyễn Văn A",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Tên Team (team_name)",
    nameLabel: "Trưởng nhóm (leader)",
  },
  {
    key: "icp",
    label: "ICP Target",
    emoji: "🎯",
    description: "Chân dung khách hàng mục tiêu trong nhóm.",
    placeholderValue: "Vd: Founder / CEO",
    placeholderName: "Vd: US/UK",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Đối tượng (target)",
    nameLabel: "Khu vực (geo)",
  },
  {
    key: "content_type",
    label: "Loại nội dung",
    emoji: "📄",
    description: "Phân loại nội dung thường xuyên đăng tải (vd: Bài viết, Video).",
    placeholderValue: "Vd: VIDEO",
    placeholderName: "Vd: Video Ngắn",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Mã loại (code)",
    nameLabel: "Tên hiển thị (name)",
  },
  {
    key: "product_seeding",
    label: "Sản phẩm Seeding",
    emoji: "📦",
    description: "Sản phẩm hoặc dịch vụ dùng để seeding trong nhóm.",
    placeholderValue: "Vd: CRM",
    placeholderName: "Vd: Phần mềm CRM",
    valueKey: "code",
    nameKey: "name",
    valueLabel: "Mã sản phẩm (code)",
    nameLabel: "Tên sản phẩm (name)",
  },
];

export function CategoryManagementContent() {
  const { platform } = useAppPlatform();
  const router = useRouter();
  const queryClient = useQueryClient();

  // State quản lý danh mục
  const [categories, setCategories] = useState<Record<string, Category[]>>({
    intent: [],
    industry: [],
    tier: [],
    team: [],
    icp: [],
    content_type: [],
    product_seeding: [],
  });

  const [selectedTab, setSelectedTab] = useState<CategoryType>("intent");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentMetadata = useMemo(() => {
    return CATEGORIES_METADATA.find((m) => m.key === selectedTab)!;
  }, [selectedTab]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalId, setModalId] = useState("");
  const [modalValue, setModalValue] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalPlatform, setModalPlatform] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAllowedPlatform = platform === "general";

  // Redirect if not General
  useEffect(() => {
    if (!isAllowedPlatform) {
      router.replace("/");
    }
  }, [platform, router, isAllowedPlatform]);

  // Fetch categories from backend (Supabase categories table)
  const fetchCategories = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [catRes, teamRes] = await Promise.all([
        allPlatformCategoriesService.getAll(),
        teamsService.getAll()
      ]);
      const list = catRes?.data ?? [];
      const teamsList = teamRes?.data ?? [];

      const grouped: Record<string, any[]> = {
        intent: [],
        industry: [],
        tier: [],
        team: [],
        icp: [],
        content_type: [],
        product_seeding: [],
      };

      list.forEach((item) => {
        if (grouped[item.category_type]) {
          grouped[item.category_type].push(item);
        }
      });

      // Backend trả enriched teams với leader_email + members array
      const teamMap = new Map<string, any>();
      teamsList.forEach((t: any) => {
        const key = `${t.name_team}_${t.id_leader}`;
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            id: t.id || key,
            category_type: "team",
            code: t.name_team,
            name: t.leader_email || "",
            platform: "general",
            members: Array.isArray(t.members) ? t.members.map((m: any) => typeof m === "string" ? m : m.email).filter(Boolean) : [],
            number_of_member: t.number_of_member || 0,
          });
        }
      });
      grouped.team = Array.from(teamMap.values());

      setCategories(grouped);
    } catch (err) {
      console.error("Lỗi khi tải danh mục:", err);
      setErrorMsg("Không thể tải danh sách danh mục từ máy chủ. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowedPlatform) {
      void fetchCategories();
    }
  }, [platform, isAllowedPlatform]);

  const filteredOptions = useMemo(() => {
    const options = categories[selectedTab] || [];
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    const { valueKey, nameKey } = currentMetadata;
    return options.filter((opt: any) => {
      const val = String(opt[valueKey] || "").toLowerCase();
      const name = String(opt[nameKey] || "").toLowerCase();
      return val.includes(term) || name.includes(term);
    });
  }, [categories, selectedTab, searchTerm, currentMetadata]);

  // Tính thống kê ở top
  const totalOptionsCount = useMemo(() => {
    return Object.values(categories).reduce((sum, list) => sum + list.length, 0);
  }, [categories]);

  // Hành động Add / Edit
  const handleOpenAddModal = () => {
    setModalMode("add");
    setModalId("");
    setModalValue("");
    setModalName("");
    setModalPlatform("all");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Category) => {
    setModalMode("edit");
    setModalId(item.id);
    const { valueKey, nameKey } = currentMetadata;
    setModalValue((item as any)[valueKey] || "");
    setModalName((item as any)[nameKey] || "");
    setModalPlatform(item.platform || "all");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = modalValue.trim();
    const name = modalName.trim();

    if (!val || !name) {
      setModalError(`Vui lòng nhập đầy đủ ${currentMetadata.valueLabel} và ${currentMetadata.nameLabel}.`);
      return;
    }

    // Validate Value format
    if (modalMode === "add" && (selectedTab === "intent" || selectedTab === "industry" || selectedTab === "tier")) {
      if (!/^[a-zA-Z0-9_\-\s\/.]+$/.test(val)) {
        setModalError("Giá trị chỉ chứa ký tự chữ, số, khoảng trắng, gạch ngang (-), gạch dưới (_) hoặc dấu gạch chéo (/).");
        return;
      }
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      if (modalMode === "add") {
        const res = await allPlatformCategoriesService.add({
          category_type: selectedTab,
          code: val,
          name: name,
          platform: modalPlatform,
        });
        if (res.success) {
          setIsModalOpen(false);
          await fetchCategories();
        } else {
          setModalError(res.message || "Thêm mới thất bại. Vui lòng kiểm tra lại.");
        }
      } else {
        const res = await allPlatformCategoriesService.update({
          id: modalId,
          category_type: selectedTab,
          code: val,
          name: name,
          platform: modalPlatform,
        } as any);
        if (res.success) {
          setIsModalOpen(false);
          await fetchCategories();
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        } else {
          setModalError(res.message || "Cập nhật thất bại. Vui lòng thử lại.");
        }
      }
    } catch (err) {
      console.error("Lỗi khi lưu danh mục:", err);
      setModalError("Lỗi hệ thống khi gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTeam = async (payload: any) => {
    if (payload.isEdit) {
      await teamsService.update(payload);
    } else {
      await teamsService.create(payload);
    }
    await fetchCategories();
  };

  const handleDeleteClick = (item: Category) => {
    setCategoryToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      if (selectedTab === "team") {
        const res = await teamsService.delete(categoryToDelete.code, categoryToDelete.name || "");
        if (res.success) {
          await fetchCategories();
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        } else {
          alert(res.message || "Lỗi khi xóa team");
        }
      } else {
        const res = await allPlatformCategoriesService.delete(categoryToDelete.id);
        if (res.success) {
          await fetchCategories();
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        } else {
          alert(res.message || "Lỗi khi xóa danh mục");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi xóa");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAllowedPlatform) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-md">
        <div className="border-primary h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-body-md font-medium text-on-surface-variant">
          Đang chuyển hướng về trang chủ…
        </p>
      </div>
    );
  }

  const getPlatformName = (pf?: string) => {
    if (!pf || pf === "all") return "Tổng hợp";
    if (pf === "facebook") return "Facebook";
    if (pf === "linkedin") return "LinkedIn";
    return pf;
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] min-w-0 space-y-6 font-sans">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <MaterialIcon name="category" className="text-primary text-3xl" />
        </div>
        <div>
          <h1 className="text-h1 text-on-background font-semibold flex items-center gap-2">
            Quản lý danh mục
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Cấu hình các bộ phân loại dùng chung cho nhóm Facebook và LinkedIn trong cơ sở dữ liệu Supabase
          </p>
        </div>
      </div>

      {/* ── STATS ROW ───────────────────────────────────────── */}
      <PlatformStatsRow>
        <PlatformStatCard
          label="Tổng loại danh mục"
          value={5}
          hint="Type, Industry, Tier, Team, ICP"
          accent="primary"
        />
        <PlatformStatCard
          label="Tổng số tùy chọn"
          value={totalOptionsCount}
          hint="Đã cấu hình trên toàn hệ thống"
          accent="success"
        />
        <PlatformStatCard
          label="Tùy chọn hiện tại"
          value={categories[selectedTab]?.length || 0}
          hint={`Trong mục "${currentMetadata.label}"`}
          accent="warning"
        />
        <PlatformStatCard
          label="Kênh đồng bộ"
          value="Supabase DB"
          hint="Đồng bộ trực tiếp qua categories hệ thống"
          accent="primary"
        />
      </PlatformStatsRow>

      {/* ── TABS SELECTOR ────────────────────────────────────── */}
      <div className="border-b border-slate-100 overflow-x-auto whitespace-nowrap">
        <div className="flex gap-8 px-2">
          {CATEGORIES_METADATA.map((meta) => {
            const isActive = selectedTab === meta.key;
            const count = categories[meta.key]?.length || 0;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => {
                  setSelectedTab(meta.key);
                  setSearchTerm("");
                }}
                className={cn(
                  "py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1.5",
                  isActive
                    ? "border-[#E3000F] text-[#E3000F]"
                    : "border-transparent text-slate-400 hover:text-[#E3000F]",
                )}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-black",
                  isActive ? "bg-[#E3000F]/10 text-[#E3000F]" : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CRUD CARD ──────────────────────────────────── */}
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
        {/* Description box */}
        <div className="bg-slate-50/75 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <MaterialIcon name="info" className="text-[#E3000F]" />
          <p className="text-slate-500 text-xs font-medium leading-normal">
            {currentMetadata.description}
          </p>
        </div>

        {/* Filter & Action bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:max-w-xs flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[20px] pointer-events-none select-none">
              search
            </span>
            <input
              type="text"
              placeholder={`Tìm kiếm ${currentMetadata.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#E3000F] hover:bg-[#C40009] text-white px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer"
          >
            <MaterialIcon name="add" className="text-base" />
            Thêm tùy chọn
          </button>
        </div>

        {/* Table representation */}
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{currentMetadata.valueLabel}</th>
                <th className="py-3 px-4">{currentMetadata.nameLabel}</th>
                <th className="py-3 px-4">Nền tảng</th>
                <th className="py-3 px-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 text-slate-600">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#E3000F] border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải danh sách danh mục...</span>
                    </div>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-red-600 font-medium">
                    {errorMsg}
                  </td>
                </tr>
              ) : filteredOptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                    Chưa có tùy chọn nào. Bấm nút "Thêm tùy chọn" để đăng ký mới.
                  </td>
                </tr>
              ) : (
                filteredOptions.map((item: Category) => {
                  const { valueKey, nameKey } = currentMetadata;
                  const itemVal = (item as any)[valueKey] || "";
                  const itemName = (item as any)[nameKey] || "";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-700">
                        {itemVal}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {itemName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase",
                          !item.platform || item.platform === "all"
                            ? "bg-slate-50 text-slate-500 border-slate-100"
                            : item.platform === "facebook"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-sky-50 text-sky-700 border-sky-100"
                        )}>
                          {getPlatformName(item.platform)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Sửa"
                          >
                            <MaterialIcon name="edit" className="text-base" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Xóa"
                          >
                            <MaterialIcon name="delete" className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DIALOG / MODAL FORM ──────────────────────────────── */}
      {isModalOpen && selectedTab === "team" && (
        <TeamModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTeam}
          editing={modalMode === "edit" ? { name_team: modalValue, leader_email: modalName, members: (categories.team.find(t => t.id === modalId) as any)?.members } : undefined}
        />
      )}

      {isModalOpen && selectedTab !== "team" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200">
          <div
            style={{ width: "100%", maxWidth: "448px" }}
            className="bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">
                {modalMode === "add" ? `Thêm ${currentMetadata.label}` : `Sửa ${currentMetadata.label}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Đóng"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveCategory(e)} className="p-6 space-y-4">
              {/* Platform dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nền tảng (Platform) <span className="text-error">*</span>
                </label>
                <select
                  value={modalPlatform}
                  onChange={(e) => setModalPlatform(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition cursor-pointer"
                >
                  <option value="all">Tổng hợp (Cả hai)</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              {/* Value / Key Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {currentMetadata.valueLabel} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder={currentMetadata.placeholderValue}
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  disabled={modalMode === "edit"}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {modalMode === "add" && (selectedTab === "intent" || selectedTab === "industry" || selectedTab === "tier") && (
                  <p className="text-[9px] text-slate-400 mt-1 italic">
                    Gồm chữ cái viết liền, số, dấu gạch ngang (-), gạch dưới (_) hoặc gạch chéo (/).
                  </p>
                )}
              </div>

              {/* Name / Display label Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {currentMetadata.nameLabel} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder={currentMetadata.placeholderName}
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  autoFocus
                />
              </div>

              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                  {modalError}
                </div>
              )}

              {/* Footer controls */}
              <div className="flex gap-3 pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl text-xs transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {modalMode === "add" ? "Thêm mới" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200">
          <div
            style={{ width: "100%", maxWidth: "448px" }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
          >
            <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-xl">⚠️</span> Xác nhận xóa
              </h3>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                disabled={isDeleting}
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 text-xs leading-relaxed">
                Bạn có chắc chắn muốn xóa danh mục{" "}
                <span className="font-semibold text-slate-900">
                  {categoryToDelete?.name}
                </span>{" "}
                không?
              </p>
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs leading-relaxed font-semibold">
                ⚠️ Cảnh báo: Việc xóa danh mục này sẽ đồng thời xóa các dữ liệu liên quan. Hành động này không thể hoàn tác.
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 flex justify-end gap-3 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <MaterialIcon name="sync" className="animate-spin text-sm" />
                    Đang xóa...
                  </>
                ) : (
                  "Xác nhận xóa"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
