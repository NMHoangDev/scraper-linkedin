"use client";

/**
 * Trang ĐĂNG BÀI FACEBOOK (seeding) — tích hợp vào dashboard all-platform.
 * Cách A: UI nằm trong dashboard, nhưng gọi thẳng MARKEE SERVICE để đăng bài.
 *
 * Markee service: nhận POST /post {user_id, content, media_urls, target_type, target_id}.
 * Lấy danh sách acc online: GET /extensions. Thư viện group: GET /groups.
 */

import { useEffect, useState, useCallback } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { provisionExtension, pingExtension } from "@/lib/markee-ext-provision";
import { fbFetch, fbHeaders, getFbProvisionConfig } from "@/lib/markee-fb-api";
import { MaterialIcon } from "@/components/ui";
import { allPlatformGroupsService } from "@/services/all-platform.service";
import type { FacebookGroup } from "@/types/unified.types";
import { toast } from "sonner";

interface Ext { user_id: string; owner?: string; label?: string; email?: string; note?: string; status: string; }
interface FbSession { user_id: string; owner?: string; label?: string; email?: string; note?: string; }
interface Grp { id: string; name: string; url: string; team?: string; intent?: string; }

interface KpiPost {
  id: string;
  job_id: string;
  user_id: string;
  post_url?: string;
  content?: string;
  target_type: string;
  target_id?: string;
  posted_at: string;
}

