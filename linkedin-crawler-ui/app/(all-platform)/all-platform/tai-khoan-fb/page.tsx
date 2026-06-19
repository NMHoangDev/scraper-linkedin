"use client";

/**
 * Trang TÀI KHOẢN FACEBOOK (seeding) — trung tâm quản lý acc FB.
 * Cách A: gọi thẳng Markee service. Dùng extension để THÊM acc (người login tay → lụm cookie).
 *
 * Luồng người dùng (ẩn hết kỹ thuật):
 *   - "Thêm tài khoản FB" → tab Facebook tự mở → đăng nhập → xong, acc hiện ra.
 *   - Acc 🟢 Sẵn sàng / 🔴 Cần đăng nhập lại (cookie hết hạn) → bấm "Đăng nhập lại".
 *   - Acc đã thêm DÙNG CHUNG cho Đăng bài + Inbox + Cào.
 */

import { useEffect, useState, useCallback } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { MaterialIcon } from "@/components/ui";
import { provisionExtension, pingExtension, addAccountViaExtension } from "@/lib/markee-ext-provision";
import { fbFetch, fbHeaders, getFbProvisionConfig } from "@/lib/markee-fb-api";
import { usersService } from "@/services/all-platform.service";

interface Session {
  user_id: string; fb_user_id?: string; label?: string; owner?: string; email?: string; note?: string;
  online?: boolean; expired?: boolean; days_left?: number | null; cookie_count?: number; needs_relogin?: boolean;
}

