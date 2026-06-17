"use client";

/**
 * Trang INBOX FACEBOOK (seeding) — tích hợp vào dashboard all-platform.
 * Cách A: UI nằm trong dashboard, gọi thẳng MARKEE SERVICE (inbox server-side Playwright + cookie).
 *
 * Luồng: chọn acc (có cookie) -> "Quét ngay" -> hiện hội thoại CHƯA ĐỌC
 *   -> đánh dấu "Là khách" -> "Mở chat" (tải full) -> trả lời / đẩy Zalo.
 * Inbox chạy server-side ngầm (giống cào), không cần extension mở browser.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { MaterialIcon } from "@/components/ui";
import { provisionExtension, pingExtension } from "@/lib/markee-ext-provision";
import { fbFetch, fbHeaders, getFbProvisionConfig } from "@/lib/markee-fb-api";
import { API_BASE_URL } from "@/lib/env";
import { idbSetThread, idbGetAllThreadsForAcc, idbSetConvs, idbGetConvs, idbPruneOld } from "@/lib/inbox-cache";
import TeamAccountTree from "@/components/all-platform/inbox/TeamAccountTree";

interface Session { user_id: string; fb_user_id?: string; label?: string; owner?: string; online?: boolean; status?: string; }
interface Conv { conv_id: string; name: string; preview: string; unread: boolean; time: string; is_customer: boolean; pushed_to_zalo: boolean; deleted: boolean; }
interface Msg { from: "me" | "them"; text: string; time: string; }
interface UserRow { id?: string; email?: string; name?: string; }

export default function InboxPage() {
  const { user } = useAppAuth();
  const owner = user?.id || "";
  const role = user?.role || "member";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [acc, setAcc] = useState("");
  // Query scope theo role: member=của mình, leader=team, admin=hết. "" = chưa tính xong.
  const [ownerScope, setOwnerScope] = useState<string | null>(null);
  // Map id nhân viên (owner) -> tên hiển thị, để chip + hội thoại biết acc CỦA AI (không hiện fb_id).
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "customer" | "need_reply">("all");
  const [openConv, setOpenConv] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingFresh, setLoadingFresh] = useState(false); // đang chờ extension push bản mới (có cache rồi)
  const [needRelogin, setNeedRelogin] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [connErr, setConnErr] = useState(false);
  const openConvRef = useRef("");
  const msgsRef = useRef<Msg[]>([]);
  // Client-side cache: conv_id → msgs (RAM); được backup BỀN xuống IndexedDB qua saveThreadCache.
  const clientCacheRef = useRef<Map<string, Msg[]>>(new Map());
  // conv_id → loaded_at gần nhất (để biết dữ liệu mới tới mức nào → quyết định có quét lại không)
  const loadedAtRef = useRef<Map<string, string | null>>(new Map());
  // Chống chồng lệnh silent scan (1 lệnh đang chạy thì bỏ qua lần kế)
  const scanInFlightRef = useRef(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  // Lưu cache thread vào CẢ RAM (clientCacheRef) lẫn IndexedDB (bền qua reload).
  // loadedAt: nếu không truyền, giữ lại loaded_at đã biết của hội thoại đó.
  const saveThreadCache = useCallback((convId: string, list: Msg[], loadedAt?: string | null) => {
    clientCacheRef.current.set(convId, list);
    const la = loadedAt === undefined ? (loadedAtRef.current.get(convId) ?? null) : loadedAt;
    loadedAtRef.current.set(convId, la);
    void idbSetThread(acc, convId, list, la);
  }, [acc]);

  // Dọn cache thread cũ (>30 ngày) 1 lần khi vào trang để IndexedDB không phình mãi.
  useEffect(() => { void idbPruneOld(); }, []);

  // Tính phạm vi xem inbox theo role + map tên nhân viên:
  //  - admin  -> "" (xem HẾT) + lấy tên từ /users/all-profiles
  //  - leader -> "?owners=<self>,<member ids>" (cả team) + tên từ team members
  //  - member -> "?owner=<self>" (chỉ mình) + tên chính mình
  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    const myName = user?.name || user?.email || owner;
    const buildMap = (rows: UserRow[]): Record<string, string> => {
      const m: Record<string, string> = { [owner]: myName };
      for (const u of rows || []) {
        if (u?.id) m[u.id] = u.name || u.email || u.id;
      }
      return m;
    };
    (async () => {
      if (role === "admin") {
        if (!cancelled) setOwnerScope("");
        try {
          const r = await fetch(`${API_BASE_URL}/api/all-platform/users/all-profiles`);
          const d = await r.json().catch(() => ({}));
          if (!cancelled) setOwnerNames(buildMap(Array.isArray(d?.data) ? d.data : []));
        } catch { if (!cancelled) setOwnerNames({ [owner]: myName }); }
        return;
      }
      if (role === "leader") {
        try {
          const r = await fetch(`${API_BASE_URL}/api/all-platform/teams/members?leader_id=${encodeURIComponent(owner)}`);
          const d = await r.json().catch(() => ({}));
          const rows: UserRow[] = Array.isArray(d?.data) ? d.data : [];
          const ids = rows.map(m => m?.id).filter(Boolean);
          const all = Array.from(new Set([owner, ...ids]));
          if (!cancelled) { setOwnerScope(`?owners=${encodeURIComponent(all.join(","))}`); setOwnerNames(buildMap(rows)); }
        } catch {
          if (!cancelled) { setOwnerScope(`?owner=${encodeURIComponent(owner)}`); setOwnerNames({ [owner]: myName }); }
        }
        return;
      }
      // member
      if (!cancelled) { setOwnerScope(`?owner=${encodeURIComponent(owner)}`); setOwnerNames({ [owner]: myName }); }
    })();
    return () => { cancelled = true; };
  }, [owner, role, user?.email, user?.name]);

  // Inbox đọc DOM Messenger ĐÃ GIẢI MÃ trên máy seeder (giải được e2ee) -> cần extension ONLINE.
  // Tự provision (gắn owner + label=tên nhân viên) khi vào trang. label để admin/leader biết acc của AI.
  useEffect(() => {
    if (!owner) return;
    (async () => {
      const { installed } = await pingExtension();
      setExtInstalled(installed);
      const myLabel = user?.name || user?.email || owner;
      if (installed) {
        const cfg = await getFbProvisionConfig();
        await provisionExtension({ serverUrl: cfg.serverUrl, owner, apiKey: cfg.extensionApiKey, label: myLabel });
      }
    })();
  }, [owner, user?.name, user?.email]);

  const loadSessions = useCallback(async () => {
    if (ownerScope === null) return; // chờ tính xong phạm vi theo role
    try {
      // Nguồn acc = /sessions (BỀN, đọc từ file cookie) -> acc OFFLINE (nhân viên tắt máy) VẪN HIỆN
      // để sếp xem tin cũ. /extensions chỉ có acc online -> tắt máy là mất dấu. Phạm vi theo role.
      const r = await fbFetch("/sessions");
      const d = await r.json();
      // Chuẩn hóa: /sessions trả `online` (boolean) -> map sang status để UI dùng chung
      const list: Session[] = (d.sessions || []).map((s: Session) => ({
        ...s,
        status: s.online ? "online" : "offline",
      }));
      setSessions(list);
      setConnErr(false);
      // Tự chọn: ưu tiên giữ acc đang chọn; nếu chưa có thì chọn acc ONLINE đầu, không có online thì acc đầu
      setAcc(prev => {
        if (prev && list.some(e => e.user_id === prev)) return prev;
        const firstOnline = list.find(e => e.status === "online");
        return (firstOnline || list[0])?.user_id || "";
      });
    } catch { setConnErr(true); }
  }, [ownerScope]);

  const loadConvs = useCallback(async () => {
    if (!acc) return;
    try {
      const r = await fbFetch(`/inbox/conversations?user_id=${encodeURIComponent(acc)}`);
      const d = await r.json();
      const list: Conv[] = d.conversations || [];
      setConvs(list);
      setNeedRelogin(!!d.needs_relogin);
      void idbSetConvs(acc, list); // lưu để F5 hiện hộp thư ngay
    } catch { /* ignore */ }
  }, [acc]);

  // Khi đổi acc: nạp cache BỀN từ IndexedDB → mở hội thoại tức thì + hiện hộp thư ngay (trước fetch mạng).
  useEffect(() => {
    if (!acc) return;
    let cancelled = false;
    clientCacheRef.current = new Map();
    loadedAtRef.current = new Map();
    (async () => {
      const [threads, cachedConvs] = await Promise.all([
        idbGetAllThreadsForAcc<Msg>(acc),
        idbGetConvs<Conv>(acc),
      ]);
      if (cancelled) return;
      for (const [cid, t] of Object.entries(threads)) {
        clientCacheRef.current.set(cid, t.messages || []);
        loadedAtRef.current.set(cid, t.loaded_at ?? null);
      }
      // Chỉ hiện convs cache nếu list hiện chưa có (chưa kịp fetch mạng) — tránh đè dữ liệu mới.
      if (cachedConvs?.length) setConvs(prev => (prev.length ? prev : cachedConvs));
    })();
    return () => { cancelled = true; };
  }, [acc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
    const t = setInterval(loadSessions, 6000);
    return () => clearInterval(t);
  }, [loadSessions]);
  useEffect(() => {
    if (!acc) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConvs();
    const t = setInterval(loadConvs, 3000);
    return () => clearInterval(t);
  }, [acc, loadConvs]);

  // Tự quét ngầm định kỳ để hộp thư luôn cập nhật mà KHÔNG cần bấm "Quét ngay".
  // CHỈ quét khi acc ONLINE (máy nhân viên đang mở) — acc offline quét vô ích, lệnh không ai nhận.
  useEffect(() => {
    if (!acc) return;
    const isOnline = sessions.find(s => s.user_id === acc)?.status === "online";
    if (!isOnline || needRelogin) return; // offline / cookie hết hạn -> chỉ xem tin cũ, không quét
    const silentScan = () => {
      if (scanInFlightRef.current) return; // đang có lệnh quét chạy → bỏ qua, tránh chồng lệnh
      scanInFlightRef.current = true;
      fbFetch("/inbox/scan", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc }) })
        .catch(() => {})
        .finally(() => { scanInFlightRef.current = false; });
    };
    silentScan(); // quét ngay khi chọn acc
    const t = setInterval(silentScan, 30000); // và mỗi 30s
    return () => clearInterval(t);
  }, [acc, sessions, needRelogin]);

  // Phát hiện KHÁCH mới nhắn → badge tab + sound + browser notification
  const prevConvIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!convs.length) return;
    const customerUnread = convs.filter(c => !c.deleted && c.unread && c.is_customer);
    const newCustomers = customerUnread.filter(c => !prevConvIdsRef.current.has(c.conv_id));
    if (newCustomers.length > 0 && prevConvIdsRef.current.size > 0) {
      // Sound notification (Web Audio API)
      try {
        const ctx = new AudioContext();
        [0, 0.18].forEach(delay => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = delay === 0 ? 784 : 1047; osc.type = "sine";
          gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
          osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.3);
        });
      } catch { /* ignore */ }
      // Browser notification
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        newCustomers.forEach(c => new Notification(`Khách nhắn: ${c.name || ""}`, { body: c.preview || "Có tin nhắn mới", icon: "/favicon.ico", tag: c.conv_id }));
      } else if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    prevConvIdsRef.current = new Set(convs.map(c => c.conv_id));
    // Tab title badge — chỉ đếm khách chưa đọc
    const count = customerUnread.length;
    document.title = count > 0 ? `(${count}) Khách mới — Inbox` : "Inbox FB — Seeding";
    return () => { document.title = "Seeding"; };
  }, [convs]);

  async function scan() {
    if (!acc) return showToast("Chưa chọn tài khoản", false);
    setScanning(true);
    try {
      // Quét sâu: lấy danh sách + nội dung thread 3 ngày gần nhất
      const r = await fbFetch("/inbox/scan_deep", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        showToast("Đang quét sâu... extension tải nội dung tin nhắn 3 ngày gần nhất (1-2 phút).", true);
        // Poll nhiều lần để bắt kết quả từng thread khi extension gửi về dần
        [8000, 16000, 30000, 45000, 60000].forEach(ms => setTimeout(loadConvs, ms));
      } else {
        showToast(d.detail || "Lỗi quét", false);
      }
    } catch { showToast("Không kết nối được Markee", false); }
    setScanning(false);
  }

  async function mark(conv_id: string, field: string, value: boolean) {
    try {
      const r = await fbFetch("/inbox/mark", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id, field, value }) });
      if (r.ok) { setConvs(prev => prev.map(c => c.conv_id === conv_id ? { ...c, [field]: value } : c)); }
      else { const d = await r.json().catch(() => ({})); showToast(d.detail || "Lỗi", false); }
    } catch { showToast("Không kết nối được", false); }
  }

  async function openChat(conv_id: string) {
    setOpenConv(conv_id); openConvRef.current = conv_id; setMsgs([]); msgsRef.current = []; setLoadingChat(true);

    // 1. Hiện client cache NGAY LẬP TỨC nếu có (không cần request server)
    const clientCached = clientCacheRef.current.get(conv_id);
    if (clientCached?.length) {
      setMsgs(clientCached); msgsRef.current = clientCached; setLoadingChat(false); setLoadingFresh(true);
    }

    let prevLoadedAt: string | null = null;
    try {
      // 2. Lấy server cache (để có loaded_at + fallback nếu client cache rỗng)
      const r0 = await fbFetch(`/inbox/thread?user_id=${encodeURIComponent(acc)}&conv_id=${encodeURIComponent(conv_id)}`);
      const d0 = await r0.json().catch(() => ({}));
      if (openConvRef.current !== conv_id) return;
      prevLoadedAt = d0.loaded_at || null;
      loadedAtRef.current.set(conv_id, prevLoadedAt);
      if (d0.messages?.length) {
        // Chỉ hiện server cache nếu nhiều tin hơn client cache (tránh overwrite tin optimistic mới gửi)
        if (d0.messages.length >= msgsRef.current.length) {
          setMsgs(d0.messages); msgsRef.current = d0.messages;
          saveThreadCache(conv_id, d0.messages, prevLoadedAt);
        }
        setLoadingChat(false); setLoadingFresh(true);
      }
    } catch { /* ignore */ }
    // Bỏ ép quét lại CHỈ KHI đã có sẵn tin VÀ dữ liệu vừa quét gần đây (loaded_at < 25s).
    // Hội thoại trống (extension mới thêm, chưa có nội dung) thì PHẢI quét — đừng skip.
    const la = prevLoadedAt ? Date.parse(prevLoadedAt) : NaN;
    if (msgsRef.current.length > 0 && !Number.isNaN(la) && Date.now() - la < 25000) {
      setLoadingChat(false); setLoadingFresh(false); return;
    }
    try {
      // 3. Yêu cầu extension tải bản mới nhất
      const r = await fbFetch("/inbox/thread", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id }) });
      if (!r.ok) { setLoadingChat(false); setLoadingFresh(false); return; }
      pollFreshThread(conv_id, prevLoadedAt, 20);
    } catch { setLoadingChat(false); setLoadingFresh(false); }
  }

  // Hỏi lại mỗi 3s tới khi extension trả nội dung. Hiện tin NGAY khi có (theo số tin tăng),
  // dừng hẳn khi loaded_at đổi (extension báo quét xong). Trống lâu → quét lại 1 lần giữa chừng.
  async function pollFreshThread(conv_id: string, prevLoadedAt: string | null, attemptsLeft: number) {
    if (openConvRef.current !== conv_id) return;
    try {
      const r = await fbFetch(`/inbox/thread?user_id=${encodeURIComponent(acc)}&conv_id=${encodeURIComponent(conv_id)}`);
      const d = await r.json();
      const fresh: Msg[] = d.messages || [];
      // Có nhiều tin hơn hiện tại → hiện ngay (kể cả khi loaded_at chưa đổi)
      if (fresh.length > msgsRef.current.length) {
        setMsgs(fresh); msgsRef.current = fresh;
        saveThreadCache(conv_id, fresh, d.loaded_at ?? undefined);
        setLoadingChat(false);
      }
      // loaded_at đổi = extension đã quét xong → chốt
      if (d.loaded_at && d.loaded_at !== prevLoadedAt) {
        setLoadingChat(false); setLoadingFresh(false); return;
      }
    } catch { /* ignore, thử lại */ }
    // Vẫn trống sau ~30s → đẩy lại 1 lệnh quét (extension lần đầu hay rớt lệnh)
    if (attemptsLeft === 10 && msgsRef.current.length === 0) {
      fbFetch("/inbox/thread", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id }) }).catch(() => {});
    }
    if (attemptsLeft <= 1) { setLoadingChat(false); setLoadingFresh(false); return; }
    setTimeout(() => pollFreshThread(conv_id, prevLoadedAt, attemptsLeft - 1), 3000);
  }

  async function fetchThread(conv_id: string) {
    if (openConvRef.current !== conv_id) return;
    try {
      const r = await fbFetch(`/inbox/thread?user_id=${encodeURIComponent(acc)}&conv_id=${encodeURIComponent(conv_id)}`);
      const d = await r.json();
      const fetched: Msg[] = d.messages || [];
      if (fetched.length >= msgsRef.current.length) {
        setMsgs(fetched); msgsRef.current = fetched;
        saveThreadCache(conv_id, fetched, d.loaded_at ?? undefined);
      }
    } catch { /* ignore */ }
  }

  // Poll tin mới incremental khi đang xem hội thoại (append delta thay vì reload full)
  useEffect(() => {
    if (!openConv || !acc) return;
    const t = setInterval(async () => {
      const reqN = msgsRef.current.length; // số tin lúc gửi request — để khử trùng nếu list đổi giữa chừng
      try {
        // Còn trống → lấy FULL để bắt lô tin đầu (extension quét lần đầu chậm). Có rồi → lấy delta.
        const url = reqN === 0
          ? `/inbox/thread?user_id=${encodeURIComponent(acc)}&conv_id=${encodeURIComponent(openConv)}`
          : `/inbox/thread?user_id=${encodeURIComponent(acc)}&conv_id=${encodeURIComponent(openConv)}&since_n=${reqN}`;
        const r = await fbFetch(url);
        const d = await r.json();
        if (!Array.isArray(d.messages) || d.messages.length === 0) return;
        // Nếu list đã thay đổi (poll chính vừa thay) thì bỏ delta cũ này — vòng sau sẽ bắt lại đúng since_n.
        if (msgsRef.current.length !== reqN) return;
        if (reqN === 0) {
          setMsgs(d.messages); msgsRef.current = d.messages; saveThreadCache(openConv, d.messages, d.loaded_at ?? undefined);
        } else {
          setMsgs(prev => { const next = [...prev, ...d.messages]; msgsRef.current = next; saveThreadCache(openConv, next, d.loaded_at ?? undefined); return next; });
        }
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(t);
  }, [openConv, acc, saveThreadCache]);

  async function sendReply() {
    const text = reply.trim();
    if (!text || !openConv) return;
    // Chặn gửi khi tài khoản offline / cookie hết hạn — lệnh sẽ không ai xử lý, tránh kẹt "chưa rõ kết quả".
    const accOnline = sessions.find(s => s.user_id === acc)?.status === "online";
    if (!accOnline) { showToast("Tài khoản đang offline (máy nhân viên chưa mở) — chưa gửi được.", false); return; }
    if (needRelogin) { showToast("Cookie tài khoản đã hết hạn — đăng nhập lại trước khi gửi.", false); return; }
    setReply("");
    // Optimistic: hiện NGAY tin mình vừa gửi trong khung chat (đỡ cảm giác "gửi xong chả biết")
    const optimistic: Msg = { from: "me", text, time: "Đang gửi..." };
    setMsgs(prev => { const next = [...prev, optimistic]; msgsRef.current = next; return next; });
    const setStatus = (t: string) => setMsgs(prev => prev.map(m => m === optimistic ? { ...m, time: t } : m));
    try {
      const r = await fbFetch("/inbox/reply", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id: openConv, text }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(d.detail || "Lỗi gửi", false); setStatus("✗ Gửi lỗi"); return; }
      // Chờ extension XÁC NHẬN gửi thật (poll reply_status theo command_id) — không báo "Đã gửi" khi mới đẩy lệnh
      const cmd = d.command_id;
      if (!cmd) { setStatus("Đã gửi (đang xác nhận)"); return; }
      pollReplyStatus(cmd, setStatus, 12);
    } catch {
      showToast("Không kết nối được", false); setStatus("✗ Gửi lỗi");
    }
  }

  // Hỏi /inbox/reply_status mỗi 2s tới khi extension báo done. sent=true -> "Đã gửi ✓"; false -> "✗ FB từ chối".
  async function pollReplyStatus(cmd: string, setStatus: (t: string) => void, attemptsLeft: number) {
    try {
      const r = await fbFetch(`/inbox/reply_status?command_id=${encodeURIComponent(cmd)}`);
      const d = await r.json();
      if (d.done) {
        if (d.sent) { setStatus("Đã gửi ✓"); saveThreadCache(openConvRef.current, msgsRef.current); showToast("Đã gửi tin thành công", true); setTimeout(() => fetchThread(openConvRef.current), 7000); }
        else { setStatus("✗ Gửi thất bại"); showToast("FB chưa gửi được — thử lại", false); }
        return;
      }
    } catch { /* ignore, thử lại */ }
    if (attemptsLeft <= 1) { setStatus("Đã gửi (chưa rõ kết quả)"); return; }
    setTimeout(() => pollReplyStatus(cmd, setStatus, attemptsLeft - 1), 2000);
  }

  // "Cần trả lời" = tin CUỐI trong hội thoại là của khách. Nếu đã có thread cache → xét tin cuối;
  // chưa có cache → tạm dựa vào cờ unread (chưa đọc thường là khách vừa nhắn).
  const needsReply = (c: Conv): boolean => {
    const cached = clientCacheRef.current.get(c.conv_id);
    if (cached?.length) return cached[cached.length - 1]?.from === "them";
    return c.unread;
  };
  const visible = convs.filter(c => !c.deleted && (
    filter === "unread" ? c.unread :
    filter === "customer" ? c.is_customer :
    filter === "need_reply" ? needsReply(c) :
    true
  ));
  // Nổi ưu tiên lên đầu: cần trả lời > chưa đọc > khách; giữ thứ tự gốc trong cùng nhóm.
  const rank = (c: Conv) => (needsReply(c) ? 4 : 0) + (c.unread ? 2 : 0) + (c.is_customer ? 1 : 0);
  const filtered = visible
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(b.c) - rank(a.c) || a.i - b.i)
    .map(x => x.c);
  // Nhãn chip = TÊN NHÂN VIÊN (map từ owner id). Fallback: label cũ -> fb_id. Để admin/leader biết acc CỦA AI.
  const accLabel = (s: Session) => (s.owner && ownerNames[s.owner]) || s.label || s.user_id;

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-1">
        <MaterialIcon name="inbox" className="text-[#E3000F]" />
        <h1 className="text-xl font-black text-[#1A1A1A]">Inbox Facebook</h1>
      </div>
      <p className="text-sm text-[#666666] mb-6">Tin nhắn Messenger tự cập nhật gần như tức thời khi extension đang mở (đọc ngay trên trình duyệt seeder, giải được mã hóa đầu cuối). Đánh dấu khách và trả lời, ưu tiên đẩy khách sang Zalo.</p>

      {connErr && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-700">⚠️ Không kết nối được Facebook automation service. Kiểm tra backend product và Markee service.</div>}
      {needRelogin && <div className="mb-4 rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">🔑 Cookie tài khoản này đã hết hạn — vào tab Tài khoản đăng nhập lại.</div>}

      {/* Nhắc NHÂN VIÊN (member) kết nối extension khi tài khoản FB của họ chưa lên dashboard.
          Admin/leader là người quản lý+trả lời, không cần acc riêng nên không nhắc. */}
      {role === "member" && extInstalled !== null && !sessions.some(s => s.owner === owner) && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-300 px-4 py-3 text-sm text-blue-800">
          {extInstalled === false
            ? "📌 Bạn chưa cài (hoặc chưa mở) extension Markee trên trình duyệt này. Cài + mở extension rồi đăng nhập Facebook — tài khoản của bạn sẽ tự kết nối về đây, không cần thao tác gì thêm."
            : "📌 Extension đã sẵn sàng nhưng tài khoản Facebook của bạn chưa kết nối. Mở extension (biểu tượng góc phải trình duyệt) và đăng nhập Facebook để kết nối. Giữ 1 tab Messenger mở trong giờ làm để tin nhắn tự về."}
        </div>
      )}

      {/* Chọn acc + quét */}
      <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-[#666666]">Tài khoản nhân viên</label>
          <button onClick={scan} disabled={scanning || !acc} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#E3000F] text-white hover:bg-[#C40009] transition disabled:opacity-50">
            {scanning ? "Đang quét..." : "Quét ngay"}
          </button>
        </div>
        {sessions.length === 0 ? (
          <span className="text-sm text-[#A0A0A0]">{extInstalled === false ? 'Chưa thấy extension. Hãy cài + mở extension trên trình duyệt này.' : 'Chưa có tài khoản nào. Nhân viên cài extension + đăng nhập Facebook để tài khoản hiện ra.'}</span>
        ) : (role === "admin" || role === "leader") ? (
          // Admin/Leader: cây Team → thành viên → tài khoản (xem inbox theo team)
          <TeamAccountTree
            sessions={sessions}
            ownerNames={ownerNames}
            selectedAcc={acc}
            role={role}
            owner={owner}
            onSelect={(uid) => { setAcc(uid); setOpenConv(""); openConvRef.current = ""; setMsgs([]); }}
          />
        ) : (
          // Member: danh sách chip đơn giản (tài khoản của chính mình)
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => {
              const isOnline = s.status === "online";
              return (
                <button key={s.user_id} onClick={() => { setAcc(s.user_id); setOpenConv(""); openConvRef.current = ""; setMsgs([]); }}
                  title={isOnline ? "Đang online — đọc/trả lời được" : "Offline (nhân viên tắt máy) — chỉ xem tin cũ"}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold border transition ${acc === s.user_id ? "bg-[#E3000F] text-white border-[#E3000F]" : `border-[#E5E5E5] hover:border-[#E3000F] ${isOnline ? "text-[#1A1A1A]" : "text-[#A0A0A0]"}`}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />{accLabel(s)}{!isOnline && <span className="text-[10px] opacity-70">(offline)</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="text-xs text-[#A0A0A0] mt-2">Acc <b>online</b> (chấm xanh): đọc + trả lời tin realtime. Acc <b>offline</b> (nhân viên tắt máy): vẫn xem được tin cũ, không quét/trả lời tới khi máy bật lại.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Danh sách hội thoại */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#1A1A1A]">Hộp thư</h2>
            <select value={filter} onChange={e => setFilter(e.target.value as "all" | "unread" | "customer" | "need_reply")} className="text-sm border border-[#E5E5E5] rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A] bg-white">
              <option value="all">Tất cả</option>
              <option value="need_reply">Cần trả lời</option>
              <option value="unread">Chưa đọc</option>
              <option value="customer">Đã đánh dấu khách</option>
            </select>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {filtered.length === 0 ? <div className="text-center text-[#A0A0A0] py-10 text-sm">Chưa có hội thoại. Chọn tài khoản rồi bấm &quot;Quét ngay&quot;.</div> :
              filtered.map(c => (
                <div key={c.conv_id} className={`border rounded-lg p-3 transition ${openConv === c.conv_id ? "border-[#E3000F] bg-[#FFF5F5]" : "border-[#E5E5E5]"}`}>
                  <div onClick={() => openChat(c.conv_id)} title="Bấm để mở hội thoại" className="flex justify-between gap-2 cursor-pointer">
                    <div className="min-w-0">
                      <div className={`truncate ${c.unread ? "font-extrabold" : "font-semibold"} text-[#1A1A1A]`}>{c.name}</div>
                      <div className="text-xs text-[#A0A0A0] truncate">{c.preview || "(không có preview)"}</div>
                    </div>
                    <div className="text-xs text-[#A0A0A0] whitespace-nowrap">{c.time}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {needsReply(c) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">↩ cần trả lời</span>}
                    {c.unread && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">chưa đọc</span>}
                    {c.is_customer && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">⭐ khách</span>}
                    {c.pushed_to_zalo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">đã đẩy Zalo</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button onClick={() => openChat(c.conv_id)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">Mở chat</button>
                    <button onClick={() => mark(c.conv_id, "is_customer", !c.is_customer)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">{c.is_customer ? "Bỏ khách" : "✓ Là khách"}</button>
                    {c.is_customer && <button onClick={() => mark(c.conv_id, "pushed_to_zalo", !c.pushed_to_zalo)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">{c.pushed_to_zalo ? "Bỏ Zalo" : "Đã đẩy Zalo"}</button>}
                    <button onClick={() => { if (window.confirm(`Xóa "${c.name || "hội thoại này"}" khỏi danh sách? (không ảnh hưởng Messenger)`)) mark(c.conv_id, "deleted", true); }} className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-semibold transition">Xóa</button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Khung chat */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-5">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Hội thoại</h2>
          {!openConv ? <div className="text-center text-[#A0A0A0] py-10 text-sm">Chọn 1 khách đã đánh dấu để xem hội thoại.</div> : (
            <>
              <div className="max-h-[430px] overflow-auto mb-3 space-y-2 p-1">
                {loadingChat && msgs.length === 0
                  ? <div className="text-sm text-[#A0A0A0]">Đang tải hội thoại (worker đang mở Messenger)...</div>
                  : msgs.length === 0
                    ? <div className="text-sm text-[#A0A0A0]">Chưa có nội dung — đợi thêm vài giây.</div>
                    : msgs.map((m, i) => {
                        const mt = m.text.match(/^Tin nhắn do .+? gửi lúc (.+?):\s*([\s\S]*)$/i);
                        let content = mt ? (mt[2] || "").trim() : m.text;
                        const time = mt ? (mt[1] || "").trim() : (m.time || "");
                        if (content) {
                          // Strip time format VN đầu content: "03sáng: text", "47ch: text", "8:47chiều\ntext"
                          const stripped = content.replace(/^(?:(?:Thứ\s+\S+\s+)?\d{1,2}(?::\d{2})?(?:sáng|chiều|ch|sa|CH|SA|AM|PM)?)\s*[:\n]+\s*/i, "").trim();
                          if (stripped) content = stripped;
                        }
                        return (
                          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[78%] flex flex-col ${m.from === "me" ? "items-end" : "items-start"}`}>
                              <div className={`px-3 py-2 rounded-lg text-sm ${m.from === "me" ? "bg-[#E3000F] text-white" : "bg-[#F5F5F5] text-[#1A1A1A]"}`}>{content}</div>
                              {time && <div className="text-[10px] text-[#A0A0A0] mt-0.5 px-1">{time}</div>}
                            </div>
                          </div>
                        );
                      })}
                {loadingFresh && <div className="text-[11px] text-[#A0A0A0] text-center pt-1 animate-pulse">Đang cập nhật tin mới nhất...</div>}
              </div>
              <div className="flex gap-2">
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendReply(); }}
                  placeholder="Nhập trả lời..." className="flex-1 border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]" />
                <button onClick={sendReply} className="px-4 py-2 rounded-lg bg-[#E3000F] text-white text-sm font-bold hover:bg-[#C40009] transition">Gửi</button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-lg text-white font-semibold shadow-lg ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>}
    </div>
  );
}
