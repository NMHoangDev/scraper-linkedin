"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { FaFacebook, FaLinkedin, FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { 
  allPlatformGroupsService, 
  allPlatformCategoriesService,
  teamsService,
  usersService,
  type AppUserProfile,
  type TeamRow 
} from "@/services/all-platform.service";
import type { FacebookGroup, LinkedInGroup, FeedPlatform, Category } from "@/types/unified.types";

const PLATFORMS: { key: FeedPlatform; label: string; Icon: typeof FaFacebook }[] = [
  { key: "facebook", label: "Facebook Groups", Icon: FaFacebook },
  { key: "linkedin", label: "LinkedIn Groups", Icon: FaLinkedin },
];

// â”€â”€ Searchable Dropdown Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] pr-8 text-slate-900"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] hover:text-slate-900 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] select-none pointer-events-none">
            {isOpen ? "arrow_drop_up" : "arrow_drop_down"}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full z-[60] left-0 right-0 mt-1 bg-white border border-[#E5E5E5] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">KhÃ´ng tÃ¬m tháº¥y danh má»¥c</div>
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
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F5F5F5] transition border-b border-slate-100 last:border-0 cursor-pointer ${
                  (value || "") === optionValue(opt)
                    ? "bg-[#E3000F]/10 font-bold text-[#E3000F]"
                    : "text-slate-900"
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

// â”€â”€ Facebook Group Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface FbGroupFormData {
  id_member?: string;
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
  id_content_type: string;
  id_product_seeding: string;
  end_time_24h: string;
  start_time_in_day: string;
  end_time_in_day: string;
  time_crawl: string;
  end_date_hour: string;
  note: string;
  risk_note: string;
  assignee_id: string;
  co_assignee_id: string;
}

