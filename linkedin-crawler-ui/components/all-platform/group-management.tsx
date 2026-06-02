"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FaFacebook, FaLinkedin, FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { 
  allPlatformGroupsService, 
  allPlatformCategoriesService,
  teamsService,
  type TeamRow 
} from "@/services/all-platform.service";
import type { FacebookGroup, LinkedInGroup, FeedPlatform, Category } from "@/types/unified.types";

const PLATFORMS: { key: FeedPlatform; label: string; Icon: typeof FaFacebook }[] = [
  { key: "facebook", label: "Facebook Groups", Icon: FaFacebook },
  { key: "linkedin", label: "LinkedIn Groups", Icon: FaLinkedin },
];

// ── Searchable Dropdown Component ─────────────────────────────────────────────
interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: Category[];
  placeholder: string;
  required?: boolean;
  valueField?: "id" | "code";
}

function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  valueField = "id",
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const optionValue = useCallback(
    (o: Category) => {
      if (valueField === "code") return String(o.code ?? "");
      return String((o as any).id ?? "");
    },
    [valueField],
  );

  // Sync internal search input with current selected value's representation
  useEffect(() => {
    const match = options.find((o) => optionValue(o) === (value || ""));
    if (match) {
      setSearch(match.name || match.code || optionValue(match));
    } else {
      setSearch(value);
    }
    setIsTyping(false);
  }, [value, options, optionValue]);

  // Click outside to close dropdown and restore search value to matching label
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        const match = options.find((o) => optionValue(o) === (value || ""));
        if (match) {
          setSearch(match.name || match.code || optionValue(match));
        } else {
          setSearch(value);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options, optionValue]);

  const filteredOptions = isTyping
    ? options.filter(
        (o) =>
          (o.code || "").toLowerCase().includes(search.toLowerCase()) ||
          (o.name || "").toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  return (
    <div ref={containerRef} className="relative flex flex-col">
      <label className="text-xs font-bold text-[#666666] block mb-1">
        {label} {required && "*"}
      </label>
      <div className="relative">
        <input
          type="text"
          className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] pr-8 text-[#1A1A1A]"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setIsTyping(true);
            if (e.target.value === "") {
              onChange("");
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            setIsTyping(false);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setIsTyping(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] select-none pointer-events-none">
            {isOpen ? "arrow_drop_up" : "arrow_drop_down"}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-[#A0A0A0] text-center">Không tìm thấy danh mục</div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={String(opt.id || opt.code)}
                type="button"
                onClick={() => {
                  onChange(optionValue(opt));
                  setSearch(opt.name || opt.code || optionValue(opt));
                  setIsTyping(false);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F5F5F5] transition border-b border-[#E5E5E5] last:border-0 cursor-pointer ${
                  (value || "") === optionValue(opt)
                    ? "bg-[#E3000F]/10 font-bold text-[#E3000F]"
                    : "text-[#1A1A1A]"
                }`}
              >
                <div className="font-bold">{opt.name || opt.code}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Facebook Group Form ──────────────────────────────────────────────────────
interface FbGroupFormData {
  group_name: string;
  group_url: string;
  id_intent: string;
  id_industry: string;
  id_tier: string;
  id_team: string;
  id_icp: string;
  icp_desc: string;
  members: string;
  posts_per_week: string;
  health_score: string;
  chay_24h: boolean;
  crawl_time: string;
  crawl_frequency: string;
}

const FB_EMPTY_FORM: FbGroupFormData = {
  group_name: "",
  group_url: "",
  id_intent: "",
  id_industry: "",
  id_tier: "",
  id_team: "",
  id_icp: "",
  icp_desc: "",
  members: "",
  posts_per_week: "",
  health_score: "",
  chay_24h: false,
  crawl_time: "10:00",
  crawl_frequency: "daily",
};

function FacebookGroupForm({
  initial,
  onSubmit,
  onCancel,
  intentOptions,
  industryOptions,
  teamOptions,
  tierOptions,
  icpOptions,
}: {
  initial?: Partial<FbGroupFormData>;
  onSubmit: (data: Partial<FbGroupFormData>) => Promise<void>;
  onCancel: () => void;
  intentOptions: Category[];
  industryOptions: Category[];
  teamOptions: Category[];
  tierOptions: Category[];
  icpOptions: Category[];
}) {
  const [form, setForm] = useState<FbGroupFormData>({ ...FB_EMPTY_FORM, ...initial });
  const [busy, setBusy] = useState(false);

  const set = (key: keyof FbGroupFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.group_name.trim() || !form.group_url.trim()) return;

    // Validate that intent, industry, team, tier and icp are chosen from options (if selected)
    if (form.id_intent && !intentOptions.some((o) => String(o.id) === form.id_intent)) {
      alert("Vui lòng chọn Intent hợp lệ từ danh mục!");
      return;
    }
    if (form.id_industry && !industryOptions.some((o) => String(o.id) === form.id_industry)) {
      alert("Vui lòng chọn Industry hợp lệ từ danh sách!");
      return;
    }
    if (form.id_team && !teamOptions.some((o) => String(o.id) === form.id_team)) {
      alert("Vui lòng chọn Team hợp lệ từ danh sách!");
      return;
    }
    if (form.id_tier && !tierOptions.some((o) => String(o.id) === form.id_tier)) {
      alert("Vui lòng chọn Tier hợp lệ từ danh sách!");
      return;
    }
    if (form.id_icp && !icpOptions.some((o) => String(o.id) === form.id_icp)) {
      alert("Vui lòng chọn ICP Target hợp lệ từ danh sách!");
      return;
    }

    setBusy(true);
    try {
      await onSubmit(form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-[#666666] block mb-1">Tên nhóm *</label>
          <input
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
            value={form.group_name}
            onChange={(e) => set("group_name", e.target.value)}
            required
            placeholder="VD: IT Vietnam"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-[#666666] block mb-1">URL nhóm *</label>
          <input
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
            value={form.group_url}
            onChange={(e) => set("group_url", e.target.value)}
            required
            placeholder="https://facebook.com/groups/..."
          />
        </div>
        <div>
          <SearchableDropdown
            label="Intent"
            value={form.id_intent}
            onChange={(val) => set("id_intent", val)}
            options={intentOptions}
            placeholder="Tìm chọn Intent..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="Industry"
            value={form.id_industry}
            onChange={(val) => set("id_industry", val)}
            options={industryOptions}
            placeholder="Tìm chọn Industry..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="Tier"
            value={form.id_tier}
            onChange={(val) => set("id_tier", val)}
            options={tierOptions}
            placeholder="Tìm chọn Tier..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="Team"
            value={form.id_team}
            onChange={(val) => set("id_team", val)}
            options={teamOptions}
            placeholder="Tìm chọn Team..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="ICP Target"
            value={form.id_icp}
            onChange={(val) => set("id_icp", val)}
            options={icpOptions}
            placeholder="Tìm chọn ICP Target..."
            valueField="id"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#666666] block mb-1">Số thành viên</label>
          <input
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
            value={form.members}
            onChange={(e) => set("members", e.target.value)}
            placeholder="50000"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#666666] block mb-1">Posts/tuần</label>
          <input
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
            value={form.posts_per_week}
            onChange={(e) => set("posts_per_week", e.target.value)}
            placeholder="10"
          />
        </div>
        <div className="md:col-span-2 p-4 border border-[#E5E5E5] rounded-lg bg-[#F5F5F5]/50 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.chay_24h}
              onChange={(e) => set("chay_24h", e.target.checked)}
              className="w-4 h-4 rounded text-[#E3000F] border-[#E5E5E5] focus:ring-[#E3000F]"
            />
            <span className="text-sm font-bold text-[#1A1A1A]">Bật cào tự động 24h (Cronjob)</span>
          </label>
          
          {form.chay_24h && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs font-bold text-[#666666] block mb-1">Giờ chạy (HH:MM)</label>
                <input
                  type="time"
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
                  value={form.crawl_time}
                  onChange={(e) => set("crawl_time", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#666666] block mb-1">Tần suất</label>
                <select
                  className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A] bg-white"
                  value={form.crawl_frequency}
                  onChange={(e) => set("crawl_frequency", e.target.value)}
                >
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 border-t border-[#E5E5E5] pt-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] font-bold py-2 rounded-lg hover:bg-[#F5F5F5] text-sm transition cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-[#E3000F] text-white font-bold py-2 rounded-lg hover:bg-[#C40009] text-sm transition disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Đang lưu..." : initial?.group_name ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}

// ── LinkedIn Group Form ──────────────────────────────────────────────────────
interface LiGroupFormData {
  group_name: string;
  group_url: string;
  status: string;
  id_intent: string;
  id_industry: string;
  id_tier: string;
  id_team: string;
  id_icp: string;
}

const LI_EMPTY_FORM: LiGroupFormData = {
  group_name: "",
  group_url: "",
  status: "idle",
  id_intent: "",
  id_industry: "",
  id_tier: "",
  id_team: "",
  id_icp: "",
};

function LinkedInGroupForm({
  initial,
  onSubmit,
  onCancel,
  intentOptions,
  industryOptions,
  teamOptions,
  tierOptions,
  icpOptions,
}: {
  initial?: Partial<LiGroupFormData>;
  onSubmit: (data: Partial<LiGroupFormData>) => Promise<void>;
  onCancel: () => void;
  intentOptions: Category[];
  industryOptions: Category[];
  teamOptions: Category[];
  tierOptions: Category[];
  icpOptions: Category[];
}) {
  const [form, setForm] = useState<LiGroupFormData>({ ...LI_EMPTY_FORM, ...initial });
  const [busy, setBusy] = useState(false);

  const set = (key: keyof LiGroupFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.group_url.trim()) return;

    if (form.id_intent && !intentOptions.some((o) => String(o.id) === form.id_intent)) {
      alert("Vui lòng chọn Intent hợp lệ từ danh mục!");
      return;
    }
    if (form.id_industry && !industryOptions.some((o) => String(o.id) === form.id_industry)) {
      alert("Vui lòng chọn Industry hợp lệ từ danh sách!");
      return;
    }
    if (form.id_team && !teamOptions.some((o) => String(o.id) === form.id_team)) {
      alert("Vui lòng chọn Team hợp lệ từ danh sách!");
      return;
    }
    if (form.id_tier && !tierOptions.some((o) => String(o.id) === form.id_tier)) {
      alert("Vui lòng chọn Tier hợp lệ từ danh sách!");
      return;
    }
    if (form.id_icp && !icpOptions.some((o) => String(o.id) === form.id_icp)) {
      alert("Vui lòng chọn ICP Target hợp lệ từ danh sách!");
      return;
    }

    setBusy(true);
    try {
      await onSubmit(form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-[#666666] block mb-1">Tên nhóm</label>
          <input
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
            value={form.group_name}
            onChange={(e) => set("group_name", e.target.value)}
            placeholder="LinkedIn Group Name"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-[#666666] block mb-1">URL nhóm *</label>
          <input
            className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]"
            value={form.group_url}
            onChange={(e) => set("group_url", e.target.value)}
            required
            placeholder="https://linkedin.com/groups/..."
          />
        </div>

        <div>
          <SearchableDropdown
            label="Intent"
            value={form.id_intent}
            onChange={(val) => set("id_intent", val)}
            options={intentOptions}
            placeholder="Tìm chọn Intent..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="Industry"
            value={form.id_industry}
            onChange={(val) => set("id_industry", val)}
            options={industryOptions}
            placeholder="Tìm chọn Industry..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="Tier"
            value={form.id_tier}
            onChange={(val) => set("id_tier", val)}
            options={tierOptions}
            placeholder="Tìm chọn Tier..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="Team"
            value={form.id_team}
            onChange={(val) => set("id_team", val)}
            options={teamOptions}
            placeholder="Tìm chọn Team..."
            valueField="id"
          />
        </div>
        <div>
          <SearchableDropdown
            label="ICP Target"
            value={form.id_icp}
            onChange={(val) => set("id_icp", val)}
            options={icpOptions}
            placeholder="Tìm chọn ICP Target..."
            valueField="id"
          />
        </div>
      </div>
      <div className="flex gap-3 border-t border-[#E5E5E5] pt-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] font-bold py-2 rounded-lg hover:bg-[#F5F5F5] text-sm transition cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-[#E3000F] text-white font-bold py-2 rounded-lg hover:bg-[#C40009] text-sm transition disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Đang lưu..." : initial?.group_name ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function GroupManagementContent() {
  const [platform, setPlatform] = useState<FeedPlatform>("facebook");
  const [fbGroups, setFbGroups] = useState<FacebookGroup[]>([]);
  const [liGroups, setLiGroups] = useState<LinkedInGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamsData, setTeamsData] = useState<TeamRow[]>([]);

      const teamCategories: Category[] = useMemo(() => {
    const uniqueTeams: TeamRow[] = [];
    const seen = new Set<string>();
    teamsData.forEach((t) => {
      const id = String((t as any).id || "");
      if (!id) return;
      if (seen.has(id)) return;
      seen.add(id);
      uniqueTeams.push(t);
    });

    return uniqueTeams.map((t) =>
      ({
        id: String((t as any).id),
        category_type: "team",
        code: t.name_team || String((t as any).id),
        name: t.name_team || String((t as any).id),
      } as Category),
    );
  }, [teamsData]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FacebookGroup | LinkedInGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingGroupClassification, setViewingGroupClassification] = useState<FacebookGroup | LinkedInGroup | null>(null);
  const [deletingGroupItem, setDeletingGroupItem] = useState<FacebookGroup | LinkedInGroup | null>(null);

  // States bộ lọc
  const [intentFilter, setIntentFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [icpFilter, setIcpFilter] = useState("all");

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const [fbRes, liRes] = await Promise.all([
        allPlatformGroupsService.getAll("facebook"),
        allPlatformGroupsService.getAll("linkedin"),
      ]);
      if (fbRes.success && fbRes.data) setFbGroups(fbRes.data as FacebookGroup[]);
      if (liRes.success && liRes.data) setLiGroups(liRes.data as LinkedInGroup[]);
    } catch {
      setError("Không thể tải danh sách nhóm");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, teamRes] = await Promise.all([
        allPlatformCategoriesService.getAll(),
        teamsService.getAll()
      ]);
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
      if (teamRes.success && teamRes.data) {
        setTeamsData(teamRes.data);
      }
    } catch (e) {
      console.error("Lỗi khi tải danh mục:", e);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchCategories();
  }, [fetchGroups, fetchCategories]);

  // Mapping helper từ id hoặc code sang name danh mục
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      if (c.id) {
        map.set(String(c.id), c.name || c.code || String(c.id));
      }
      if (c.code) {
        map.set(String(c.code).toLowerCase(), c.name || c.code);
      }
    });
    return map;
  }, [categories]);

  const getCategoryName = useCallback((val: string | undefined | null) => {
    if (!val) return "—";
    // Prefer id lookup, fallback to code lookup
    return categoryNameMap.get(String(val)) || categoryNameMap.get(String(val).toLowerCase()) || val;
  }, [categoryNameMap]);

      const filteredFb = fbGroups.filter(
    (g) =>
      (!search ||
        g.group_name?.toLowerCase().includes(search.toLowerCase()) ||
        g.group_url?.toLowerCase().includes(search.toLowerCase())) &&
      (intentFilter === "all" || String((g as any).id_intent ?? "") === intentFilter) &&
      (industryFilter === "all" || String((g as any).id_industry ?? "") === industryFilter) &&
      (teamFilter === "all" || String((g as any).id_team ?? "") === teamFilter) &&
      (tierFilter === "all" || String((g as any).id_tier ?? "") === tierFilter) &&
      (icpFilter === "all" || String((g as any).id_icp ?? "") === icpFilter)
  );

  const filteredLi = liGroups.filter(
    (g) =>
      (!search ||
        g.group_name?.toLowerCase().includes(search.toLowerCase()) ||
        g.group_url?.toLowerCase().includes(search.toLowerCase())) &&
      (intentFilter === "all" || String((g as any).id_intent ?? "") === intentFilter) &&
      (industryFilter === "all" || String((g as any).id_industry ?? "") === industryFilter) &&
      (teamFilter === "all" || String((g as any).id_team ?? "") === teamFilter) &&
      (tierFilter === "all" || String((g as any).id_tier ?? "") === tierFilter) &&
      (icpFilter === "all" || String((g as any).id_icp ?? "") === icpFilter)
  );

  const handleDeleteGroup = async (id: string) => {
    const res = await allPlatformGroupsService.delete(id, platform);
    if (res.success) {
      await fetchGroups();
      setSuccess("Đã xóa nhóm và toàn bộ bài viết liên quan thành công");
    } else {
      setError(res.message || "Xóa thất bại");
    }
  };

  const handleFbSubmit = async (data: Partial<FbGroupFormData>) => {
    let res;
    const payload = {
      ...data,
      // ensure numeric fields are sent as numbers where backend expects
      members: data.members,
      posts_per_week: data.posts_per_week,
      health_score: data.health_score,
    };
    if (editingGroup) {
      res = await allPlatformGroupsService.update({ ...payload, id: editingGroup.id }, "facebook");
    } else {
      res = await allPlatformGroupsService.add(payload, "facebook");
    }
    if (res.success) {
      await fetchGroups();
      setShowAddForm(false);
      setEditingGroup(null);
      setSuccess(editingGroup ? "Đã cập nhật nhóm" : "Đã thêm nhóm");
    } else {
      setError(res.message || "Thao tác thất bại");
    }
  };

  const handleLiSubmit = async (data: Partial<LiGroupFormData>) => {
    let res;
    if (editingGroup) {
      res = await allPlatformGroupsService.update({ ...data, id: editingGroup.id }, "linkedin");
    } else {
      res = await allPlatformGroupsService.add(data, "linkedin");
    }
    if (res.success) {
      await fetchGroups();
      setShowAddForm(false);
      setEditingGroup(null);
      setSuccess(editingGroup ? "Đã cập nhật nhóm" : "Đã thêm nhóm");
    } else {
      setError(res.message || "Thao tác thất bại");
    }
  };

  const currentGroups = platform === "facebook" ? filteredFb : filteredLi;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Quản lý Groups</h2>
          <p className="text-sm text-[#A0A0A0]">Thêm, sửa, xóa nhóm Facebook & LinkedIn</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingGroup(null);
          }}
          className="flex items-center gap-2 bg-[#E3000F] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#C40009] transition shrink-0 cursor-pointer"
        >
          <FaPlus />
          Thêm nhóm
        </button>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2">
        {PLATFORMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => {
              setPlatform(key);
              setShowAddForm(false);
              setEditingGroup(null);
              setViewingGroupClassification(null);
              setSearch("");
              setIntentFilter("all");
              setIndustryFilter("all");
              setTeamFilter("all");
              setTierFilter("all");
              setIcpFilter("all");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
              platform === key
                ? "bg-[#E3000F]/10 text-[#E3000F] border border-[#E3000F]/20"
                : "bg-[#F5F5F5] text-[#666666] hover:bg-[#E5E5E5] hover:text-[#1A1A1A]"
            }`}
          >
            <Icon />
            {label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              platform === key ? "bg-[#E3000F]/20 text-[#E3000F]" : "bg-[#E5E5E5] text-[#666666]"
            }`}>
              {key === "facebook" ? fbGroups.length : liGroups.length}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-[#FF3344]/10 border border-[#FF3344]/20 text-[#FF3344] rounded-lg px-4 py-2 text-sm flex items-center justify-between animate-in fade-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#FF3344] hover:text-[#C40009] font-bold">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm flex items-center justify-between animate-in fade-in">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-[#F5F5F5]/50 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5E5E5] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
        <div className="relative min-w-[200px] flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] text-sm" />
          <input
            type="text"
            placeholder="Tìm kiếm nhóm theo tên hoặc URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[#333333] bg-[#FFFFFF] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-[#1A1A1A] outline-none transition shadow-sm"
          />
        </div>

        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          className="border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F5F5F5] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none transition cursor-pointer shadow-sm min-w-[130px]"
        >
          <option value="all">Tất cả Intent</option>
          {categories.filter(c => c.category_type === 'intent').map((opt) => (
            <option key={opt.id} value={String(opt.id)}>{opt.name || opt.code}</option>
          ))}
        </select>

        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F5F5F5] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none transition cursor-pointer shadow-sm min-w-[130px]"
        >
          <option value="all">Tất cả Industry</option>
          {categories.filter(c => c.category_type === 'industry').map((opt) => (
            <option key={opt.id} value={String(opt.id)}>{opt.name || opt.code}</option>
          ))}
        </select>

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F5F5F5] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none transition cursor-pointer shadow-sm min-w-[130px]"
        >
          <option value="all">Tất cả Team</option>
          {teamCategories.map((opt) => (
            <option key={String(opt.id)} value={String(opt.id)}>
              {opt.name || opt.code}
            </option>
          ))}
        </select>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F5F5F5] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none transition cursor-pointer shadow-sm min-w-[120px]"
        >
          <option value="all">Tất cả Tier</option>
          {categories.filter(c => c.category_type === 'tier').map((opt) => (
            <option key={opt.id} value={String(opt.id)}>{opt.name || opt.code}</option>
          ))}
        </select>

        <select
          value={icpFilter}
          onChange={(e) => setIcpFilter(e.target.value)}
          className="border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F5F5F5] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none transition cursor-pointer shadow-sm min-w-[130px]"
        >
          <option value="all">Tất cả ICP</option>
          {categories.filter(c => c.category_type === 'icp').map((opt) => (
            <option key={opt.id} value={String(opt.id)}>
              {opt.code} {opt.name ? `(${opt.name})` : ""}
            </option>
          ))}
        </select>

        {(search !== "" ||
          intentFilter !== "all" ||
          industryFilter !== "all" ||
          teamFilter !== "all" ||
          tierFilter !== "all" ||
          icpFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setIntentFilter("all");
                setIndustryFilter("all");
                setTeamFilter("all");
                setTierFilter("all");
                setIcpFilter("all");
              }}
              className="border border-[#FF3344]/20 hover:border-[#FF3344]/30 bg-[#FF3344]/5 hover:bg-[#FF3344]/10 hover:text-[#C40009] text-[#FF3344] flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
              title="Xóa tất cả bộ lọc"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Xóa lọc
            </button>
          )}
      </div>

      {/* Center Modal Dialog Overlay for Add / Edit */}
      {(showAddForm || editingGroup) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(1px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            setShowAddForm(false);
            setEditingGroup(null);
          }}
        >
          <div
            className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              width: "100%",
              maxWidth: "520px",
              minWidth: "300px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F5F5]/50">
              <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#E3000F]">
                  {editingGroup ? "edit_square" : "add_circle"}
                </span>
                {editingGroup
                  ? `Sửa nhóm ${platform === "facebook" ? "Facebook" : "LinkedIn"}`
                  : `Thêm nhóm ${platform === "facebook" ? "Facebook" : "LinkedIn"} mới`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGroup(null);
                }}
                className="text-[#666666] hover:text-[#1A1A1A] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              {platform === "facebook" ? (
                <FacebookGroupForm
                  intentOptions={categories.filter((c) => c.category_type === "intent")}
                  industryOptions={categories.filter((c) => c.category_type === "industry")}
                  teamOptions={teamCategories}
                  tierOptions={categories.filter((c) => c.category_type === "tier")}
                  icpOptions={categories.filter((c) => c.category_type === "icp").map(c => ({...c, name: `${c.code} ${c.name ? `(${c.name})` : ""}`.trim()}))}
                  initial={
                    editingGroup
                      ? {
                          group_name: (editingGroup as FacebookGroup).group_name,
                          group_url: (editingGroup as FacebookGroup).group_url,
                          id_intent: String((editingGroup as any).id_intent ?? ""),
                          id_industry: String((editingGroup as any).id_industry ?? ""),
                          id_tier: String((editingGroup as any).id_tier ?? ""),
                          id_team: String((editingGroup as any).id_team ?? ""),
                          id_icp: String((editingGroup as any).id_icp ?? ""),
                          icp_desc: (editingGroup as FacebookGroup).icp_desc || "",
                          members: (editingGroup as FacebookGroup).members !== undefined && (editingGroup as FacebookGroup).members !== null ? String((editingGroup as FacebookGroup).members) : "",
                          posts_per_week: (editingGroup as FacebookGroup).posts_per_week !== undefined && (editingGroup as FacebookGroup).posts_per_week !== null ? String((editingGroup as FacebookGroup).posts_per_week) : "",
                          chay_24h: (editingGroup as FacebookGroup).chay_24h || false,
                          crawl_time: (editingGroup as any).crawl_time ? String((editingGroup as any).crawl_time).substring(0, 5) : "10:00",
                          crawl_frequency: (editingGroup as any).crawl_frequency || "daily",
                        }
                      : undefined
                  }
                  onSubmit={handleFbSubmit}
                  onCancel={() => {
                    setShowAddForm(false);
                    setEditingGroup(null);
                  }}
                />
              ) : (
                <LinkedInGroupForm
                  intentOptions={categories.filter((c) => c.category_type === "intent")}
                  industryOptions={categories.filter((c) => c.category_type === "industry")}
                  teamOptions={teamCategories}
                  tierOptions={categories.filter((c) => c.category_type === "tier")}
                  icpOptions={categories.filter((c) => c.category_type === "icp").map(c => ({...c, name: `${c.code} ${c.name ? `(${c.name})` : ""}`.trim()}))}
                  initial={
                    editingGroup
                      ? {
                          group_name: (editingGroup as LinkedInGroup).group_name,
                          group_url: (editingGroup as LinkedInGroup).group_url,
                          status: (editingGroup as LinkedInGroup).status || "idle",
                          id_intent: String((editingGroup as any).id_intent ?? ""),
                          id_industry: String((editingGroup as any).id_industry ?? ""),
                          id_tier: String((editingGroup as any).id_tier ?? ""),
                          id_team: String((editingGroup as any).id_team ?? ""),
                          id_icp: String((editingGroup as any).id_icp ?? ""),
                        }
                      : undefined
                  }
                  onSubmit={handleLiSubmit}
                  onCancel={() => {
                    setShowAddForm(false);
                    setEditingGroup(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Groups table */}
      {loading ? (
        <div className="text-center py-16 text-[#666666]">Đang tải...</div>
      ) : currentGroups.length === 0 ? (
        <div className="text-center py-16 bg-[#F5F5F5]/50 rounded-xl border border-dashed border-[#E5E5E5]">
          <MaterialIcon name="group" className="text-4xl text-[#A0A0A0] mx-auto mb-2" />
          <p className="text-[#666666] text-sm">Chưa có nhóm nào</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 text-[#E3000F] text-sm font-bold hover:underline cursor-pointer"
          >
            + Thêm nhóm đầu tiên
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E5E5E5]">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider">
                  Tên nhóm
                </th>
                <th className="text-left px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider w-[120px]">
                  URL
                </th>
                <th className="text-left px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider w-[140px]">
                  Intent
                </th>
                <th className="text-left px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider">
                  Phân loại
                </th>
                <th className="text-right px-4 py-3 font-bold text-[#A0A0A0] text-xs uppercase tracking-wider w-[150px]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {currentGroups.map((g) => (
                <tr key={g.id} className="hover:bg-[#F5F5F5]/30 transition">
                  <td className="px-4 py-3 font-medium text-[#1A1A1A] max-w-[220px] truncate">
                    {platform === "facebook" ? (
                      g.group_name || "—"
                    ) : (
                      <div>
                        <div className="font-semibold text-[#1A1A1A]">{g.group_name || "—"}</div>
                        <div className="text-[10px] text-[#666666] mt-0.5 flex gap-2 items-center">
                          <span className={`font-black px-1.5 py-0.5 rounded text-[9px] uppercase ${
                            (g as LinkedInGroup).status === "success"
                              ? "bg-green-100 text-green-700"
                              : (g as LinkedInGroup).status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {(g as LinkedInGroup).status || "idle"}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={g.group_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-[#E3000F]/10 text-[#E3000F] hover:bg-[#E3000F]/20 px-2.5 py-1 rounded-lg text-xs font-bold transition border border-[#E3000F]/20 active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Xem nhóm
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {g.intent_name ? (
                      <span className="bg-transparent text-[#E3000F] border-none px-2 py-0.5 rounded text-xs font-bold">
                        {g.intent_name}
                      </span>
                    ) : (
                      <span className="text-[#666666] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewingGroupClassification(g)}
                      className="inline-flex items-center gap-1.5 bg-[#E3000F]/10 text-[#E3000F] hover:bg-[#E3000F]/20 hover:text-[#C40009] px-3 py-1.5 rounded-lg text-xs font-bold transition border border-[#E3000F]/20 shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] text-[#E3000F]">visibility</span>
                      Xem phân loại
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditingGroup(g);
                        setShowAddForm(false);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[#666666] hover:text-[#E3000F] transition text-xs font-bold cursor-pointer"
                    >
                      <FaEdit size={12} /> Sửa
                    </button>
                    <button
                      onClick={() => setDeletingGroupItem(g)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[#666666] hover:text-[#FF3344] transition text-xs font-bold ml-2 cursor-pointer"
                    >
                      <FaTrash size={12} /> Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal xem phân loại */}
      {viewingGroupClassification && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(1px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setViewingGroupClassification(null)}
        >
          <div
            className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              width: "100%",
              maxWidth: "460px",
              minWidth: "300px",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F5F5]/50">
              <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#E3000F]">
                  info
                </span>
                Chi tiết phân loại nhóm
              </h3>
              <button
                type="button"
                onClick={() => setViewingGroupClassification(null)}
                className="text-[#666666] hover:text-[#1A1A1A] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Tên nhóm</span>
                <span className="text-sm font-bold text-[#1A1A1A] break-all">{viewingGroupClassification.group_name || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-[#E5E5E5] pt-4">
                <div>
                  <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Intent</span>
                  <span className="inline-flex bg-[#E3000F]/10 text-[#E3000F] border border-[#E3000F]/20 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).intent_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Team</span>
                  <span className="inline-flex bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).team_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Ngành (Industry)</span>
                  <span className="inline-flex bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).industry_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">ICP Target</span>
                  <span className="inline-flex bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).icp_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Tier</span>
                  <span className="inline-flex bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).tier_name || "—"}
                  </span>
                </div>
                {platform === "facebook" ? (
                  <>
                  <div>
                    <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Chạy 24h</span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold border ${(viewingGroupClassification as FacebookGroup).chay_24h ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-[#F5F5F5] text-[#666666] border-[#E5E5E5]"}`}>
                      {(viewingGroupClassification as FacebookGroup).chay_24h ? "Có (⚡ Tự động)" : "Không"}
                    </span>
                  </div>
                  {(viewingGroupClassification as FacebookGroup).chay_24h && (
                    <>
                      <div>
                        <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Giờ chạy</span>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          {String((viewingGroupClassification as any).crawl_time || "—").substring(0, 5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Tần suất</span>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          {(viewingGroupClassification as any).crawl_frequency === "weekly" ? "Hàng tuần" : "Hàng ngày"}
                        </span>
                      </div>
                    </>
                  )}
                  </>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-1">Trạng thái</span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${(viewingGroupClassification as LinkedInGroup).status === "success" ? "bg-green-100 text-green-700" : (viewingGroupClassification as LinkedInGroup).status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {(viewingGroupClassification as LinkedInGroup).status || "idle"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-[#E5E5E5] px-6 py-4 bg-[#F5F5F5]/50 justify-end">
              <button
                type="button"
                onClick={() => setViewingGroupClassification(null)}
                className="bg-[#FFFFFF] border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] font-bold px-5 py-2 rounded-xl hover:bg-[#F5F5F5] text-sm transition shadow-sm active:scale-95 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deletingGroupItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(1px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setDeletingGroupItem(null)}
        >
          <div
            className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              width: "100%",
              maxWidth: "440px",
              minWidth: "300px",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#FF3344]/5">
              <h3 className="text-sm font-bold text-[#FF3344] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#FF3344]">
                  warning
                </span>
                Xác nhận xóa nhóm
              </h3>
              <button
                type="button"
                onClick={() => setDeletingGroupItem(null)}
                className="text-[#666666] hover:text-[#1A1A1A] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3">
              <p className="text-sm text-[#666666] leading-relaxed">
                Bạn có chắc chắn muốn xóa nhóm <strong className="text-[#1A1A1A] font-bold">{deletingGroupItem.group_name || "—"}</strong>?
              </p>
              <div className="bg-[#FF3344]/10 border border-[#FF3344]/20 rounded-xl p-3 flex gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF3344] shrink-0 select-none">
                  info
                </span>
                <span className="text-xs text-[#FF3344] leading-normal">
                  <strong>Chú ý:</strong> Hành động này sẽ xóa vĩnh viễn nhóm này cùng với <strong>tất cả các bài viết</strong> thuộc nhóm này trong hệ thống. Thao tác này không thể hoàn tác!
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-[#E5E5E5] px-6 py-4 bg-[#F5F5F5]/50 justify-end">
              <button
                type="button"
                onClick={() => setDeletingGroupItem(null)}
                className="bg-[#FFFFFF] border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] font-bold px-4 py-2 rounded-xl hover:bg-[#F5F5F5] text-xs transition shadow-sm active:scale-95 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = deletingGroupItem.id;
                  setDeletingGroupItem(null);
                  await handleDeleteGroup(targetId);
                }}
                className="bg-[#FF3344] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#C40009] text-xs transition shadow-sm active:scale-95 cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