export default function DangBaiPage() {
  const { user } = useAppAuth();
  const owner = user?.id || "";  // tài khoản Markee đang login = chủ sở hữu các acc FB

  const [exts, setExts] = useState<Ext[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [kpiPosts, setKpiPosts] = useState<KpiPost[]>([]);
  const [kpiTarget, setKpiTarget] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState<"profile" | "group">("profile");
  const [groupUrl, setGroupUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [connErr, setConnErr] = useState(false);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Tự provision extension khi vào trang (zero-config): gắn các acc FB ở browser này với owner đang login.
  useEffect(() => {
    if (!owner) return;
    (async () => {
      const { installed } = await pingExtension();
      setExtInstalled(installed);
      if (installed) {
        const cfg = await getFbProvisionConfig();
        await provisionExtension({ serverUrl: cfg.serverUrl, owner, apiKey: cfg.extensionApiKey, label: user?.name || user?.email || owner });
      }
    })();
  }, [owner, user?.email, user?.name]);

  const refresh = useCallback(async () => {
    if (!owner) return;
    try {
      const [e, s, g, jList] = await Promise.all([
        fbFetch("/extensions").then(r => r.json()).catch(() => ({})),
        fbFetch("/sessions").then(r => r.json()).catch(() => ({})),
        allPlatformGroupsService.getAll("facebook").catch(() => ({ success: false, data: [] as FacebookGroup[] })),
        fetch("/api/all-platform/fb/post-kpi/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user?.email || "", limit: 30 })
        }).then(r => r.json()).catch(() => ({ success: false, data: { posts: [], kpi_target: 0 } })),
      ]);

      const sessionMap = new Map<string, FbSession>((s.sessions || []).map((item: FbSession) => [item.user_id, item]));
      setExts((e.extensions || []).map((ext: Ext) => ({ ...(sessionMap.get(ext.user_id) || {}), ...ext })));
      
      setGroups(((g.data || []) as FacebookGroup[])
        .filter(group => group.group_url)
        .map(group => ({
          id: group.id,
          name: group.group_name || group.group_url,
          url: group.group_url,
          team: group.team_name || group.team,
          intent: group.intent_name || group.intent,
        })));

      if (jList.success && jList.data) {
        setKpiPosts(jList.data.posts || []);
        setKpiTarget(jList.data.kpi_target || 0);
      }
      setConnErr(false);
    } catch { setConnErr(true); }
  }, [owner, user?.email]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const online = exts.filter(e => e.status === "online");
  
  const toggle = (uid: string) => {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
  };

  const shortFbId = (id: string) => {
    const raw = id.replace(/^fb_/, "");
    return raw.length > 10 ? `fb ${raw.slice(0, 4)}...${raw.slice(-4)}` : id;
  };

  const labelOf = (e: Ext) => {
    const explicit = (e.label || "").trim();
    if (explicit && explicit !== e.user_id) return explicit;
    return e.email || "Tài khoản Facebook";
  };

  async function renameAcc(uid: string, current: string) {
    const name = window.prompt("Đặt tên cho tài khoản này:", current);
    if (!name || !name.trim()) return;
    try {
      await fbFetch(`/extensions/${encodeURIComponent(uid)}/label`, {
        method: "POST", headers: fbHeaders(), body: JSON.stringify({ label: name.trim() }),
      });
      toast.success("Đã đổi tên tài khoản");
      refresh();
    } catch { toast.error("Lỗi đổi tên"); }
  }

  async function submit() {
    if (selected.size === 0) return toast.error("Chưa chọn tài khoản nào");
    if (!content.trim() && mediaUrls.length === 0) return toast.error("Chưa nhập nội dung hoặc ảnh");
    if (targetType === "group" && !groupUrl) return toast.error("Chưa chọn group");
    
    setSending(true);
    const results = await Promise.all([...selected].map(async uid => {
      try {
        const r = await fbFetch("/post", {
          method: "POST", headers: fbHeaders(),
          body: JSON.stringify({ user_id: uid, content, media_urls: mediaUrls, target_type: targetType, target_id: groupUrl || null }),
        });
        const d = await r.json().catch(() => ({}));
        return { uid, ok: r.ok, detail: d.detail };
      } catch { return { uid, ok: false, detail: "không kết nối được" }; }
    }));
    
    const ok = results.filter(x => x.ok).length;
    const fail = results.filter(x => !x.ok);
    
    if (fail.length === 0) { 
      toast.success(`Đã gửi lệnh đăng cho ${ok} tài khoản!`); 
      setContent(""); 
      setMediaUrls([]); 
      setIsPostModalOpen(false);
    }
    else if (ok > 0) toast.error(`Gửi OK ${ok}, lỗi ${fail.length}: ${fail.map(f => f.uid).join(", ")}`);
    else toast.error(fail[0].detail || "Không gửi được");
    
    setSending(false);
    setTimeout(refresh, 800);
  }

  async function upload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { toast.error("File không phải ảnh: " + f.name); continue; }
      try {
        const fd = new FormData(); fd.append("file", f);
        const r = await fbFetch("/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (r.ok && d.url) setMediaUrls(prev => [...prev, d.url]); else toast.error("Lỗi upload: " + (d.detail || f.name));
      } catch { toast.error("Lỗi upload " + f.name); }
    }
  }

  // Tính phần trăm tiến độ KPI tuần
  const percent = kpiTarget > 0 ? Math.min((kpiPosts.length / kpiTarget) * 100, 100) : 0;

  return (
    <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
              <MaterialIcon name="send" className="text-[#E3000F] text-xl" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Đăng bài Facebook (Seeding)</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Soạn và đăng bài tự động tới profile cá nhân hoặc các nhóm Facebook.</p>
        </div>
        <button
          onClick={() => setIsPostModalOpen(true)}
          className="bg-[#E3000F] hover:bg-red-750 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm transition-all shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98]"
        >
          <MaterialIcon name="add" className="text-[20px]" /> Đăng bài mới
        </button>
      </div>

      {connErr && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-5 py-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2.5 shadow-sm">
          <MaterialIcon name="warning" className="text-amber-600 dark:text-amber-400 shrink-0 text-[18px]" />
          <div>
            <strong>Lỗi kết nối:</strong> Không kết nối được Facebook automation service. Vui lòng kiểm tra backend và extension.
          </div>
        </div>
      )}

      {/* KPI Progress Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tiến độ hoàn thành KPI đăng bài tuần này</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">KPI được tính dựa trên số lượng bài đăng thành công lưu nhận trong bảng fb_post_kpi</p>
          </div>
          <div className="flex items-baseline gap-1.5 shrink-0 bg-red-50 dark:bg-red-950/20 px-3.5 py-1.5 rounded-lg">
            <span className="text-2xl font-black text-[#E3000F]">{kpiPosts.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">/ {kpiTarget} bài đăng</span>
            <span className="text-xs font-bold text-[#E3000F] ml-1.5">({Math.round(percent)}%)</span>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/40 dark:border-slate-700/40">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-[#E3000F] rounded-full transition-all duration-700 relative overflow-hidden" 
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
          </div>
        </div>
      </div>

      {/* Lịch sử gần đây */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MaterialIcon name="history" className="text-slate-400 dark:text-slate-500" />
            Lịch sử đăng bài gần đây
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chỉ hiển thị bài đăng của bạn</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-3.5 px-6">Thời gian</th>
                <th className="py-3.5 px-6">Tài khoản</th>
                <th className="py-3.5 px-6">Nơi đăng</th>
                <th className="py-3.5 px-6">Nội dung</th>
                <th className="py-3.5 px-6 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {kpiPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 dark:text-slate-500 py-12">
                    <MaterialIcon name="article" className="text-4xl text-slate-300 dark:text-slate-600 mb-2 block mx-auto" />
                    Chưa có bài đăng KPI nào trong tuần này
                  </td>
                </tr>
              ) : (
                kpiPosts.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors align-top">
                    <td className="py-4 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                      {j.posted_at ? new Date(j.posted_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-"}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                      {(() => {
                        const ext = exts.find(e => e.user_id === j.user_id);
                        return ext ? labelOf(ext) : shortFbId(j.user_id || "");
                      })()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {j.target_type === "group" ? (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded text-xs font-medium border border-purple-100 dark:border-purple-900/30">
                          <MaterialIcon name="groups" className="text-[14px]" /> Group
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded text-xs font-medium border border-blue-100 dark:border-blue-900/30">
                          <MaterialIcon name="person" className="text-[14px]" /> Cá nhân
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 max-w-sm truncate text-slate-700 dark:text-slate-350" title={j.content}>
                      {j.content || <span className="text-slate-400 italic text-xs">Không có nội dung</span>}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-full text-xs font-bold border border-green-150 dark:border-green-900/30">
                           Thành công
                        </span>
                        {j.post_url && (
                          <a 
                            href={j.post_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-[#E3000F] font-bold hover:underline inline-flex items-center gap-0.5 transition"
                          >
                            <MaterialIcon name="open_in_new" className="text-[13px]" /> Xem bài viết
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Đăng Bài Seeding Mới */}
      {isPostModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
          onClick={() => setIsPostModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-55/40 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <MaterialIcon name="send" className="text-[#E3000F] text-base" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Đăng bài Facebook Seeding mới</h3>
              </div>
              <button 
                onClick={() => setIsPostModalOpen(false)} 
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <MaterialIcon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
              {/* Step 1: Chọn tài khoản */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tài khoản đăng (đang online: {online.length})</label>
                  {online.length > 0 && (
                    <button 
                      className="text-xs font-semibold text-[#E3000F] hover:underline transition" 
                      onClick={() => setSelected(new Set(online.map(e => e.user_id)))}
                    >
                      Chọn tất cả
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/10">
                  {online.length === 0 ? (
                    <span className="text-xs text-slate-400 italic p-1">Chưa có tài khoản Facebook nào đang online.</span>
                  ) : (
                    online.map(e => {
                      const isSel = selected.has(e.user_id);
                      return (
                        <div 
                          key={e.user_id}
                          className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all duration-150 ${
                            isSel 
                              ? "bg-[#E3000F]/10 text-[#E3000F] border-[#E3000F] shadow-sm shadow-red-500/5" 
                              : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:border-red-400/50 bg-white dark:bg-slate-800"
                          }`}
                          onClick={() => toggle(e.user_id)}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="max-w-[140px] truncate leading-tight">{labelOf(e)}</span>
                          <button 
                            onClick={(ev) => {
                              ev.stopPropagation();
                              renameAcc(e.user_id, labelOf(e));
                            }} 
                            title="Đổi tên hiển thị"
                            className={`hover:text-[#E3000F] transition p-0.5 rounded ${isSel ? "text-[#E3000F]/60" : "text-slate-400"}`}
                          >
                            <MaterialIcon name="edit" className="text-[13px]" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {extInstalled === false && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                    ⚠️ Chưa phát hiện extension trên trình duyệt này. Vui lòng cài và mở extension để các tài khoản Facebook online hiển thị.
                  </p>
                )}
              </div>

              {/* Step 2: Chọn nơi đăng */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Chọn nơi đăng bài</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTargetType("profile")}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      targetType === "profile" 
                        ? "bg-white dark:bg-slate-700 text-[#E3000F] shadow-sm font-semibold" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <MaterialIcon name="person" className="text-[16px]" /> Trang cá nhân
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("group")}
                    className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      targetType === "group" 
                        ? "bg-white dark:bg-slate-700 text-[#E3000F] shadow-sm font-semibold" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <MaterialIcon name="groups" className="text-[16px]" /> Nhóm (Group)
                  </button>
                </div>
              </div>

              {/* Nếu chọn đăng Group thì render dropdown */}
              {targetType === "group" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Chọn nhóm từ danh sách liên kết</label>
                  <select 
                    value={groupUrl} 
                    onChange={ev => setGroupUrl(ev.target.value)} 
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 transition"
                  >
                    <option value="">-- Chọn từ danh sách Quản lý nhóm --</option>
                    {groups.length === 0 && <option disabled value="">Chưa có group Facebook nào được cấu hình</option>}
                    {groups.map(g => (
                      <option key={g.id} value={g.url}>
                        {g.name}{g.team ? ` - ${g.team}` : ""}{g.intent ? ` - ${g.intent}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Danh sách được lấy tự động từ trang Quản lý nhóm. Lưu ý tài khoản seeding phải là thành viên của nhóm.</p>
                </div>
              )}

              {/* Step 3: Nội dung */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Nội dung bài viết seeding</label>
                <textarea 
                  value={content} 
                  onChange={ev => setContent(ev.target.value)} 
                  placeholder="Nhập nội dung bài viết muốn đăng..." 
                  className="w-full min-h-[120px] border border-slate-200 dark:border-slate-750 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 resize-y transition" 
                />
              </div>

              {/* Step 4: Hình ảnh */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Hình ảnh kèm theo (tùy chọn)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:border-red-400/50 transition">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <MaterialIcon name="image" className="text-slate-400 dark:text-slate-500 text-2xl mb-1" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Click để chọn tải ảnh từ máy tính</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={ev => upload(ev.target.files)} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {mediaUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mediaUrls.map((u, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group shadow-sm bg-slate-100">
                        <img src={u} className="w-full h-full object-cover" alt="uploaded-preview" />
                        <button 
                          onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))} 
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] leading-none transition"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-55/40 dark:bg-slate-800/40">
              <button 
                onClick={() => setIsPostModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded-xl hover:bg-slate-150 dark:hover:bg-slate-800 font-semibold text-xs transition"
              >
                Hủy
              </button>
              <button 
                onClick={submit} 
                disabled={sending} 
                className="px-6 py-2.5 bg-[#E3000F] hover:bg-red-750 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm shadow-red-500/10 hover:shadow-red-500/20 active:scale-[0.98]"
              >
                {sending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang gửi ({selected.size})...
                  </>
                ) : (
                  <>
                    <MaterialIcon name="send" className="text-[14px]" />
                    Đăng ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