export default function TaiKhoanFbPage() {
  const { user } = useAppAuth();
  const owner = user?.id || "";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [connErr, setConnErr] = useState(false);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  // Tự provision + ping extension khi vào trang (gắn owner cho các acc thêm ở đây)
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

  const load = useCallback(async () => {
    try {
      const r = await fbFetch("/sessions");
      const d = await r.json();
      setSessions(d.sessions || []);
      setConnErr(false);
    } catch { setConnErr(true); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function addAccount(relogin = false) {
    if (extInstalled === false) {
      showToast("Chưa cài extension trên trình duyệt này.", false);
      return;
    }
    setAdding(true);
    setStatus("⏳ Đang mở Facebook... Hãy đăng nhập tài khoản cần thêm trong tab mới. Hệ thống tự lưu khi xong.");
    // Đảm bảo owner đã gắn trước khi login
    const cfg = await getFbProvisionConfig();
    await provisionExtension({ serverUrl: cfg.serverUrl, owner, apiKey: cfg.extensionApiKey, label: user?.name || user?.email || owner });
    const res = await addAccountViaExtension();
    setAdding(false);
    if (res.success) {
      setStatus("");
      showToast(relogin ? "Đã đăng nhập lại tài khoản." : "Đã thêm tài khoản Facebook.", true);
      setTimeout(load, 800);
    } else {
      setStatus("");
      showToast(res.error || "Thêm tài khoản thất bại.", false);
    }
  }

  async function rename(uid: string, current: string) {
    const name = window.prompt("Đặt tên gợi nhớ cho tài khoản này:", current);
    if (!name || !name.trim()) return;
    try {
      await fbFetch(`/extensions/${encodeURIComponent(uid)}/label`, {
        method: "POST", headers: fbHeaders(), body: JSON.stringify({ label: name.trim() }),
      });
      showToast("Đã đổi tên tài khoản", true);
      load();
    } catch { showToast("Lỗi đổi tên", false); }
  }

  async function removeSession(uid: string, label: string) {
    if (!window.confirm(`Xóa tài khoản "${label}" khỏi hệ thống? (chỉ xóa phiên đã lưu, không ảnh hưởng Facebook)`)) return;
    try {
      await fbFetch(`/session/cookie/${encodeURIComponent(uid)}`, { method: "DELETE" });
      showToast("Đã xóa tài khoản", true);
      load();
    } catch { showToast("Lỗi xóa", false); }
  }

  const shortFbId = (id: string) => {
    const raw = id.replace(/^fb_/, "");
    return raw.length > 10 ? `fb ${raw.slice(0, 4)}...${raw.slice(-4)}` : id;
  };
  const ownerLabel = (s: Session) => (s.owner && ownerNames[s.owner]) || "";
  const accLabel = (s: Session) => {
    const explicit = (s.label || "").trim();
    if (explicit && explicit !== s.user_id) return explicit;
    return s.email || ownerLabel(s) || "Tài khoản Facebook";
  };
  const accMeta = (s: Session) => {
    const parts = [shortFbId(s.user_id)];
    const ownerName = ownerLabel(s);
    if (ownerName && ownerName !== accLabel(s)) parts.push(`của ${ownerName}`);
    return parts.join(" · ");
  };

  // Sửa email + ghi chú gợi nhắc (KHÔNG lưu mật khẩu).
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
      load();
    } catch { showToast("Lỗi lưu", false); }
  }

  // Tạo mã kết nối (base64 của {serverUrl, owner, apiKey}) để dán vào extension ở máy/profile khác.
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

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-1">
        <MaterialIcon name="account_circle" className="text-[#E3000F]" />
        <h1 className="text-xl font-black text-[#1A1A1A]">Tài khoản Facebook</h1>
      </div>
      <p className="text-sm text-[#666666] mb-6">Mỗi tài khoản chỉ cần đăng nhập 1 lần. Tài khoản đã thêm dùng chung cho Đăng bài, Inbox và Cào dữ liệu.</p>

      {connErr && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-700">⚠️ Không kết nối được Facebook automation service. Kiểm tra backend product và Markee service.</div>}

      <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-base font-bold text-[#1A1A1A]">Thêm tài khoản mới</div>
            <div className="text-xs text-[#666666] mt-0.5">Bấm nút bên phải, đăng nhập Facebook như bình thường — hệ thống tự ghi nhớ.</div>
          </div>
          <button onClick={() => addAccount(false)} disabled={adding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E3000F] text-white font-bold hover:bg-[#C40009] transition disabled:opacity-50">
            <MaterialIcon name="person_add" className="text-[18px]" />
            {adding ? "Đang chờ đăng nhập..." : "Thêm tài khoản FB"}
          </button>
        </div>
        {status && <div className="mt-3 text-sm text-[#666666] bg-[#F5F5F5] rounded-lg px-3 py-2">{status}</div>}
        {extInstalled === false && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-amber-700">
              <span className="font-semibold">Chưa phát hiện extension Markee trên trình duyệt này.</span>
              <span className="block mt-0.5 text-amber-600">Tải extension → giải nén → vào <code className="bg-amber-100 px-1 rounded">chrome://extensions</code> → bật Developer mode → Load unpacked → chọn thư mục vừa giải nén.</span>
            </div>
            <a href="/markee-extension.zip" download
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition">
              <MaterialIcon name="download" className="text-[16px]" />
              Tải extension
            </a>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-bold text-[#1A1A1A]">Thêm tài khoản ở máy / trình duyệt khác?</div>
              <div className="text-xs text-[#666666] mt-0.5">Tạo mã kết nối, mở extension ở máy đó → dán mã vào ô &quot;① Dán mã kết nối&quot; → tài khoản tự gắn về bạn.</div>
            </div>
            <button onClick={genPairCode} className="text-xs px-3 py-2 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">Tạo mã kết nối</button>
          </div>
          {pairCode && (
            <div className="mt-3 flex gap-2">
              <input readOnly value={pairCode} onFocus={e => e.currentTarget.select()}
                className="flex-1 border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs font-mono text-[#1A1A1A] bg-[#F5F5F5]" />
              <button onClick={copyPairCode} className="text-xs px-4 py-2 rounded-lg bg-[#E3000F] text-white font-bold hover:bg-[#C40009] transition">Copy</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E5E5] p-5">
        <h2 className="text-base font-bold text-[#1A1A1A] mb-4">Tài khoản đã thêm ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <div className="text-center text-[#A0A0A0] py-10 text-sm">Chưa có tài khoản nào. Bấm &quot;Thêm tài khoản FB&quot; để bắt đầu.</div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const ready = !s.expired && !s.needs_relogin;
              return (
                <div key={s.user_id} className="flex items-center justify-between gap-3 border border-[#E5E5E5] rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ready ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1A1A1A] truncate">{accLabel(s)}
                        <button onClick={() => rename(s.user_id, accLabel(s))} title="Đổi tên" className="ml-1.5 text-[11px] text-[#A0A0A0] hover:text-[#E3000F]">✎</button>
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-[#A0A0A0]" title={s.user_id}>{accMeta(s)}</div>
                      <div className="text-xs text-[#A0A0A0]">
                        {ready ? <span className="text-green-600 font-semibold">🟢 Sẵn sàng</span> : <span className="text-red-500 font-semibold">🔴 Cần đăng nhập lại</span>}
                        {s.online && ready ? " · đang online" : ""}
                        {typeof s.days_left === "number" && ready ? ` · còn ${Math.round(s.days_left)} ngày` : ""}
                      </div>
                      <div className="text-xs text-[#A0A0A0] truncate mt-0.5">
                        {s.email ? <span title="Email/SĐT đăng nhập">✉ {s.email}</span> : <span className="italic">chưa có email gợi nhắc</span>}
                        {s.note ? <span> · {s.note}</span> : ""}
                        <button onClick={() => editMeta(s)} title="Sửa email/ghi chú" className="ml-1.5 text-[#A0A0A0] hover:text-[#E3000F]">✎</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!ready && <button onClick={() => addAccount(true)} disabled={adding}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#E3000F] text-white font-bold hover:bg-[#C40009] transition disabled:opacity-50">Đăng nhập lại</button>}
                    <button onClick={() => removeSession(s.user_id, accLabel(s))}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-semibold transition">Xóa</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-lg text-white font-semibold shadow-lg ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>}
    </div>
  );
}