const FB_EMPTY_FORM: FbGroupFormData = {
  id_member: "",
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
  id_content_type: "",
  id_product_seeding: "",
  end_time_24h: "",
  start_time_in_day: "",
  end_time_in_day: "",
  time_crawl: "",
  end_date_hour: "",
  note: "",
  risk_note: "",
  assignee_id: "",
  co_assignee_id: "",
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
  contentTypeOptions,
  productSeedingOptions,
  userOptions,
}: {
  initial?: Partial<FbGroupFormData>;
  onSubmit: (data: Partial<FbGroupFormData>) => Promise<void>;
  onCancel: () => void;
  intentOptions: Category[];
  industryOptions: Category[];
  teamOptions: Category[];
  tierOptions: Category[];
  icpOptions: Category[];
  contentTypeOptions: Category[];
  productSeedingOptions: Category[];
  userOptions: Category[];
}) {
  const { user } = useAppAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<FbGroupFormData>({ ...FB_EMPTY_FORM, ...initial });
  const [busy, setBusy] = useState(false);

  const set = (key: keyof FbGroupFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.group_name.trim() || !form.group_url.trim()) return;

    // Validate that intent, industry, team, tier and icp are chosen from options (if selected)
    if (form.id_intent && !intentOptions.some((o) => String(o.id) === form.id_intent)) {
      alert("Vui lÃ²ng chá»n LÄ©nh vá»±c há»£p lá»‡ tá»« danh má»¥c!");
      return;
    }
    if (form.id_industry && !industryOptions.some((o) => String(o.id) === form.id_industry)) {
      alert("Vui lÃ²ng chá»n Industry há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }
    if (form.id_team && !teamOptions.some((o) => String(o.id) === form.id_team)) {
      alert("Vui lÃ²ng chá»n Team há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }
    if (form.id_tier && !tierOptions.some((o) => String(o.id) === form.id_tier)) {
      alert("Vui lÃ²ng chá»n Tier há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }
    if (form.id_icp && !icpOptions.some((o) => String(o.id) === form.id_icp)) {
      alert("Vui lÃ²ng chá»n ICP Target há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }

    setBusy(true);
    try {
      // Validate 24h crawl config
      if (form.chay_24h) {
        if (!form.start_time_in_day && form.start_time_in_day !== "0") {
          alert("Vui lÃ²ng nháº­p Giá» báº¯t Ä‘áº§u trong ngÃ y!");
          setBusy(false);
          return;
        }
        if (!form.end_time_in_day && form.end_time_in_day !== "0") {
          alert("Vui lÃ²ng nháº­p Giá» káº¿t thÃºc trong ngÃ y!");
          setBusy(false);
          return;
        }
        if (Number(form.start_time_in_day) >= Number(form.end_time_in_day)) {
          alert("Giá» báº¯t Ä‘áº§u pháº£i nhá» hÆ¡n giá» káº¿t thÃºc!");
          setBusy(false);
          return;
        }
        if (!form.time_crawl) {
          alert("Vui lÃ²ng chá»n Khoáº£ng cÃ¡ch cÃ o!");
          setBusy(false);
          return;
        }
      }
      await onSubmit(form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SECTION 1: ThÃ´ng tin nhÃ³m */}
      <div>
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="info" className="text-sm text-slate-400" /> ThÃ´ng Tin NhÃ³m</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">TÃªn nhÃ³m *</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
              value={form.group_name}
              onChange={(e) => set("group_name", e.target.value)}
              required
              placeholder="VD: IT Vietnam"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">URL nhÃ³m *</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
              value={form.group_url}
              onChange={(e) => set("group_url", e.target.value)}
              required
              placeholder="https://facebook.com/groups/..."
            />
          </div>
          <div>
            <SearchableDropdown
              label="LÄ¨NH Vá»°C"
              value={form.id_intent}
              onChange={(val) => set("id_intent", val)}
              options={intentOptions}
              placeholder="TÃ¬m chá»n LÄ©nh vá»±c..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="INDUSTRY"
              value={form.id_industry}
              onChange={(val) => set("id_industry", val)}
              options={industryOptions}
              placeholder="TÃ¬m chá»n Industry..."
              valueField="id"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sá»‘ thÃ nh viÃªn</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
              value={form.members}
              onChange={(e) => set("members", e.target.value)}
              placeholder="50000"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Posts/tuáº§n</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
              value={form.posts_per_week}
              onChange={(e) => set("posts_per_week", e.target.value)}
              placeholder="10"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: PhÃ¢n quyá»n & Äá»‹nh vá»‹ */}
      <div className="pt-5 border-t border-slate-100">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="tune" className="text-sm text-slate-400" /> PhÃ¢n Quyá»n & Äá»‹nh Vá»‹</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableDropdown
              label="TIER"
              value={form.id_tier}
              onChange={(val) => set("id_tier", val)}
              options={tierOptions}
              placeholder="TÃ¬m chá»n Tier..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="TEAM"
              value={form.id_team}
              onChange={(val) => set("id_team", val)}
              options={teamOptions}
              placeholder="TÃ¬m chá»n Team..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="ICP TARGET"
              value={form.id_icp}
              onChange={(val) => set("id_icp", val)}
              options={icpOptions}
              placeholder="TÃ¬m chá»n ICP Target..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="LOáº I Ná»˜I DUNG"
              value={form.id_content_type}
              onChange={(val) => set("id_content_type", val)}
              options={contentTypeOptions}
              placeholder="TÃ¬m chá»n Loáº¡i ná»™i dung..."
              valueField="id"
            />
          </div>
          <div className="md:col-span-2">
            <SearchableDropdown
              label="Sáº¢N PHáº¨M SEEDING"
              value={form.id_product_seeding}
              onChange={(val) => set("id_product_seeding", val)}
              options={productSeedingOptions}
              placeholder="TÃ¬m chá»n SP Seeding..."
              valueField="id"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: NhÃ¢n sá»± phá»¥ trÃ¡ch */}
      <div className="pt-5 border-t border-slate-100">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="group" className="text-sm text-slate-400" /> NhÃ¢n Sá»± Phá»¥ TrÃ¡ch</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableDropdown
              label="NGÆ¯á»œI PHá»¤ TRÃCH CHÃNH"
              value={form.assignee_id}
              onChange={(val) => set("assignee_id", val)}
              options={userOptions}
              placeholder="TÃ¬m theo tÃªn/email..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="Äá»’NG PHá»¤ TRÃCH"
              value={form.co_assignee_id}
              onChange={(val) => set("co_assignee_id", val)}
              options={userOptions}
              placeholder="TÃ¬m theo tÃªn/email..."
              valueField="id"
            />
          </div>
          {isAdmin && (
            <div className="md:col-span-2">
              <SearchableDropdown
                label="THÃ€NH VIÃŠN Sá»ž Há»®U *"
                value={form.id_member || ""}
                onChange={(val) => set("id_member", val)}
                options={userOptions}
                placeholder="TÃ¬m theo tÃªn/email..."
                valueField="id"
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Ghi chÃº & Tá»± Ä‘á»™ng hÃ³a */}
      <div className="pt-5 border-t border-slate-100">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="edit" className="text-sm text-slate-400" /> Ghi ChÃº & Tá»± Äá»™ng HÃ³a</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GHI CHÃš Rá»¦I RO</label>
            <textarea
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900 resize-y min-h-[60px]"
              value={form.risk_note}
              onChange={(e) => set("risk_note", e.target.value)}
              placeholder="Nháº­p cáº£nh bÃ¡o/rá»§i ro náº¿u cÃ³..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GHI CHÃš CHUNG</label>
            <textarea
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900 resize-y min-h-[80px]"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Nháº­p ghi chÃº chung..."
            />
          </div>
          
          <div className="md:col-span-2 p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.chay_24h}
                onChange={(e) => set("chay_24h", e.target.checked)}
                className="w-4 h-4 rounded text-[#E3000F] border-slate-200 focus:ring-[#E3000F]"
              />
              <span className="text-xs font-bold text-slate-900 uppercase">Báº¬T CÃ€O Tá»° Äá»˜NG 24H (CRONJOB)</span>
            </label>
            
            {form.chay_24h && (
              <div className="space-y-3 pt-2">
                <div className="text-[11px] text-slate-500 bg-white border border-slate-100 rounded-xl px-3 py-2 leading-relaxed">
                  âš¡ <b>CÃ¡ch hoáº¡t Ä‘á»™ng:</b> Má»—i phÃºt scheduler sáº½ kiá»ƒm tra â€” náº¿u thá»i Ä‘iá»ƒm hiá»‡n táº¡i náº±m trong khung giá» vÃ  chia háº¿t cho khoáº£ng cÃ¡ch cÃ o (theo phÃºt) thÃ¬ sáº½ cÃ o nhÃ³m nÃ y.
                  <br/>VÃ­ dá»¥: Khung giá» <b>7hâ€“22h</b>, khoáº£ng cÃ¡ch <b>60 phÃºt</b> â†’ cÃ o vÃ o 7:00, 8:00, 9:00... cho Ä‘áº¿n 22:00.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Giá» báº¯t Ä‘áº§u trong ngÃ y <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
                      value={form.start_time_in_day}
                      onChange={(e) => set("start_time_in_day", e.target.value)}
                      placeholder="VD: 7 (7 giá» sÃ¡ng)"
                      required={form.chay_24h}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Giá» káº¿t thÃºc trong ngÃ y <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
                      value={form.end_time_in_day}
                      onChange={(e) => set("end_time_in_day", e.target.value)}
                      placeholder="VD: 22 (10 giá» tá»‘i)"
                      required={form.chay_24h}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Khoáº£ng cÃ¡ch cÃ o (phÃºt) <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
                      value={form.time_crawl}
                      onChange={(e) => set("time_crawl", e.target.value)}
                      required={form.chay_24h}
                    >
                      <option value="">-- Chá»n khoáº£ng cÃ¡ch --</option>
                      <option value="30">30 phÃºt</option>
                      <option value="60">1 tiáº¿ng (60 phÃºt)</option>
                      <option value="120">2 tiáº¿ng (120 phÃºt)</option>
                      <option value="180">3 tiáº¿ng (180 phÃºt)</option>
                      <option value="240">4 tiáº¿ng (240 phÃºt)</option>
                      <option value="300">5 tiáº¿ng (300 phÃºt)</option>
                      <option value="360">6 tiáº¿ng (360 phÃºt)</option>
                      <option value="480">8 tiáº¿ng (480 phÃºt)</option>
                      <option value="720">12 tiáº¿ng (720 phÃºt)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      NgÃ y káº¿t thÃºc
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
                      value={form.end_date_hour}
                      onChange={(e) => set("end_date_hour", e.target.value)}
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Äá»ƒ trá»‘ng = khÃ´ng giá»›i háº¡n</p>
                  </div>
                </div>
                {form.start_time_in_day && form.end_time_in_day && Number(form.start_time_in_day) >= Number(form.end_time_in_day) && (
                  <p className="text-xs text-red-500 font-bold">âš ï¸ Giá» báº¯t Ä‘áº§u pháº£i nhá» hÆ¡n giá» káº¿t thÃºc!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t border-slate-100 pt-5 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 font-bold py-2 rounded-xl text-xs transition cursor-pointer hover:bg-slate-50 shadow-sm"
        >
          Há»§y Bá»
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-[#DC2626] text-white font-bold py-2 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer hover:bg-[#B91C1C] shadow-sm flex justify-center items-center gap-1.5"
        >
          {busy ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <MaterialIcon name={initial?.group_name ? "check" : "add"} className="text-base" />
          )}
          {busy ? "ÄANG LÆ¯U..." : initial?.group_name ? "Cáº¬P NHáº¬T" : "THÃŠM Má»šI"}
        </button>
      </div>
    </form>
  );
}

// â”€â”€ LinkedIn Group Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface LiGroupFormData {
  id_member?: string;
  group_name: string;
  group_url: string;
  status: string;
  id_intent: string;
  id_industry: string;
  id_tier: string;
  id_team: string;
  id_icp: string;
  id_content_type: string;
  id_product_seeding: string;
  note: string;
  risk_note: string;
  assignee_id: string;
  co_assignee_id: string;
}

const LI_EMPTY_FORM: LiGroupFormData = {
  id_member: "",
  group_name: "",
  group_url: "",
  status: "idle",
  id_intent: "",
  id_industry: "",
  id_tier: "",
  id_team: "",
  id_icp: "",
  id_content_type: "",
  id_product_seeding: "",
  note: "",
  risk_note: "",
  assignee_id: "",
  co_assignee_id: "",
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
  contentTypeOptions,
  productSeedingOptions,
  userOptions,
}: {
  initial?: Partial<LiGroupFormData>;
  onSubmit: (data: Partial<LiGroupFormData>) => Promise<void>;
  onCancel: () => void;
  intentOptions: Category[];
  industryOptions: Category[];
  teamOptions: Category[];
  tierOptions: Category[];
  icpOptions: Category[];
  contentTypeOptions: Category[];
  productSeedingOptions: Category[];
  userOptions: Category[];
}) {
  const { user } = useAppAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<LiGroupFormData>({ ...LI_EMPTY_FORM, ...initial });
  const [busy, setBusy] = useState(false);

  const set = (key: keyof LiGroupFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.group_url.trim()) return;

    if (form.id_intent && !intentOptions.some((o) => String(o.id) === form.id_intent)) {
      alert("Vui lÃ²ng chá»n LÄ©nh vá»±c há»£p lá»‡ tá»« danh má»¥c!");
      return;
    }
    if (form.id_industry && !industryOptions.some((o) => String(o.id) === form.id_industry)) {
      alert("Vui lÃ²ng chá»n Industry há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }
    if (form.id_team && !teamOptions.some((o) => String(o.id) === form.id_team)) {
      alert("Vui lÃ²ng chá»n Team há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }
    if (form.id_tier && !tierOptions.some((o) => String(o.id) === form.id_tier)) {
      alert("Vui lÃ²ng chá»n Tier há»£p lá»‡ tá»« danh sÃ¡ch!");
      return;
    }
    if (form.id_icp && !icpOptions.some((o) => String(o.id) === form.id_icp)) {
      alert("Vui lÃ²ng chá»n ICP Target há»£p lá»‡ tá»« danh sÃ¡ch!");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SECTION 1: ThÃ´ng tin nhÃ³m */}
      <div>
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="info" className="text-sm text-slate-400" /> ThÃ´ng Tin NhÃ³m</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">TÃªn nhÃ³m</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
              value={form.group_name}
              onChange={(e) => set("group_name", e.target.value)}
              placeholder="LinkedIn Group Name"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">URL nhÃ³m *</label>
            <input
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900"
              value={form.group_url}
              onChange={(e) => set("group_url", e.target.value)}
              required
              placeholder="https://linkedin.com/groups/..."
            />
          </div>
          <div>
            <SearchableDropdown
              label="LÄ¨NH Vá»°C"
              value={form.id_intent}
              onChange={(val) => set("id_intent", val)}
              options={intentOptions}
              placeholder="TÃ¬m chá»n LÄ©nh vá»±c..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="INDUSTRY"
              value={form.id_industry}
              onChange={(val) => set("id_industry", val)}
              options={industryOptions}
              placeholder="TÃ¬m chá»n Industry..."
              valueField="id"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: PhÃ¢n quyá»n & Äá»‹nh vá»‹ */}
      <div className="pt-5 border-t border-slate-100">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="tune" className="text-sm text-slate-400" /> PhÃ¢n Quyá»n & Äá»‹nh Vá»‹</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableDropdown
              label="TIER"
              value={form.id_tier}
              onChange={(val) => set("id_tier", val)}
              options={tierOptions}
              placeholder="TÃ¬m chá»n Tier..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="TEAM"
              value={form.id_team}
              onChange={(val) => set("id_team", val)}
              options={teamOptions}
              placeholder="TÃ¬m chá»n Team..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="ICP TARGET"
              value={form.id_icp}
              onChange={(val) => set("id_icp", val)}
              options={icpOptions}
              placeholder="TÃ¬m chá»n ICP Target..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="LOáº I Ná»˜I DUNG"
              value={form.id_content_type}
              onChange={(val) => set("id_content_type", val)}
              options={contentTypeOptions}
              placeholder="TÃ¬m chá»n Loáº¡i ná»™i dung..."
              valueField="id"
            />
          </div>
          <div className="md:col-span-2">
            <SearchableDropdown
              label="Sáº¢N PHáº¨M SEEDING"
              value={form.id_product_seeding}
              onChange={(val) => set("id_product_seeding", val)}
              options={productSeedingOptions}
              placeholder="TÃ¬m chá»n SP Seeding..."
              valueField="id"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: NhÃ¢n sá»± phá»¥ trÃ¡ch */}
      <div className="pt-5 border-t border-slate-100">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="group" className="text-sm text-slate-400" /> NhÃ¢n Sá»± Phá»¥ TrÃ¡ch</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableDropdown
              label="NGÆ¯á»œI PHá»¤ TRÃCH CHÃNH"
              value={form.assignee_id}
              onChange={(val) => set("assignee_id", val)}
              options={userOptions}
              placeholder="TÃ¬m theo tÃªn/email..."
              valueField="id"
            />
          </div>
          <div>
            <SearchableDropdown
              label="Äá»’NG PHá»¤ TRÃCH"
              value={form.co_assignee_id}
              onChange={(val) => set("co_assignee_id", val)}
              options={userOptions}
              placeholder="TÃ¬m theo tÃªn/email..."
              valueField="id"
            />
          </div>
          {isAdmin && (
            <div className="md:col-span-2">
              <SearchableDropdown
                label="THÃ€NH VIÃŠN Sá»ž Há»®U *"
                value={form.id_member || ""}
                onChange={(val) => set("id_member", val)}
                options={userOptions}
                placeholder="TÃ¬m theo tÃªn/email..."
                valueField="id"
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Ghi chÃº & Tá»± Ä‘á»™ng hÃ³a */}
      <div className="pt-5 border-t border-slate-100">
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MaterialIcon name="edit" className="text-sm text-slate-400" /> Ghi ChÃº & Tá»± Äá»™ng HÃ³a</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GHI CHÃš Rá»¦I RO</label>
            <textarea
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900 resize-y min-h-[60px]"
              value={form.risk_note}
              onChange={(e) => set("risk_note", e.target.value)}
              placeholder="Nháº­p cáº£nh bÃ¡o/rá»§i ro náº¿u cÃ³..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GHI CHÃš CHUNG</label>
            <textarea
              className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900 resize-y min-h-[80px]"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Nháº­p ghi chÃº chung..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t border-slate-100 pt-5 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 font-bold py-2 rounded-xl text-xs transition cursor-pointer hover:bg-slate-50 shadow-sm"
        >
          Há»§y Bá»
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-[#DC2626] text-white font-bold py-2 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer hover:bg-[#B91C1C] shadow-sm flex justify-center items-center gap-1.5"
        >
          {busy ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <MaterialIcon name={initial?.group_name ? "check" : "add"} className="text-base" />
          )}
          {busy ? "ÄANG LÆ¯U..." : initial?.group_name ? "Cáº¬P NHáº¬T" : "THÃŠM Má»šI"}
        </button>
      </div>
    </form>
  );
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function GroupManagementContent() {
  const { user } = useAppAuth();
  const isAdmin = user?.role === "admin";
  const isLeader = user?.role === "leader";

  const [platform, setPlatform] = useState<FeedPlatform>("facebook");
  const [fbGroups, setFbGroups] = useState<FacebookGroup[]>([]);
  const [liGroups, setLiGroups] = useState<LinkedInGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamsData, setTeamsData] = useState<TeamRow[]>([]);
  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);

  const myTeams = useMemo(() => {
    if (!user || user.role !== "leader") return [];
    return teamsData.filter(t => String(t.id_leader) === String(user.id));
  }, [teamsData, user]);

  const myTeamMemberIds = useMemo(() => {
    const ids = new Set<string>();
    myTeams.forEach(t => {
      t.members?.forEach(m => {
        if (m.id) ids.add(String(m.id));
      });
    });
    return ids;
  }, [myTeams]);

  const userOptions: Category[] = useMemo(() => {
    return allUsers.map(u => ({
      id: u.id,
      name: (u as any).full_name || (u as any).name || u.email,
      code: u.email,
      category_type: "user",
      platform: "all"
    } as unknown as Category));
  }, [allUsers]);

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
  
  // States bá»™ lá»c
  const [intentFilter, setIntentFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [icpFilter, setIcpFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [productSeedingFilter, setProductSeedingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const pageSize = 10;

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
      setError("KhÃ´ng thá»ƒ táº£i danh sÃ¡ch nhÃ³m");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, teamRes, userRes] = await Promise.all([
        allPlatformCategoriesService.getAll(),
        teamsService.getAll(),
        usersService.getAllProfiles()
      ]);
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
      if (teamRes.success && teamRes.data) {
        setTeamsData(teamRes.data);
      }
      if (userRes.success && userRes.data) {
        setAllUsers(userRes.data);
      }
    } catch (e) {
      console.error("Lá»—i khi táº£i danh má»¥c:", e);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchCategories();
  }, [fetchGroups, fetchCategories]);

  // Local filtering...
  const getUserName = useCallback((id: string | null | undefined) => {
    if (!id) return "â€”";
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user) return "â€”";
    return (user as any).full_name || (user as any).name || user.email;
  }, [allUsers]);

  const getTeamName = useCallback((id: string | null | undefined) => {
    if (!id) return "â€”";
    const team = teamsData.find(t => String((t as any).id) === String(id));
    if (!team) return "â€”";
    return team.name_team || "â€”";
  }, [teamsData]);

  const getUserTeamName = useCallback((idMember: string | null | undefined) => {
    if (!idMember) return "â€”";
    const team = teamsData.find(t => t.members?.some(m => String(m.id) === String(idMember)));
    if (!team) return "â€”";
    return team.name_team || "â€”";
  }, [teamsData]);

  // Mapping helper tá»« id hoáº·c code sang name danh má»¥c
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
    if (!val) return "â€”";
    // Prefer id lookup, fallback to code lookup
    return categoryNameMap.get(String(val)) || categoryNameMap.get(String(val).toLowerCase()) || val;
  }, [categoryNameMap]);

  const filteredFb = useMemo(() => {
    return fbGroups
      .filter((g) => {
        if (isLeader && user) {
          const isOwnerLeader = String(g.id_member) === String(user.id);
          const isOwnerMemberOfMyTeam = myTeamMemberIds.has(String(g.id_member));
          if (!isOwnerLeader && !isOwnerMemberOfMyTeam) {
            return false;
          }
        }

        const matchesSearch = !search ||
          g.group_name?.toLowerCase().includes(search.toLowerCase()) ||
          g.group_url?.toLowerCase().includes(search.toLowerCase());
        
        const matchesIntent = intentFilter === "all" || String((g as any).id_intent ?? "") === intentFilter;
        const matchesIndustry = industryFilter === "all" || String((g as any).id_industry ?? "") === industryFilter;
        
        // Team filter: for admin, filter by member's team. Otherwise filter by category id_team.
        let matchesTeam = true;
        if (teamFilter !== "all") {
          if (isAdmin) {
            const selectedTeam = teamsData.find(t => String(t.id) === teamFilter);
            matchesTeam = selectedTeam?.members?.some(m => String(m.id) === String(g.id_member)) || false;
          } else {
            matchesTeam = String((g as any).id_team ?? "") === teamFilter;
          }
        }

        const matchesTier = tierFilter === "all" || String((g as any).id_tier ?? "") === tierFilter;
        const matchesIcp = icpFilter === "all" || String((g as any).id_icp ?? "") === icpFilter;
        const matchesContentType = contentTypeFilter === "all" || String((g as any).id_content_type ?? "") === contentTypeFilter;
        const matchesProductSeeding = productSeedingFilter === "all" || String((g as any).id_product_seeding ?? "") === productSeedingFilter;

        return matchesSearch && matchesIntent && matchesIndustry && matchesTeam && matchesTier && matchesIcp && matchesContentType && matchesProductSeeding;
      })
      .sort((g1, g2) => {
        if (isLeader && user) {
          const isLeader1 = String(g1.id_member) === String(user.id);
          const isLeader2 = String(g2.id_member) === String(user.id);
          // Leader's own groups float to top
          if (isLeader1 && !isLeader2) return -1;
          if (!isLeader1 && isLeader2) return 1;
          // Then group by member name A-Z (same as admin)
          const u1 = getUserName(g1.id_member) || "";
          const u2 = getUserName(g2.id_member) || "";
          const userComp = u1.localeCompare(u2, "vi");
          if (userComp !== 0) return userComp;
        } else if (isAdmin) {
          const u1 = getUserName(g1.id_member) || "";
          const u2 = getUserName(g2.id_member) || "";
          const userComp = u1.localeCompare(u2, "vi");
          if (userComp !== 0) return userComp;
        }
        const name1 = g1.group_name || "";
        const name2 = g2.group_name || "";
        return name1.localeCompare(name2, "vi");
      });
  }, [fbGroups, search, intentFilter, industryFilter, teamFilter, tierFilter, icpFilter, contentTypeFilter, productSeedingFilter, isAdmin, isLeader, user, myTeamMemberIds, teamsData, getUserName]);

  const filteredLi = useMemo(() => {
    return liGroups
      .filter((g) => {
        if (isLeader && user) {
          const isOwnerLeader = String(g.id_member) === String(user.id);
          const isOwnerMemberOfMyTeam = myTeamMemberIds.has(String(g.id_member));
          if (!isOwnerLeader && !isOwnerMemberOfMyTeam) {
            return false;
          }
        }

        const matchesSearch = !search ||
          g.group_name?.toLowerCase().includes(search.toLowerCase()) ||
          g.group_url?.toLowerCase().includes(search.toLowerCase());
        
        const matchesIntent = intentFilter === "all" || String((g as any).id_intent ?? "") === intentFilter;
        const matchesIndustry = industryFilter === "all" || String((g as any).id_industry ?? "") === industryFilter;
        
        let matchesTeam = true;
        if (teamFilter !== "all") {
          if (isAdmin) {
            const selectedTeam = teamsData.find(t => String(t.id) === teamFilter);
            matchesTeam = selectedTeam?.members?.some(m => String(m.id) === String(g.id_member)) || false;
          } else {
            matchesTeam = String((g as any).id_team ?? "") === teamFilter;
          }
        }

        const matchesTier = tierFilter === "all" || String((g as any).id_tier ?? "") === tierFilter;
        const matchesIcp = icpFilter === "all" || String((g as any).id_icp ?? "") === icpFilter;
        const matchesContentType = contentTypeFilter === "all" || String((g as any).id_content_type ?? "") === contentTypeFilter;
        const matchesProductSeeding = productSeedingFilter === "all" || String((g as any).id_product_seeding ?? "") === productSeedingFilter;

        return matchesSearch && matchesIntent && matchesIndustry && matchesTeam && matchesTier && matchesIcp && matchesContentType && matchesProductSeeding;
      })
      .sort((g1, g2) => {
        if (isLeader && user) {
          const isLeader1 = String(g1.id_member) === String(user.id);
          const isLeader2 = String(g2.id_member) === String(user.id);
          // Leader's own groups float to top
          if (isLeader1 && !isLeader2) return -1;
          if (!isLeader1 && isLeader2) return 1;
          // Then group by member name A-Z (same as admin)
          const u1 = getUserName(g1.id_member) || "";
          const u2 = getUserName(g2.id_member) || "";
          const userComp = u1.localeCompare(u2, "vi");
          if (userComp !== 0) return userComp;
        } else if (isAdmin) {
          const u1 = getUserName(g1.id_member) || "";
          const u2 = getUserName(g2.id_member) || "";
          const userComp = u1.localeCompare(u2, "vi");
          if (userComp !== 0) return userComp;
        }
        const name1 = g1.group_name || "";
        const name2 = g2.group_name || "";
        return name1.localeCompare(name2, "vi");
      });
  }, [liGroups, search, intentFilter, industryFilter, teamFilter, tierFilter, icpFilter, contentTypeFilter, productSeedingFilter, isAdmin, isLeader, user, myTeamMemberIds, teamsData, getUserName]);

  const handleDeleteGroup = async (id: string) => {
    const res = await allPlatformGroupsService.delete(id, platform);
    if (res.success) {
      await fetchGroups();
      setSuccess("ÄÃ£ xÃ³a nhÃ³m vÃ  toÃ n bá»™ bÃ i viáº¿t liÃªn quan thÃ nh cÃ´ng");
    } else {
      setError(res.message || "XÃ³a tháº¥t báº¡i");
    }
  };

  const handleFbSubmit = async (data: Partial<FbGroupFormData>) => {
    let res;
    const payload = {
      ...data,
      // ensure numeric fields are sent as numbers where backend expects
      members: data.members ? parseInt(data.members as string) : null,
      posts_per_week: data.posts_per_week ? parseInt(data.posts_per_week as string) : null,
      health_score: data.health_score ? parseInt(data.health_score as string) : null,
      start_time_in_day: data.start_time_in_day ? parseInt(data.start_time_in_day as string) : null,
      end_time_in_day: data.end_time_in_day ? parseInt(data.end_time_in_day as string) : null,
      time_crawl: data.time_crawl ? parseInt(data.time_crawl as string) : null,
      end_time_24h: data.end_time_24h || null,
      end_date_hour: data.end_date_hour || null,
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
      setSuccess(editingGroup ? "ÄÃ£ cáº­p nháº­t nhÃ³m" : "ÄÃ£ thÃªm nhÃ³m");
    } else {
      setError(res.message || "Thao tÃ¡c tháº¥t báº¡i");
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
      setSuccess(editingGroup ? "ÄÃ£ cáº­p nháº­t nhÃ³m" : "ÄÃ£ thÃªm nhÃ³m");
    } else {
      setError(res.message || "Thao tÃ¡c tháº¥t báº¡i");
    }
  };

  const currentGroups = platform === "facebook" ? filteredFb : filteredLi;
  const totalItems = currentGroups.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedGroups = currentGroups.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [platform, search, intentFilter, industryFilter, teamFilter, tierFilter, icpFilter, contentTypeFilter, productSeedingFilter]);

  return (
    <div className="space-y-4 bg-white min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Quản lý Groups</h2>
          <p className="text-sm text-slate-500">Thêm, sửa, xóa nhóm Facebook & LinkedIn</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingGroup(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B91C1C] shrink-0 cursor-pointer shadow-none sm:w-auto"
        >
          <FaPlus />
          Thêm nhóm
        </button>
      </div>

      {/* Platform tabs */}
      <div className="mb-4 max-w-full overflow-x-auto">
        <div className="flex max-w-max gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
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
              setContentTypeFilter("all");
              setProductSeedingFilter("all");
            }}
            className={`flex items-center gap-1.5 px-4 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${ platform === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800" }`}
          >
            <Icon />
            {label}
            <span className="bg-slate-200/60 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
              {key === "facebook" ? filteredFb.length : filteredLi.length}
            </span>
          </button>
        ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-[#FF3344]/10 border border-[#FF3344]/20 text-[#FF3344] rounded-lg px-4 py-2 text-sm flex items-center justify-between animate-in fade-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#FF3344] hover:text-[#C40009] font-bold">
            âœ•
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm flex items-center justify-between animate-in fade-in">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">
            âœ•
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm theo tên hoặc URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-100 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 outline-none transition focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20"
            />
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
          >
            🎛️ Lọc nâng cao
          <span className="text-sm text-slate-400">{showAdvancedFilters ? "▴" : "▾"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setIntentFilter("all");
              setIndustryFilter("all");
              setTeamFilter("all");
              setTierFilter("all");
              setIcpFilter("all");
              setContentTypeFilter("all");
              setProductSeedingFilter("all");
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            Xóa lọc
          </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ LÄ©nh vá»±c</option>
              {categories.filter(c => c.category_type === 'intent').map((opt) => (
                <option key={opt.id} value={String(opt.id)}>{opt.name || opt.code}</option>
              ))}
            </select>

            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ Industry</option>
              {categories.filter(c => c.category_type === 'industry').map((opt) => (
                <option key={opt.id} value={String(opt.id)}>{opt.name || opt.code}</option>
              ))}
            </select>

            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ Team</option>
              {teamCategories.map((opt) => (
                <option key={String(opt.id)} value={String(opt.id)}>
                  {opt.name || opt.code}
                </option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ Tier</option>
              {categories.filter(c => c.category_type === 'tier').map((opt) => (
                <option key={opt.id} value={String(opt.id)}>{opt.name || opt.code}</option>
              ))}
            </select>

            <select
              value={icpFilter}
              onChange={(e) => setIcpFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ ICP</option>
              {categories.filter(c => c.category_type === 'icp').map((opt) => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.code} {opt.name ? `(${opt.name})` : ""}
                </option>
              ))}
            </select>

            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ Loáº¡i ná»™i dung</option>
              {categories.filter(c => c.category_type === 'content_type').map((opt) => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.name || opt.code}
                </option>
              ))}
            </select>

            <select
              value={productSeedingFilter}
              onChange={(e) => setProductSeedingFilter(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition cursor-pointer shadow-sm focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F]/20"
            >
              <option value="all">Táº¥t cáº£ SP Seeding</option>
              {categories.filter(c => c.category_type === 'product_seeding').map((opt) => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.name || opt.code}
                </option>
              ))}
            </select>

            {(search !== "" ||
              intentFilter !== "all" ||
              industryFilter !== "all" ||
              teamFilter !== "all" ||
              tierFilter !== "all" ||
              icpFilter !== "all" ||
              contentTypeFilter !== "all" ||
              productSeedingFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setIntentFilter("all");
                    setIndustryFilter("all");
                    setTeamFilter("all");
                    setTierFilter("all");
                    setIcpFilter("all");
                    setContentTypeFilter("all");
                    setProductSeedingFilter("all");
                  }}
                  className="border border-[#FF3344]/20 hover:border-[#FF3344]/30 bg-[#FF3344]/5 hover:bg-[#FF3344]/10 hover:text-[#C40009] text-[#FF3344] flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm active:scale-95 md:col-start-4"
                  title="XÃ³a táº¥t cáº£ bá»™ lá»c"
                >
                  <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                  XÃ³a lá»c
                </button>
              )}
            </div>
          </div>
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
              maxWidth: "680px",
              minWidth: "300px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F5F5F5]/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#E3000F]">
                  {editingGroup ? "edit_square" : "add_circle"}
                </span>
                {editingGroup
                  ? `Sá»­a nhÃ³m ${platform === "facebook" ? "Facebook" : "LinkedIn"}`
                  : `ThÃªm nhÃ³m ${platform === "facebook" ? "Facebook" : "LinkedIn"} má»›i`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGroup(null);
                }}
                className="text-[#666666] hover:text-slate-900 transition cursor-pointer"
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
                  contentTypeOptions={categories.filter((c) => c.category_type === "content_type")}
                  productSeedingOptions={categories.filter((c) => c.category_type === "product_seeding")}
                  userOptions={userOptions}
                  initial={
                    editingGroup
                      ? {
                          id_member: String((editingGroup as any).id_member ?? ""),
                          group_name: (editingGroup as FacebookGroup).group_name,
                          group_url: (editingGroup as FacebookGroup).group_url,
                          id_intent: String((editingGroup as any).id_intent ?? ""),
                          id_industry: String((editingGroup as any).id_industry ?? ""),
                          id_tier: String((editingGroup as any).id_tier ?? ""),
                          id_team: String((editingGroup as any).id_team ?? ""),
                          id_icp: String((editingGroup as any).id_icp ?? ""),
                          id_content_type: String((editingGroup as any).id_content_type ?? ""),
                          id_product_seeding: String((editingGroup as any).id_product_seeding ?? ""),
                          assignee_id: String((editingGroup as FacebookGroup).assignee_id ?? ""),
                          co_assignee_id: String((editingGroup as FacebookGroup).co_assignee_id ?? ""),
                          note: (editingGroup as FacebookGroup).note || "",
                          risk_note: (editingGroup as FacebookGroup).risk_note || "",
                          icp_desc: (editingGroup as FacebookGroup).icp_desc || "",
                          members: (editingGroup as FacebookGroup).members !== undefined && (editingGroup as FacebookGroup).members !== null ? String((editingGroup as FacebookGroup).members) : "",
                          posts_per_week: (editingGroup as FacebookGroup).posts_per_week !== undefined && (editingGroup as FacebookGroup).posts_per_week !== null ? String((editingGroup as FacebookGroup).posts_per_week) : "",
                          chay_24h: (editingGroup as FacebookGroup).chay_24h || false,
                          crawl_time: (editingGroup as any).crawl_time ? String((editingGroup as any).crawl_time).substring(0, 5) : "10:00",
                          crawl_frequency: (editingGroup as any).crawl_frequency || "daily",
                          start_time_in_day: (editingGroup as FacebookGroup).start_time_in_day !== undefined && (editingGroup as FacebookGroup).start_time_in_day !== null ? String((editingGroup as FacebookGroup).start_time_in_day) : "",
                          end_time_in_day: (editingGroup as FacebookGroup).end_time_in_day !== undefined && (editingGroup as FacebookGroup).end_time_in_day !== null ? String((editingGroup as FacebookGroup).end_time_in_day) : "",
                          time_crawl: (editingGroup as FacebookGroup).time_crawl || "",
                          end_time_24h: (editingGroup as FacebookGroup).end_time_24h ? String((editingGroup as FacebookGroup).end_time_24h).substring(0, 10) : "",
                          end_date_hour: (editingGroup as FacebookGroup).end_date_hour ? String((editingGroup as FacebookGroup).end_date_hour).substring(0, 10) : "",
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
                  contentTypeOptions={categories.filter((c) => c.category_type === "content_type")}
                  productSeedingOptions={categories.filter((c) => c.category_type === "product_seeding")}
                  initial={
                    editingGroup
                      ? {
                          id_member: String((editingGroup as any).id_member ?? ""),
                          group_name: (editingGroup as LinkedInGroup).group_name,
                          group_url: (editingGroup as LinkedInGroup).group_url,
                          status: (editingGroup as LinkedInGroup).status || "idle",
                          id_intent: String((editingGroup as any).id_intent ?? ""),
                          id_industry: String((editingGroup as any).id_industry ?? ""),
                          id_tier: String((editingGroup as any).id_tier ?? ""),
                          id_team: String((editingGroup as any).id_team ?? ""),
                          id_icp: String((editingGroup as any).id_icp ?? ""),
                          id_content_type: String((editingGroup as any).id_content_type ?? ""),
                          id_product_seeding: String((editingGroup as any).id_product_seeding ?? ""),
                          assignee_id: String((editingGroup as LinkedInGroup).assignee_id ?? ""),
                          co_assignee_id: String((editingGroup as LinkedInGroup).co_assignee_id ?? ""),
                          note: (editingGroup as LinkedInGroup).note || "",
                          risk_note: (editingGroup as LinkedInGroup).risk_note || "",
                        }
                      : undefined
                  }
                  userOptions={userOptions}
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
        <div className="text-center py-16 text-[#666666]">Äang táº£i...</div>
      ) : currentGroups.length === 0 ? (
        <div className="text-center py-16 bg-[#F5F5F5]/50 rounded-xl border border-dashed border-[#E5E5E5]">
          <MaterialIcon name="group" className="text-4xl text-slate-500 mx-auto mb-2" />
          <p className="text-[#666666] text-sm">Chưa có nhóm nào</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 text-[#E3000F] text-sm font-bold hover:underline cursor-pointer"
          >
            + Thêm nhóm đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="space-y-3 p-4 md:hidden">
            {paginatedGroups.map((g) => (
              <div key={g.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a
                      href={g.group_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-bold leading-snug text-slate-900 transition hover:text-[#E3000F]"
                    >
                      {g.group_name || "—"}
                    </a>
                    {platform === "facebook" ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Thành viên:{" "}
                        <span className="font-semibold text-slate-900">
                          {Number((g as FacebookGroup).members) > 0
                            ? Number((g as FacebookGroup).members).toLocaleString("vi-VN")
                            : "?"}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <button
                    onClick={() => setViewingGroupClassification(g)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <span className="material-symbols-outlined text-[16px]">more_horiz</span>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {platform === "facebook" && (g as FacebookGroup).chay_24h ? (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      24h Tự động
                    </span>
                  ) : null}
                  {g.intent_name ? (
                    <span className="rounded-lg bg-[#E3000F]/10 px-2 py-1 text-[10px] font-bold text-[#E3000F]">
                      {g.intent_name}
                    </span>
                  ) : null}
                  {(g as any).id_team && getTeamName((g as any).id_team) !== "—" ? (
                    <span className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">
                      {getTeamName((g as any).id_team)}
                    </span>
                  ) : null}
                  {g.industry_name ? (
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                      {g.industry_name}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-500">{isAdmin ? "Thành viên" : "Người phụ trách"}</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {isAdmin ? getUserName((g as any).id_member) : getUserName((g as any).assignee_id)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-500">{isAdmin ? "Team" : "Đồng phụ trách"}</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {isAdmin ? getUserTeamName((g as any).id_member) : getUserName((g as any).co_assignee_id)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingGroup(g);
                      setShowAddForm(false);
                    }}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Sá»­a
                  </button>
                  <button
                    onClick={() => setDeletingGroupItem(g)}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-[#DC2626]"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize">
                  Tên nhóm
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[280px]">
                  Phân loại
                </th>
                {isLeader ? (
                  <>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[150px]">
                      Người phụ trách
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[150px]">
                      Đồng phụ trách
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[150px]">
                      Thành viên
                    </th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[150px]">
                      {isAdmin ? "Thành viên" : "Người phụ trách"}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[150px]">
                      {isAdmin ? "Team" : "Đồng phụ trách"}
                    </th>
                  </>
                )}
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs capitalize w-[120px]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {paginatedGroups.map((g) => {
                const isLeaderGroup = isLeader && user && String(g.id_member) === String(user.id);
                return (
                  <tr 
                    key={g.id} 
                    className={`transition ${
                      isLeaderGroup 
                        ? "bg-green-50/70 hover:bg-green-100/80" 
                        : "hover:bg-[#F5F5F5]/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <a 
                        href={g.group_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold text-slate-900 hover:text-[#E3000F] hover:underline transition block leading-snug"
                        title={g.group_name}
                      >
                        {g.group_name || "â€”"}
                      </a>
                      {platform === "facebook" && (
                        <div className="mt-1.5 text-xs text-[#666666]">
                          Thành viên: <span className="font-semibold text-slate-900">{Number((g as FacebookGroup).members) > 0 ? Number((g as FacebookGroup).members).toLocaleString("vi-VN") : "?"}</span> thành viên
                        </div>
                      )}
                      {platform === "linkedin" && (
                        <div className="mt-1">
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
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {platform === "facebook" && (g as FacebookGroup).chay_24h && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold flex items-center gap-0.5" title={`Giá» cháº¡y: ${(g as FacebookGroup).start_time_in_day}h - ${(g as FacebookGroup).end_time_in_day}h\nCÃ¡ch: ${(g as FacebookGroup).time_crawl} phÃºt\nÄáº¿n: ${(g as FacebookGroup).end_time_24h ? String((g as FacebookGroup).end_time_24h).substring(0, 10) : ""}`}>
                            <span className="material-symbols-outlined text-[10px]">bolt</span> 24h Tự động
                          </span>
                        )}
                        {g.intent_name && <span className="px-1.5 py-0.5 bg-[#E3000F]/10 text-[#E3000F] rounded text-[10px] font-bold" title="LÄ©nh vá»±c">{g.intent_name}</span>}
                        {(g as any).id_team && getTeamName((g as any).id_team) !== "â€”" && <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-bold" title="Team">{getTeamName((g as any).id_team)}</span>}
                        {g.industry_name && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold" title="Industry">{g.industry_name}</span>}
                        {(g as any).content_type_name && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold" title="Content Type">{(g as any).content_type_name}</span>}
                        {(g as any).product_seeding_name && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold" title="Product Seeding">{(g as any).product_seeding_name}</span>}
                        {(g as any).tier_name && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold" title="Tier">{(g as any).tier_name}</span>}
                        {g.icp_name && <span className="px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded text-[10px] font-bold" title="ICP">{g.icp_name}</span>}
                        <button
                          onClick={() => setViewingGroupClassification(g)}
                          className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#666666] hover:bg-[#E5E5E5] rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[10px]">more_horiz</span>
                          Thêm
                        </button>
                      </div>
                    </td>
                    {isLeader ? (
                      <>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {getUserName((g as any).assignee_id)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {getUserName((g as any).co_assignee_id)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {getUserName((g as any).id_member)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {isAdmin ? getUserName((g as any).id_member) : getUserName((g as any).assignee_id)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {isAdmin ? getUserTeamName((g as any).id_member) : getUserName((g as any).co_assignee_id)}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingGroup(g);
                          setShowAddForm(false);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[#666666] hover:text-[#E3000F] transition text-xs font-bold cursor-pointer"
                      >
                        <FaEdit size={12} /> Sá»­a
                      </button>
                      <button
                        onClick={() => setDeletingGroupItem(g)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[#666666] hover:text-[#FF3344] transition text-xs font-bold ml-2 cursor-pointer"
                      >
                        <FaTrash size={12} /> Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-[#E5E5E5] bg-white px-4 py-3 rounded-b-xl sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#666666]">
                Hiển thị <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span> đến <span className="font-bold text-slate-900">{Math.min(page * pageSize, totalItems)}</span> trong số <span className="font-bold text-slate-900">{totalItems}</span> nhóm
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="whitespace-nowrap rounded-lg border border-[#E5E5E5] px-3 py-1 text-sm font-bold text-[#666666] transition hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  TrÆ°á»›c
                </button>
                <div className="whitespace-nowrap rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-1 text-sm font-bold text-slate-900">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="whitespace-nowrap rounded-lg border border-[#E5E5E5] px-3 py-1 text-sm font-bold text-[#666666] transition hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal xem phÃ¢n loáº¡i */}
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
              maxWidth: "600px",
              minWidth: "300px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F5F5F5]/50 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#E3000F]">
                  info
                </span>
                Chi tiáº¿t phÃ¢n loáº¡i nhÃ³m
              </h3>
              <button
                type="button"
                onClick={() => setViewingGroupClassification(null)}
                className="text-[#666666] hover:text-slate-900 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">TÃªn nhÃ³m</span>
                <span className="text-sm font-bold text-slate-900 break-all">{viewingGroupClassification.group_name || "â€”"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-[#E5E5E5] pt-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">LÄ©nh vá»±c</span>
                  <span className="inline-flex bg-[#E3000F]/10 text-[#E3000F] border border-[#E3000F]/20 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).intent_name || "â€”"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Team</span>
                  <span className="inline-flex bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {getTeamName((viewingGroupClassification as any).id_team)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">NgÃ nh (Industry)</span>
                  <span className="inline-flex bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).industry_name || "â€”"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">ICP Target</span>
                  <span className="inline-flex bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).icp_name || "â€”"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tier</span>
                  <span className="inline-flex bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).tier_name || "â€”"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Loáº¡i ná»™i dung</span>
                  <span className="inline-flex bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).content_type_name || "â€”"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">SP Seeding</span>
                  <span className="inline-flex bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    {(viewingGroupClassification as any).product_seeding_name || "â€”"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ghi chÃº rá»§i ro</span>
                  <div className={`text-sm p-3 rounded-lg border whitespace-pre-wrap ${(viewingGroupClassification as any).risk_note ? 'bg-[#FFF0F0] border-[#FFE0E0] text-red-700 font-medium' : 'bg-[#F9F9F9] border-[#E5E5E5] text-slate-500'}`}>
                    {(viewingGroupClassification as any).risk_note || "â€”"}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ghi chÃº chung</span>
                  <div className={`text-sm p-3 rounded-lg border whitespace-pre-wrap ${(viewingGroupClassification as any).note ? 'bg-[#F5F5F5] border-[#E5E5E5] text-slate-900' : 'bg-[#F9F9F9] border-[#E5E5E5] text-slate-500'}`}>
                    {(viewingGroupClassification as any).note || "â€”"}
                  </div>
                </div>
                {platform === "facebook" ? (
                  <>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cháº¡y 24h</span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold border ${(viewingGroupClassification as FacebookGroup).chay_24h ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-[#F5F5F5] text-[#666666] border-[#E5E5E5]"}`}>
                      {(viewingGroupClassification as FacebookGroup).chay_24h ? "CÃ³ (âš¡ Tá»± Ä‘á»™ng)" : "KhÃ´ng"}
                    </span>
                  </div>
                  {(viewingGroupClassification as FacebookGroup).chay_24h && (
                    <>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Giá» cháº¡y</span>
                        <span className="text-sm font-bold text-slate-900">
                          {String((viewingGroupClassification as any).crawl_time || "â€”").substring(0, 5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Táº§n suáº¥t</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(viewingGroupClassification as any).crawl_frequency === "weekly" ? "HÃ ng tuáº§n" : "HÃ ng ngÃ y"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Khung giá»</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(viewingGroupClassification as FacebookGroup).start_time_in_day ?? "â€”"}h - {(viewingGroupClassification as FacebookGroup).end_time_in_day ?? "â€”"}h
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Khoáº£ng cÃ¡ch cÃ o</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(viewingGroupClassification as FacebookGroup).time_crawl || "â€”"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Äáº¿n (khoáº£ng giá»)</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(viewingGroupClassification as FacebookGroup).end_date_hour ? String((viewingGroupClassification as FacebookGroup).end_date_hour).substring(0, 10) : "â€”"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Äáº¿n (24h)</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(viewingGroupClassification as FacebookGroup).end_time_24h ? String((viewingGroupClassification as FacebookGroup).end_time_24h).substring(0, 10) : "â€”"}
                        </span>
                      </div>
                    </>
                  )}
                  </>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tráº¡ng thÃ¡i</span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase ${(viewingGroupClassification as LinkedInGroup).status === "success" ? "bg-green-100 text-green-700" : (viewingGroupClassification as LinkedInGroup).status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {(viewingGroupClassification as LinkedInGroup).status || "idle"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-[#E5E5E5] px-6 py-4 bg-[#F5F5F5]/50 justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewingGroupClassification(null)}
                className="bg-[#FFFFFF] border border-[#E5E5E5] text-[#666666] hover:text-slate-900 font-bold px-5 py-2 rounded-xl hover:bg-[#F5F5F5] text-sm transition shadow-sm active:scale-95 cursor-pointer"
              >
                ÄÃ³ng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xÃ¡c nháº­n xÃ³a */}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FF3344]/5">
              <h3 className="text-sm font-bold text-[#FF3344] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#FF3344]">
                  warning
                </span>
                XÃ¡c nháº­n xÃ³a nhÃ³m
              </h3>
              <button
                type="button"
                onClick={() => setDeletingGroupItem(null)}
                className="text-[#666666] hover:text-slate-900 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3">
              <p className="text-sm text-[#666666] leading-relaxed">
                Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a nhÃ³m <strong className="text-slate-900 font-bold">{deletingGroupItem.group_name || "â€”"}</strong>?
              </p>
              <div className="bg-[#FF3344]/10 border border-[#FF3344]/20 rounded-xl p-3 flex gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF3344] shrink-0 select-none">
                  info
                </span>
                <span className="text-xs text-[#FF3344] leading-normal">
                  <strong>ChÃº Ã½:</strong> HÃ nh Ä‘á»™ng nÃ y sáº½ xÃ³a vÄ©nh viá»…n nhÃ³m nÃ y cÃ¹ng vá»›i <strong>táº¥t cáº£ cÃ¡c bÃ i viáº¿t</strong> thuá»™c nhÃ³m nÃ y trong há»‡ thá»‘ng. Thao tÃ¡c nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c!
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-[#E5E5E5] px-6 py-4 bg-[#F5F5F5]/50 justify-end">
              <button
                type="button"
                onClick={() => setDeletingGroupItem(null)}
                className="bg-[#FFFFFF] border border-[#E5E5E5] text-[#666666] hover:text-slate-900 font-bold px-4 py-2 rounded-xl hover:bg-[#F5F5F5] text-xs transition shadow-sm active:scale-95 cursor-pointer"
              >
                Há»§y
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
                XÃ¡c nháº­n xÃ³a
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

