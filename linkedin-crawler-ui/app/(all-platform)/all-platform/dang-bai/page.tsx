"use client";

/**
 * Trang ĐĂNG BÀI FACEBOOK (seeding) — tích hợp vào dashboard all-platform.
 * Cách A: UI nằm trong dashboard, nhưng gọi thẳng MARKEE SERVICE để đăng bài
 * (tận dụng backend đăng bài đã chạy, chưa viết lại native).
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

interface Ext { user_id: string; owner?: string; label?: string; email?: string; note?: string; status: string; }
interface FbSession { user_id: string; owner?: string; label?: string; email?: string; note?: string; }
interface Grp { id: string; name: string; url: string; team?: string; intent?: string; }
interface Job { job_id?: string; user_id?: string; content?: string; status?: string; target_type?: string; target_id?: string; post_url?: string; error?: string; updated_at?: string; created_at?: string; }

export default function DangBaiPage() {
  const { user } = useAppAuth();
  const owner = user?.id || "";  // tài khoản Markee đang login = chủ sở hữu các acc FB

  const [exts, setExts] = useState<Ext[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState<"profile" | "group">("profile");
  const [groupUrl, setGroupUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [connErr, setConnErr] = useState(false);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  async function verifyKpi(job: Job) {
    if (!job.job_id || !job.user_id) return showToast("Dữ liệu job không đầy đủ", false);
    setVerifying(job.job_id);
    try {
      const r = await fetch("/api/all-platform/fb/post-kpi/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.job_id,
          user_id: job.user_id,
          post_url: job.post_url,
          content: job.content,
          target_type: job.target_type,
          target_id: job.target_id || null,
        }),
      });
      const d = await r.json();
      if (d.success) showToast("Đã lưu KPI thành công", true);
      else showToast("Lỗi lưu KPI: " + (d.message || "Unknown error"), false);
    } catch (e) {
      showToast("Lỗi kết nối", false);
    }
    setVerifying(null);
  }

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
      const [e, s, g, j] = await Promise.all([
        fbFetch("/extensions").then(r => r.json()).catch(() => ({})),
        fbFetch("/sessions").then(r => r.json()).catch(() => ({})),
        allPlatformGroupsService.getAll("facebook").catch(() => ({ success: false, data: [] as FacebookGroup[] })),
        fbFetch("/jobs").then(r => r.json()).catch(() => ({})),
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
      // lịch sử: chỉ hiện job của các acc thuộc owner này
      const myUsers = new Set((e.extensions || []).map((x: Ext) => x.user_id));
      setJobs((j.jobs || []).filter((job: Job) => myUsers.has(job.user_id || "")).slice().reverse().slice(0, 10));
      setConnErr(false);
    } catch { setConnErr(true); }
  }, [owner]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const t = setInterval(refresh, 4000);
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
      showToast("Đã đổi tên tài khoản", true);
      refresh();
    } catch { showToast("Lỗi đổi tên", false); }
  }

  async function submit() {
    if (selected.size === 0) return showToast("Chưa chọn tài khoản nào", false);
    if (!content.trim() && mediaUrls.length === 0) return showToast("Chưa nhập nội dung hoặc ảnh", false);
    if (targetType === "group" && !groupUrl) return showToast("Chưa chọn group", false);
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
    if (fail.length === 0) { showToast(`Đã gửi lệnh đăng cho ${ok} tài khoản!`, true); setContent(""); setMediaUrls([]); }
    else if (ok > 0) showToast(`Gửi OK ${ok}, lỗi ${fail.length}: ${fail.map(f => f.uid).join(", ")}`, false);
    else showToast(fail[0].detail || "Không gửi được", false);
    setSending(false);
    setTimeout(refresh, 800);
  }

  async function upload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { showToast("File không phải ảnh: " + f.name, false); continue; }
      try {
        const fd = new FormData(); fd.append("file", f);
        const r = await fbFetch("/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (r.ok && d.url) setMediaUrls(prev => [...prev, d.url]); else showToast("Lỗi upload: " + (d.detail || f.name), false);
      } catch { showToast("Lỗi upload " + f.name, false); }
    }
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-1">
        <MaterialIcon name="send" className="text-[#E3000F]" />
        <h1 className="text-xl font-black text-[#1A1A1A]">Đăng bài Facebook</h1>
      </div>
      <p className="text-sm text-[#666666] mb-6">Soạn và gửi bài đăng seeding tới các tài khoản đang kết nối extension.</p>

      {connErr && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-700">⚠️ Không kết nối được Facebook automation service. Kiểm tra backend product và Markee service.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 items-start">
        {/* Form */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#666666]">Tài khoản đăng (đang online: {online.length})</label>
              <button className="text-xs font-semibold text-[#E3000F]" onClick={() => setSelected(new Set(online.map(e => e.user_id)))}>Chọn tất cả</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {online.length === 0 ? <span className="text-sm text-[#A0A0A0]">Chưa có tài khoản online của bạn</span> :
                online.map(e => (
                  <span key={e.user_id}
                    className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full text-sm font-semibold border transition ${selected.has(e.user_id) ? "bg-[#E3000F] text-white border-[#E3000F]" : "border-[#E5E5E5] text-[#1A1A1A] hover:border-[#E3000F]"}`}>
                    <button onClick={() => toggle(e.user_id)} className="flex min-w-0 items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 align-middle" />
                      <span className="min-w-0 text-left">
                        <span className="block max-w-[150px] truncate leading-4">{labelOf(e)}</span>
                        <span className={`block max-w-[150px] truncate text-[10px] leading-3 ${selected.has(e.user_id) ? "text-white/75" : "text-[#A0A0A0]"}`}>{shortFbId(e.user_id)}</span>
                      </span>
                    </button>
                    <button onClick={() => renameAcc(e.user_id, labelOf(e))} title="Đổi tên"
                      className={`text-[11px] opacity-60 hover:opacity-100 ${selected.has(e.user_id) ? "text-white" : "text-[#666666]"}`}>✎</button>
                  </span>
                ))}
            </div>
            {extInstalled === false && <p className="text-xs text-amber-600 mt-2">⚠️ Chưa phát hiện extension trên trình duyệt này. Hãy cài extension để các tài khoản Facebook hiện ra đây.</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-[#666666] block mb-1">Đăng vào</label>
            <select value={targetType} onChange={ev => setTargetType(ev.target.value as "profile" | "group")} className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A] bg-white">
              <option value="profile">Trang cá nhân</option>
              <option value="group">Group</option>
            </select>
          </div>

          {targetType === "group" && (
            <div>
              <label className="text-xs font-bold text-[#666666] block mb-1">Chọn group từ Quản lý nhóm</label>
              <select value={groupUrl} onChange={ev => setGroupUrl(ev.target.value)} className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A] bg-white">
                <option value="">-- Chọn từ danh sách Quản lý nhóm --</option>
                {groups.length === 0 && <option disabled value="">Chưa có group Facebook trong Quản lý nhóm</option>}
                {groups.map(g => (
                  <option key={g.id} value={g.url}>
                    {g.name}{g.team ? ` - ${g.team}` : ""}{g.intent ? ` - ${g.intent}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#A0A0A0] mt-1">Danh sách này dùng chung dữ liệu với trang Quản lý nhóm. Tài khoản phải là thành viên group đó.</p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#666666] block mb-1">Nội dung</label>
            <textarea value={content} onChange={ev => setContent(ev.target.value)} placeholder="Nhập nội dung muốn đăng..." className="w-full min-h-[100px] border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A] resize-y" />
          </div>

          <div>
            <label className="text-xs font-bold text-[#666666] block mb-1">Hình ảnh (tùy chọn)</label>
            <input type="file" accept="image/*" multiple onChange={ev => upload(ev.target.files)} className="text-sm" />
            {mediaUrls.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{mediaUrls.map((u, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E5E5E5]">
                <img src={u} className="w-full h-full object-cover" alt="" />
                <button onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] leading-none">×</button>
              </div>))}</div>}
          </div>

          <button onClick={submit} disabled={sending} className="w-full py-2.5 bg-[#E3000F] text-white rounded-lg font-bold hover:bg-[#C40009] transition disabled:opacity-50">
            {sending ? `Đang gửi (${selected.size})...` : "Đăng bài"}
          </button>
        </div>

        {/* Lịch sử */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-5">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-4">Lịch sử gần đây</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-[#A0A0A0] uppercase border-b border-[#E5E5E5]"><th className="py-2">Thời gian</th><th>Tài khoản</th><th>Nội dung</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {jobs.length === 0 ? <tr><td colSpan={4} className="text-center text-[#A0A0A0] py-8">Chưa có bài đăng nào</td></tr> :
                jobs.map((j, i) => {
                  const cls = j.status === "success" ? "bg-green-100 text-green-700" : j.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                  const txt = j.status === "success" ? "✅ Thành công" : j.status === "failed" ? "❌ Thất bại" : "⏳ Đang xử lý";
                  return (<tr key={i} className="border-b border-[#E5E5E5] align-top">
                    <td className="py-2 whitespace-nowrap text-[#666666]">{j.updated_at ? new Date(j.updated_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-"}</td>
                    <td className="font-semibold text-[#1A1A1A]">
                      {(() => {
                        const ext = exts.find(e => e.user_id === j.user_id);
                        return ext ? labelOf(ext) : shortFbId(j.user_id || "");
                      })()}{j.target_type === "group" ? " [group]" : ""}
                    </td>
                    <td className="max-w-[260px] truncate text-[#1A1A1A]" title={j.content}>{j.content}</td>
                    <td><span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${cls}`}>{txt}</span>
                      {j.status === "success" && j.post_url && (
                        <div className="mt-1 flex flex-col gap-1.5 items-start">
                          <a href={j.post_url} target="_blank" rel="noopener" className="text-xs text-[#E3000F] font-semibold flex items-center gap-1">
                            🔗 Xem bài
                          </a>
                          <button onClick={() => verifyKpi(j)} disabled={verifying === j.job_id} className="text-xs px-2 py-1 bg-[#1A1A1A] text-white rounded font-semibold hover:bg-black transition disabled:opacity-50">
                            {verifying === j.job_id ? "Đang xử lý..." : "Xác minh KPI"}
                          </button>
                        </div>
                      )}
                      {j.error && <div className="text-xs text-[#A0A0A0] mt-1">{j.error}</div>}
                    </td>
                  </tr>);
                })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-lg text-white font-semibold shadow-lg ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>}
    </div>
  );
}
