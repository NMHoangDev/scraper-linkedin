"use client";

import { useState, useEffect, useCallback } from "react";
import { FaFacebook, FaPlus, FaLink } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fbInboxAccountService, type FbInboxAccount } from "@/services/all-platform.service";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { provisionExtension, pingExtension, addAccountViaExtension } from "@/lib/markee-ext-provision";
import { fbFetch, fbHeaders, getFbProvisionConfig } from "@/lib/markee-fb-api";
import { usersService } from "@/services/all-platform.service";

interface FbInboxAccountsTabProps {
  onChange?: () => void;
}

interface Session {
  user_id: string; fb_user_id?: string; label?: string; owner?: string; email?: string; note?: string;
  online?: boolean; expired?: boolean; days_left?: number | null; cookie_count?: number; needs_relogin?: boolean;
}

interface UnifiedAccount {
  user_id: string;
  label: string;
  fb_user_id?: string;
  online: boolean;
  needs_relogin: boolean;
  days_left?: number | null;
  hasKpi: boolean;
  inboxAccountId?: string;
  session?: Session;
  inboxAccount?: FbInboxAccount;
  email?: string;
  note?: string;
  expired?: boolean;
}

export function FbInboxAccountsTab({ onChange }: FbInboxAccountsTabProps) {
  const { user } = useAppAuth();
  const owner = user?.id || "";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [inboxAccounts, setInboxAccounts] = useState<FbInboxAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [connErr, setConnErr] = useState(false);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  // Khởi tạo extension
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

  useEffect(() => {
    if (!owner) return;
    const fallbackName = user?.name || user?.email || owner;
    setOwnerNames({ [owner]: fallbackName });
    usersService.getAllProfiles().then(res => {
      if (!res.success || !Array.isArray(res.data)) return;
      const next: Record<string, string> = { [owner]: fallbackName };
      for (const row of res.data) {
        if (row.id) next[row.id] = row.name || row.email || row.id;
      }
      setOwnerNames(next);
    }).catch(() => {});
  }, [owner, user?.email, user?.name]);

  const loadAll = useCallback(async () => {
    try {
      const [rSessions, rInbox] = await Promise.all([
        fbFetch("/sessions").then(r => r.json()).catch(() => ({ sessions: [] })),
        fbInboxAccountService.list().catch(() => ({ success: false, data: { accounts: [] } }))
      ]);
      setSessions(rSessions.sessions || []);
      setConnErr(false);

      if (rInbox.success && rInbox.data) {
        setInboxAccounts((rInbox.data as any).accounts || []);
      }
    } catch {
      setConnErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 5000);
    return () => clearInterval(t);
  }, [loadAll]);

  // Thêm account via extension
  async function addAccount(relogin = false) {
    if (extInstalled === false) {
      showToast("Chưa cài extension trên trình duyệt này.", false);
      return;
    }
    setAdding(true);
    setStatus("⏳ Đang mở Facebook... Hãy đăng nhập tài khoản cần thêm trong tab mới. Hệ thống tự lưu khi xong.");
    const cfg = await getFbProvisionConfig();
    await provisionExtension({ serverUrl: cfg.serverUrl, owner, apiKey: cfg.extensionApiKey, label: user?.name || user?.email || owner });
    const res = await addAccountViaExtension();
    setAdding(false);
    if (res.success) {
      setStatus("");
      showToast(relogin ? "Đã đăng nhập lại tài khoản." : "Đã thêm tài khoản Facebook.", true);
      setTimeout(loadAll, 800);
    } else {
      setStatus("");
      showToast(res.error || "Thêm tài khoản thất bại.", false);
    }
  }

  // Tên
  const ownerLabel = (s: Session) => (s.owner && ownerNames[s.owner]) || "";
  const accLabel = (s: Session) => {
    const explicit = (s.label || "").trim();
    if (explicit && explicit !== s.user_id) return explicit;
    return s.email || ownerLabel(s) || "Tài khoản Facebook";
  };
  
  // Extension actions
  async function rename(uid: string, current: string) {
    const name = window.prompt("Đặt tên gợi nhớ cho tài khoản này:", current);
    if (!name || !name.trim()) return;
    try {
      await fbFetch(`/extensions/${encodeURIComponent(uid)}/label`, {
        method: "POST", headers: fbHeaders(), body: JSON.stringify({ label: name.trim() }),
      });
      showToast("Đã đổi tên tài khoản", true);
      loadAll();
    } catch { showToast("Lỗi đổi tên", false); }
  }

  async function removeSession(uid: string, label: string) {
    if (!window.confirm(`Xóa extension "${label}" khỏi hệ thống? (chỉ xóa phiên đã lưu, không ảnh hưởng Facebook)`)) return;
    try {
      await fbFetch(`/session/cookie/${encodeURIComponent(uid)}`, { method: "DELETE" });
      showToast("Đã xóa tài khoản", true);
      loadAll();
    } catch { showToast("Lỗi xóa", false); }
  }

  async function editMeta(s: Session) {
    const email = window.prompt("Email/SĐT đăng nhập của tài khoản này (để gợi nhắc khi cần đăng nhập lại):", s.email || "");
    if (email === null) return;
    const note = window.prompt("Ghi chú (tùy chọn):", s.note || "");
    if (note === null) return;
    try {
      await fbFetch("/session/meta", {
        method: "POST", headers: fbHeaders(),
        body: JSON.stringify({ user_id: s.user_id, email: email.trim(), note: note.trim() }),
      });
      showToast("Đã lưu thông tin gợi nhắc", true);
      loadAll();
    } catch { showToast("Lỗi lưu", false); }
  }

  async function genPairCode() {
    try {
      const cfg = await getFbProvisionConfig();
      const payload = JSON.stringify({ serverUrl: cfg.serverUrl, owner, apiKey: cfg.extensionApiKey, label: user?.name || user?.email || owner });
      const code = btoa(unescape(encodeURIComponent(payload)));
      setPairCode(code);
    } catch { showToast("Không tạo được mã", false); }
  }

  async function copyPairCode() {
    if (!pairCode) return;
    try { await navigator.clipboard.writeText(pairCode); showToast("Đã copy mã kết nối", true); }
    catch { showToast("Không copy được, hãy bôi đen + Ctrl C", false); }
  }

  // KPI actions
  async function linkKpi(acc: UnifiedAccount) {
    try {
      const res = await fbInboxAccountService.create({
        user_id: acc.user_id,
        fb_user_id: acc.fb_user_id || undefined,
        account_label: acc.label || undefined,
      });
      if (res.success) {
        showToast("Đã liên kết KPI thành công", true);
        loadAll();
        onChange?.();
      } else {
        showToast(res.message || "Liên kết thất bại", false);
      }
    } catch {
      showToast("Lỗi kết nối server", false);
    }
  }

  async function unlinkKpi(inboxId: string) {
    if (!window.confirm("Hủy liên kết KPI cho tài khoản này?")) return;
    try {
      const res = await fbInboxAccountService.delete(inboxId);
      if (res.success) {
        showToast("Đã hủy liên kết KPI", true);
        loadAll();
        onChange?.();
      } else {
        showToast(res.message || "Hủy liên kết thất bại", false);
      }
    } catch {
      showToast("Lỗi kết nối server", false);
    }
  }

  // Hợp nhất data
  const unifiedList: UnifiedAccount[] = [];
  for (const s of sessions) {
    const inbox = inboxAccounts.find(acc => acc.user_id === s.user_id || (acc.fb_user_id && acc.fb_user_id === s.fb_user_id));
    unifiedList.push({
      user_id: s.user_id,
      label: accLabel(s),
      fb_user_id: s.fb_user_id || inbox?.fb_user_id,
      online: !!s.online && !s.expired && !s.needs_relogin,
      needs_relogin: !!s.needs_relogin || !!s.expired,
      days_left: s.days_left,
      hasKpi: !!inbox,
      inboxAccountId: inbox?.id,
      session: s,
      inboxAccount: inbox,
      email: s.email,
      note: s.note,
      expired: s.expired,
    });
  }
  for (const inbox of inboxAccounts) {
    if (!unifiedList.some(u => u.user_id === inbox.user_id)) {
      unifiedList.push({
        user_id: inbox.user_id,
        label: inbox.account_label || inbox.user_id,
        fb_user_id: inbox.fb_user_id,
        online: false,
        needs_relogin: false,
        hasKpi: true,
        inboxAccountId: inbox.id,
        inboxAccount: inbox,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Thông tin kết nối Extension */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-base font-bold text-[#1A1A1A]">Thêm tài khoản mới</div>
            <div className="text-xs text-[#666666] mt-0.5">Bấm nút bên phải, đăng nhập Facebook như bình thường — hệ thống tự ghi nhớ.</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/markee-extension.zip" download
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition">
              <MaterialIcon name="download" className="text-[16px]" />
              Tải extension
            </a>
            <button onClick={() => addAccount(false)} disabled={adding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E3000F] text-white font-bold hover:bg-[#C40009] transition disabled:opacity-50 cursor-pointer shadow-sm">
              <FaPlus size={12} />
              {adding ? "Đang chờ đăng nhập..." : "Thêm tài khoản FB"}
            </button>
          </div>
        </div>
        {status && <div className="mt-3 text-sm text-[#666666] bg-[#F5F5F5] rounded-xl px-3 py-2">{status}</div>}
        {extInstalled === false && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-amber-700">
              <span className="font-semibold">Chưa phát hiện extension Markee trên trình duyệt này.</span>
              <span className="block mt-0.5 text-amber-600">Tải extension → giải nén → vào <code className="bg-amber-100 px-1 rounded">chrome://extensions</code> → bật Developer mode → Load unpacked → chọn thư mục vừa giải nén.</span>
            </div>
            <a href="/markee-extension.zip" download
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer">
              <MaterialIcon name="download" className="text-[16px]" />
              Tải extension
            </a>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-bold text-[#1A1A1A]">Thêm tài khoản ở máy / trình duyệt khác?</div>
              <div className="text-xs text-[#666666] mt-0.5">Tạo mã kết nối, mở extension ở máy đó → dán mã vào ô "① Dán mã kết nối" → tài khoản tự gắn về bạn.</div>
            </div>
            <button onClick={genPairCode} className="text-xs px-3 py-2 rounded-xl border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition cursor-pointer">Tạo mã kết nối</button>
          </div>
          {pairCode && (
            <div className="mt-3 flex gap-2">
              <input readOnly value={pairCode} onFocus={e => e.currentTarget.select()}
                className="flex-1 border border-[#E5E5E5] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1A1A] bg-[#F5F5F5] outline-none focus:border-[#E3000F]" />
              <button onClick={copyPairCode} className="text-xs px-4 py-2 rounded-xl bg-[#E3000F] text-white font-bold hover:bg-[#C40009] transition cursor-pointer">Copy</button>
            </div>
          )}
        </div>
      </div>

      {connErr && <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-700">⚠️ Không kết nối được Facebook automation service. Kiểm tra backend.</div>}

      {/* Account Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm">
        <div className="px-4 py-3 border-b border-[#E5E5E5] bg-[#F5F5F5]/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1A1A1A]">Danh sách Tài khoản FB & KPI</h2>
          <span className="text-xs font-semibold text-[#666666] px-2 py-0.5 bg-[#E5E5E5] rounded-full">{unifiedList.length} tài khoản</span>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#E3000F] rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[#666666] text-xs">Đang tải dữ liệu...</p>
          </div>
        ) : unifiedList.length === 0 ? (
          <div className="text-center py-12 bg-[#F5F5F5]/50">
            <FaFacebook className="text-4xl text-[#A0A0A0] mx-auto mb-2" size={32} />
            <p className="text-[#666666] text-xs">Chưa có tài khoản Facebook nào được thêm</p>
            <p className="text-[#A0A0A0] text-[10px] mt-1">Hãy cài extension và thêm tài khoản để bắt đầu</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tên hiển thị & Meta</th>
                <th className="py-3 px-4">User ID (FB)</th>
                <th className="py-3 px-4">Trạng thái Extension</th>
                <th className="py-3 px-4 text-center">Tính KPI Inbox</th>
                <th className="py-3 px-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] text-[#666666]">
              {unifiedList.map((acc) => (
                <tr key={acc.user_id} className="hover:bg-[#F5F5F5]/30 transition">
                  <td className="py-3.5 px-4 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0866FF]/10 text-[#0866FF] flex items-center justify-center shrink-0">
                        <FaFacebook size={12} />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-[#1A1A1A] flex items-center gap-1">
                          {acc.label}
                          {acc.session && <button onClick={() => rename(acc.user_id, acc.label)} title="Đổi tên hiển thị" className="text-[10px] text-[#A0A0A0] hover:text-[#E3000F] cursor-pointer">✎</button>}
                        </div>
                        {(acc.email || acc.note) && (
                          <div className="text-[10px] text-[#A0A0A0] truncate max-w-[200px] mt-0.5">
                            {acc.email && <span title="Email đăng nhập">✉ {acc.email}</span>}
                            {acc.note && <span> · {acc.note}</span>}
                            {acc.session && <button onClick={() => acc.session && editMeta(acc.session)} title="Sửa meta" className="ml-1 text-[10px] text-[#A0A0A0] hover:text-[#E3000F] cursor-pointer">✎</button>}
                          </div>
                        )}
                        {!acc.email && !acc.note && acc.session && (
                          <div className="text-[10px] mt-0.5 text-[#A0A0A0]">
                            <span className="italic">Chưa có thông tin</span>
                            <button onClick={() => acc.session && editMeta(acc.session)} className="ml-1 hover:text-[#E3000F] cursor-pointer">Thêm</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <div className="text-[#1A1A1A]">{acc.fb_user_id || "—"}</div>
                    <div className="text-[#A0A0A0] text-[9px] mt-0.5 truncate max-w-[120px]" title={acc.user_id}>UID: {acc.user_id.replace(/^fb_/, "")}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {!acc.session ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#F5F5F5] text-[#A0A0A0] border-[#E5E5E5]">
                        Offline (Lưu KPI)
                      </span>
                    ) : acc.online ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                          🟢 Sẵn sàng
                        </span>
                        {typeof acc.days_left === "number" && <span className="text-[9px] text-[#A0A0A0]">Còn {Math.round(acc.days_left)} ngày</span>}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">
                        🔴 Cần đăng nhập lại
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {acc.hasKpi ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          <MaterialIcon name="check_circle" className="text-[12px]" /> Đã bật KPI
                        </span>
                        <button onClick={() => acc.inboxAccountId && unlinkKpi(acc.inboxAccountId)} className="text-[9px] text-[#A0A0A0] hover:text-red-500 underline cursor-pointer transition">Hủy KPI</button>
                      </div>
                    ) : (
                      <button onClick={() => linkKpi(acc)} className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#E3000F]/10 hover:bg-[#E3000F]/20 text-[#E3000F] border border-[#E3000F]/20 px-2.5 py-1.5 rounded-md transition cursor-pointer">
                        <FaLink size={10} /> Bật tính KPI
                      </button>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {acc.session && acc.needs_relogin && (
                        <button onClick={() => addAccount(true)} disabled={adding}
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-bold transition cursor-pointer disabled:opacity-50">
                          Đăng nhập lại
                        </button>
                      )}
                      {acc.session && (
                        <button onClick={() => removeSession(acc.user_id, acc.label)}
                          className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-[10px] font-bold transition cursor-pointer">
                          Xóa Ext
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && (
        <div className={cn("fixed bottom-6 right-6 px-5 py-3.5 rounded-xl text-white font-bold shadow-xl animate-in slide-in-from-bottom-5 z-50 flex items-center gap-2", toast.ok ? "bg-emerald-600" : "bg-[#E3000F]")}>
          <MaterialIcon name={toast.ok ? "check_circle" : "error"} className="text-lg" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
