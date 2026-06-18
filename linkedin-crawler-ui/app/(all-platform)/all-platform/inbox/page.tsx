"use client";

/**
 * Cách A: UI nằm trong dashboard, gọi thẳng MARKEE SERVICE (inbox server-side Playwright + cookie).
 *
 * Luồng: chọn acc (có cookie) -> "Quét ngay" -> hiện hội thoại CHƯA ĐỌC
 *   -> đánh dấu "Là khách" -> "Mở chat" (tải full) -> trả lời / đẩy Zalo.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { MaterialIcon } from "@/components/ui";
import { provisionExtension, pingExtension } from "@/lib/markee-ext-provision";
import { fbFetch, fbHeaders, getFbProvisionConfig } from "@/lib/markee-fb-api";
import { API_BASE_URL } from "@/lib/env";
import { idbSetThread, idbGetAllThreadsForAcc, idbSetConvs, idbGetConvs, idbPruneOld } from "@/lib/inbox-cache";
import TeamAccountTree from "@/components/all-platform/inbox/TeamAccountTree";

interface Session { user_id: string; fb_user_id?: string; label?: string; owner?: string; online?: boolean; inbox_enabled?: boolean; status?: string; }
interface Conv { conv_id: string; name: string; preview: string; unread: boolean; time: string; is_customer: boolean; pushed_to_zalo: boolean; deleted: boolean; archived?: boolean; archived_at?: string; }
interface ArchiveConv { conv_id: string; name: string; preview?: string; time?: string; archived_at?: string; last_saved_at?: string; archive_reason?: string; outcome?: string; note?: string; messages_count?: number; archived_by_name?: string; is_customer?: boolean; pushed_to_zalo?: boolean; }
interface Msg { from: "me" | "them"; text: string; time: string; }
interface UserRow { id?: string; email?: string; name?: string; }
interface TeamRow { id?: string; name_team?: string; id_leader?: string; leader_name?: string; leader_email?: string; members?: UserRow[]; }

const ACTIVE_INBOX_DAYS = 7;

function foldVietnamese(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function isRecentMessengerTime(time: string, days = ACTIVE_INBOX_DAYS): boolean {
  const s = foldVietnamese(time.trim());
  if (!s) return true;
  if (/(vua xong|just now|hom qua|yesterday)/i.test(s)) return true;
  if (/^\d+\s*(m|min|phut|h|gio|hour)$/i.test(s)) return true;
  const m = s.match(/(\d+)\s*(ngay|day|d|tuan|week|w|thg|thang|month|nam|year)\b/i);
  if (!m) return false;
  const n = Number(m[1] || 0);
  const unit = m[2] || "";
  if (["ngay", "day", "d"].includes(unit)) return n <= days;
  return false;
}

function convListSignature(conv: Conv): string {
  return `${conv.conv_id}|${conv.preview || ""}|${conv.time || ""}|${conv.unread ? 1 : 0}`;
}

export default function InboxPage() {
  const { user } = useAppAuth();
  const owner = user?.id || "";
  const role = user?.role || "member";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [acc, setAcc] = useState("");
  const [scopeReady, setScopeReady] = useState(false);
  const [allowedOwnerIds, setAllowedOwnerIds] = useState<Set<string> | null>(new Set());
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [archives, setArchives] = useState<ArchiveConv[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "customer" | "need_reply">("all");
  const [viewMode, setViewMode] = useState<"inbox" | "archive">("inbox");
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [archiveReading, setArchiveReading] = useState(false);
  const [openConv, setOpenConv] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [threadLastFrom, setThreadLastFrom] = useState<Record<string, Msg["from"]>>({});
  const [reply, setReply] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingFresh, setLoadingFresh] = useState(false);
  const [needRelogin, setNeedRelogin] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [connErr, setConnErr] = useState(false);
  const openConvRef = useRef("");
  const msgsRef = useRef<Msg[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollConvRef = useRef("");
  const openConvListSigRef = useRef("");
  const autoThreadRefreshAtRef = useRef<Record<string, number>>({});
  const clientCacheRef = useRef<Map<string, Msg[]>>(new Map());
  const loadedAtRef = useRef<Map<string, string | null>>(new Map());
  // Chống chồng lệnh silent scan (1 lệnh đang chạy thì bỏ qua lần kế)
  const scanInFlightRef = useRef(false);
  const lastSilentScanAtRef = useRef<Record<string, number>>({});

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  // Lưu cache thread vào CẢ RAM (clientCacheRef) lẫn IndexedDB (bền qua reload).
  // loadedAt: nếu không truyền, giữ lại loaded_at đã biết của hội thoại đó.
  const saveThreadCache = useCallback((convId: string, list: Msg[], loadedAt?: string | null) => {
    clientCacheRef.current.set(convId, list);
    const lastFrom = list[list.length - 1]?.from;
    if (lastFrom) {
      setThreadLastFrom(prev => prev[convId] === lastFrom ? prev : { ...prev, [convId]: lastFrom });
    }
    const la = loadedAt === undefined ? (loadedAtRef.current.get(convId) ?? null) : loadedAt;
    loadedAtRef.current.set(convId, la);
    void idbSetThread(acc, convId, list, la);
  }, [acc]);

  // Dọn cache thread cũ (>30 ngày) 1 lần khi vào trang để IndexedDB không phình mãi.
  useEffect(() => { void idbPruneOld(); }, []);

  // Chọn 1 tài khoản: xóa NGAY hộp thư + chat của acc cũ và bật loading (tránh "trơ trơ" hiện data cũ).
  const selectAcc = (uid: string) => {
    if (uid === acc) return;
    setAcc(uid);
    setOpenConv(""); openConvRef.current = "";
    openConvListSigRef.current = "";
    setArchiveReading(false);
    setMsgs([]); msgsRef.current = [];
    setThreadLastFrom({});
    setConvs([]); setArchives([]); setLoadingConvs(!!uid);
  };

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
      setScopeReady(false);
      setTeams([]);
      setAllowedOwnerIds(new Set());
      if (role === "admin") {
        try {
          const [usersRes, teamsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/all-platform/users/all-profiles`, { credentials: "include" }),
            fetch(`${API_BASE_URL}/api/all-platform/teams`, { credentials: "include" }),
          ]);
          const usersData = await usersRes.json().catch(() => ({}));
          const teamsData = await teamsRes.json().catch(() => ({}));
          if (!cancelled) {
            setOwnerNames(buildMap(Array.isArray(usersData?.data) ? usersData.data : []));
            setTeams(Array.isArray(teamsData?.data) ? teamsData.data : []);
            setAllowedOwnerIds(null);
            setScopeReady(true);
          }
        } catch {
          if (!cancelled) {
            setOwnerNames({ [owner]: myName });
            setTeams([]);
            setAllowedOwnerIds(null);
            setScopeReady(true);
          }
        }
        return;
      }
      if (role === "leader") {
        try {
          const r = await fetch(`${API_BASE_URL}/api/all-platform/teams/members?leader_id=${encodeURIComponent(owner)}`, { credentials: "include" });
          const d = await r.json().catch(() => ({}));
          const rows: UserRow[] = Array.isArray(d?.data) ? d.data : [];
          const ids = rows.map(m => m?.id).filter(Boolean);
          const all = Array.from(new Set([owner, ...ids])) as string[];
          if (!cancelled) {
            setAllowedOwnerIds(new Set(all));
            setOwnerNames(buildMap(rows));
            setTeams([{ id: `leader-${owner}`, name_team: "Team của tôi", id_leader: owner, leader_name: myName, members: rows }]);
            setScopeReady(true);
          }
        } catch {
          if (!cancelled) {
            setAllowedOwnerIds(new Set([owner]));
            setOwnerNames({ [owner]: myName });
            setTeams([{ id: `leader-${owner}`, name_team: "Team của tôi", id_leader: owner, leader_name: myName, members: [] }]);
            setScopeReady(true);
          }
        }
        return;
      }
      // member
      if (!cancelled) {
        setAllowedOwnerIds(new Set([owner]));
        setOwnerNames({ [owner]: myName });
        setTeams([]);
        setScopeReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [owner, role, user?.email, user?.name]);

  // Inbox đọc DOM Messenger ĐÃ GIẢI MÃ trên máy seeder (giải được e2ee) -> cần extension ONLINE.
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

  const sessionInScope = useCallback((session: Session) => {
    if (!scopeReady) return false;
    if (allowedOwnerIds === null) return true;
    return !!session.owner && allowedOwnerIds.has(String(session.owner));
  }, [allowedOwnerIds, scopeReady]);

  const loadSessions = useCallback(async () => {
    if (!scopeReady) return;
    try {
      // Nguồn acc = /sessions (BỀN, đọc từ file cookie) -> acc OFFLINE (nhân viên tắt máy) VẪN HIỆN
      const r = await fbFetch("/sessions");
      const d = await r.json();
      const list: Session[] = (d.sessions || []).map((s: Session) => ({
        ...s,
        status: s.online ? (s.inbox_enabled === false ? "paused" : "online") : "offline",
      })).filter(sessionInScope);
      setSessions(list);
      setConnErr(false);
      // Tự chọn: ưu tiên giữ acc đang chọn; nếu chưa có thì chọn acc ONLINE đầu, không có online thì acc đầu
      setAcc(prev => {
        if (prev && list.some(e => e.user_id === prev)) return prev;
        const firstOnline = list.find(e => e.status === "online");
        const next = (firstOnline || list[0])?.user_id || "";
        if (next !== prev) {
          setOpenConv(""); openConvRef.current = "";
          openConvListSigRef.current = "";
          setArchiveReading(false);
          setMsgs([]); msgsRef.current = [];
          setThreadLastFrom({});
          setConvs([]); setArchives([]); setLoadingConvs(!!next);
        }
        return next;
      });
    } catch { setConnErr(true); }
  }, [scopeReady, sessionInScope]);

  const loadConvs = useCallback(async () => {
    if (!acc) return;
    if (!sessions.some(s => s.user_id === acc)) {
      setConvs([]);
      setOpenConv(""); openConvRef.current = "";
      setMsgs([]); msgsRef.current = [];
      setLoadingConvs(false);
      return;
    }
    try {
      const r = await fbFetch(`/inbox/conversations?user_id=${encodeURIComponent(acc)}`);
      const d = await r.json();
      const list: Conv[] = d.conversations || [];
      setConvs(list);
      setNeedRelogin(!!d.needs_relogin);
      void idbSetConvs(acc, list);
    } catch { /* ignore */ }
    finally { setLoadingConvs(false); }
  }, [acc, sessions]);

  const loadArchives = useCallback(async () => {
    if (!acc) return;
    setLoadingArchives(true);
    try {
      const r = await fbFetch(`/inbox/archive?user_id=${encodeURIComponent(acc)}&limit=200`);
      const d = await r.json();
      setArchives(d.archives || []);
    } catch { /* ignore */ }
    finally { setLoadingArchives(false); }
  }, [acc]);

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
      const lastFromByConv: Record<string, Msg["from"]> = {};
      for (const [cid, t] of Object.entries(threads)) {
        const cachedMessages = t.messages || [];
        clientCacheRef.current.set(cid, cachedMessages);
        loadedAtRef.current.set(cid, t.loaded_at ?? null);
        const lastFrom = cachedMessages[cachedMessages.length - 1]?.from;
        if (lastFrom) lastFromByConv[cid] = lastFrom;
      }
      setThreadLastFrom(lastFromByConv);
      if (cachedConvs?.length) setConvs(prev => (prev.length ? prev : cachedConvs));
    })();
    return () => { cancelled = true; };
  }, [acc]);

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 6000);
    return () => clearInterval(t);
  }, [loadSessions]);
  useEffect(() => {
    if (!acc) return;
    loadConvs();
    const t = setInterval(loadConvs, 3000);
    return () => clearInterval(t);
  }, [acc, loadConvs]);
  useEffect(() => {
    if (!acc || viewMode !== "archive") return;
    loadArchives();
  }, [acc, viewMode, loadArchives]);

  useEffect(() => {
    if (!acc) return;
    const isOnline = sessions.find(s => s.user_id === acc)?.status === "online";
    if (!isOnline || needRelogin) return;
    const silentScan = () => {
      if (scanInFlightRef.current) return;
      const now = Date.now();
      const last = lastSilentScanAtRef.current[acc] || 0;
      if (now - last < 30000) return;
      lastSilentScanAtRef.current[acc] = now;
      scanInFlightRef.current = true;
      fbFetch("/inbox/scan", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc }) })
        .catch(() => {})
        .finally(() => { scanInFlightRef.current = false; });
    };
    silentScan();
    const t = setInterval(silentScan, 30000);
    return () => clearInterval(t);
  }, [acc, sessions, needRelogin]);

  // Phát hiện KHÁCH mới nhắn → badge tab + sound + browser notification
  const prevConvIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => { prevConvIdsRef.current = new Set(); }, [acc]);
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
    const selected = sessions.find(s => s.user_id === acc);
    if (selected?.status === "paused") return showToast("Inbox realtime đang tạm dừng trên extension — bật lại trước khi quét.", false);
    if (selected?.status !== "online") return showToast("Tài khoản đang offline — chưa quét được.", false);
    if (needRelogin) return showToast("Cookie tài khoản đã hết hạn — đăng nhập lại trước khi quét.", false);
    setScanning(true);
    try {
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

  async function saveArchive(conv_id: string, hide = false) {
    try {
      const r = await fbFetch("/inbox/archive", {
        method: "POST",
        headers: fbHeaders(),
        body: JSON.stringify({
          user_id: acc,
          conv_id,
          archive_reason: hide ? "hidden_from_inbox" : "saved_customer",
          mark_customer: !hide,
          hide,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(d.detail || "Lỗi lưu trữ", false); return; }
      setConvs(prev => prev.map(c => c.conv_id === conv_id ? { ...c, archived: true, is_customer: hide ? c.is_customer : true, deleted: hide ? true : c.deleted } : c));
      setArchives(prev => {
        const entry = d.archive as ArchiveConv | undefined;
        if (!entry) return prev;
        return [entry, ...prev.filter(x => x.conv_id !== conv_id)];
      });
      if (hide && openConvRef.current === conv_id) {
        setOpenConv(""); openConvRef.current = ""; openConvListSigRef.current = ""; setArchiveReading(false); setMsgs([]); msgsRef.current = [];
      }
      showToast(hide ? "Đã ẩn khỏi hộp thư và lưu trữ" : "Đã lưu khách vào kho lưu trữ", true);
      if (viewMode === "archive") loadArchives();
    } catch { showToast("Không kết nối được", false); }
  }

  async function openArchive(conv_id: string) {
    setArchiveReading(true);
    setOpenConv(conv_id); openConvRef.current = conv_id; openConvListSigRef.current = ""; setMsgs([]); msgsRef.current = []; setLoadingChat(true); setLoadingFresh(false);
    try {
      const r = await fbFetch(`/inbox/archive/thread?user_id=${encodeURIComponent(acc)}&conv_id=${encodeURIComponent(conv_id)}`);
      const d = await r.json();
      const archivedMsgs: Msg[] = d.messages || [];
      setMsgs(archivedMsgs); msgsRef.current = archivedMsgs;
    } catch { showToast("Không tải được bản lưu", false); }
    finally { setLoadingChat(false); }
  }

  // Hỏi lại mỗi 3s tới khi extension trả nội dung. Hiện tin NGAY khi có (theo số tin tăng),
  const pollFreshThread = useCallback(async function pollFreshThreadInner(conv_id: string, prevLoadedAt: string | null, attemptsLeft: number) {
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
      if (d.loaded_at && d.loaded_at !== prevLoadedAt) {
        setLoadingChat(false); setLoadingFresh(false); return;
      }
    } catch { /* ignore, thử lại */ }
    if (attemptsLeft === 10 && msgsRef.current.length === 0) {
      fbFetch("/inbox/thread", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id }) }).catch(() => {});
    }
    if (attemptsLeft <= 1) { setLoadingChat(false); setLoadingFresh(false); return; }
    setTimeout(() => pollFreshThreadInner(conv_id, prevLoadedAt, attemptsLeft - 1), 3000);
  }, [acc, saveThreadCache]);


  async function openChat(conv_id: string) {
    setArchiveReading(false);
    setOpenConv(conv_id); openConvRef.current = conv_id;
    const currentConv = convs.find(c => c.conv_id === conv_id);
    openConvListSigRef.current = currentConv ? convListSignature(currentConv) : "";
    setMsgs([]); msgsRef.current = []; setLoadingChat(true);

    const clientCached = clientCacheRef.current.get(conv_id);
    if (clientCached?.length) {
      setMsgs(clientCached); msgsRef.current = clientCached; setLoadingChat(false); setLoadingFresh(true);
    }

    let prevLoadedAt: string | null = null;
    try {
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
    const la = prevLoadedAt ? Date.parse(prevLoadedAt) : NaN;
    if (msgsRef.current.length > 0 && !Number.isNaN(la) && Number(new Date()) - la < 25000) {
      setLoadingChat(false); setLoadingFresh(false); return;
    }
    try {
      const r = await fbFetch("/inbox/thread", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id }) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        showToast(d.detail || "Không tải được hội thoại", false);
        setLoadingChat(false); setLoadingFresh(false); return;
      }
      pollFreshThread(conv_id, prevLoadedAt, 20);
    } catch { setLoadingChat(false); setLoadingFresh(false); }
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

  useEffect(() => {
    if (!openConv || !acc) return;
    const t = setInterval(async () => {
      const reqN = msgsRef.current.length;
      try {
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

  useEffect(() => {
    if (!openConv) return;
    const el = chatScrollRef.current;
    const changedConv = lastScrollConvRef.current !== openConv;
    const lastMsg = msgs[msgs.length - 1];
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    const shouldScroll = changedConv || nearBottom || lastMsg?.from === "me";
    lastScrollConvRef.current = openConv;
    if (!shouldScroll) return;
    requestAnimationFrame(() => {
      const node = chatScrollRef.current;
      if (!node) return;
      node.scrollTo({ top: node.scrollHeight, behavior: changedConv ? "auto" : "smooth" });
    });
  }, [openConv, msgs.length, msgs]);

  async function sendReply() {
    const text = reply.trim();
    if (!text || !openConv) return;
    if (archiveReading) { showToast("Đang xem bản lưu trữ, mở inbox live để trả lời", false); return; }
    const convIdForSend = openConv;
    const selectedSession = sessions.find(s => s.user_id === acc);
    const accOnline = selectedSession?.status === "online";
    if (selectedSession?.status === "paused") { showToast("Inbox realtime đang tạm dừng trên extension — bật lại trước khi gửi.", false); return; }
    if (!accOnline) { showToast("Tài khoản đang offline (máy nhân viên chưa mở) — chưa gửi được.", false); return; }
    if (needRelogin) { showToast("Cookie tài khoản đã hết hạn — đăng nhập lại trước khi gửi.", false); return; }
    setReply("");
    const optimistic: Msg = { from: "me", text, time: "Đang gửi..." };
    setMsgs(prev => { const next = [...prev, optimistic]; msgsRef.current = next; return next; });
    const setStatus = (t: string) => {
      if (openConvRef.current !== convIdForSend) return;
      setMsgs(prev => prev.map(m => m === optimistic ? { ...m, time: t } : m));
    };
    try {
      const r = await fbFetch("/inbox/reply", { method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: acc, conv_id: convIdForSend, text }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(d.detail || "Lỗi gửi", false); setStatus("✗ Gửi lỗi"); return; }
      const cmd = d.command_id;
      if (!cmd) { setStatus("Đã gửi (đang xác nhận)"); return; }
      pollReplyStatus(cmd, setStatus, 12, acc, convIdForSend);
    } catch {
      showToast("Không kết nối được", false); setStatus("✗ Gửi lỗi");
    }
  }

  async function pollReplyStatus(cmd: string, setStatus: (t: string) => void, attemptsLeft: number, accountId: string, convId: string) {
    try {
      const r = await fbFetch(`/inbox/reply_status?command_id=${encodeURIComponent(cmd)}&user_id=${encodeURIComponent(accountId)}`);
      const d = await r.json();
      if (d.done) {
        if (d.sent) {
          setStatus("Đã gửi ✓");
          if (openConvRef.current === convId) {
            saveThreadCache(convId, msgsRef.current);
            setTimeout(() => fetchThread(convId), 7000);
          }
          showToast("Đã gửi tin thành công", true);
        }
        else { setStatus("✗ Gửi thất bại"); showToast("FB chưa gửi được — thử lại", false); }
        return;
      }
    } catch { /* ignore, thử lại */ }
    if (attemptsLeft <= 1) { setStatus("Đã gửi (chưa rõ kết quả)"); return; }
    setTimeout(() => pollReplyStatus(cmd, setStatus, attemptsLeft - 1, accountId, convId), 2000);
  }

  // chưa có cache → tạm dựa vào cờ unread (chưa đọc thường là khách vừa nhắn).
  const needsReply = (c: Conv): boolean => {
    if (c.unread) return true;
    if (threadLastFrom[c.conv_id]) return threadLastFrom[c.conv_id] === "them";
    return c.unread;
  };

  const isActiveInboxConv = (c: Conv): boolean =>
    c.is_customer ||
    c.pushed_to_zalo ||
    c.conv_id === openConv ||
    isRecentMessengerTime(c.time || "");

  const activeConvs = convs.filter(c => !c.deleted && isActiveInboxConv(c));
  const visible = activeConvs.filter(c => (
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
  const selectedSession = sessions.find(s => s.user_id === acc);
  const accOnline = selectedSession?.status === "online";
  const accPaused = selectedSession?.status === "paused";

  useEffect(() => {
    if (!openConv || archiveReading) return;
    const current = convs.find(c => c.conv_id === openConv);
    if (!current) return;
    const sig = convListSignature(current);
    const previousSig = openConvListSigRef.current;
    openConvListSigRef.current = sig;
    if (!previousSig || previousSig === sig) return;

    if (!accOnline || needRelogin) return;

    const now = Number(new Date());
    const last = autoThreadRefreshAtRef.current[openConv] || 0;
    if (now - last < 12000) return;
    autoThreadRefreshAtRef.current[openConv] = now;
    const prevLoadedAt = loadedAtRef.current.get(openConv) ?? null;
    setLoadingFresh(true);
    fbFetch("/inbox/thread", {
      method: "POST",
      headers: fbHeaders(),
      body: JSON.stringify({ user_id: acc, conv_id: openConv }),
    })
      .then(r => {
        if (r.ok) pollFreshThread(openConv, prevLoadedAt, 8);
        else setLoadingFresh(false);
      })
      .catch(() => setLoadingFresh(false));
  }, [convs, openConv, archiveReading, accOnline, needRelogin, acc, pollFreshThread]);

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-1">
        <MaterialIcon name="inbox" className="text-[#E3000F]" />
        <h1 className="text-xl font-black text-[#1A1A1A]">Inbox Facebook</h1>
      </div>
      <p className="text-sm text-[#666666] mb-6">Tin nhắn Messenger tự cập nhật gần như tức thời khi extension đang mở (đọc ngay trên trình duyệt seeder, giải được mã hóa đầu cuối). Đánh dấu khách và trả lời, ưu tiên đẩy khách sang Zalo.</p>

      {connErr && <div className="mb-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-700">⚠️ Không kết nối được Facebook automation service. Kiểm tra backend product và Markee service.</div>}
      {needRelogin && <div className="mb-4 rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">🔑 Cookie tài khoản này đã hết hạn — vào tab Tài khoản đăng nhập lại.</div>}

      {role === "member" && extInstalled !== null && !sessions.some(s => s.owner === owner) && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-300 px-4 py-3 text-sm text-blue-800">
          {extInstalled === false
            ? "📌 Bạn chưa cài (hoặc chưa mở) extension Markee trên trình duyệt này. Cài + mở extension rồi đăng nhập Facebook — tài khoản của bạn sẽ tự kết nối về đây, không cần thao tác gì thêm."
            : "📌 Extension đã sẵn sàng nhưng tài khoản Facebook của bạn chưa kết nối. Mở extension (biểu tượng góc phải trình duyệt) và đăng nhập Facebook để kết nối. Giữ 1 tab Messenger mở trong giờ làm để tin nhắn tự về."}
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-[#666666]">Tài khoản nhân viên</label>
          <button onClick={scan} disabled={scanning || !acc || !accOnline || needRelogin} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#E3000F] text-white hover:bg-[#C40009] transition disabled:opacity-50">
            {scanning ? "Đang quét..." : "Quét ngay"}
          </button>
        </div>
        {sessions.length === 0 ? (
          <span className="text-sm text-[#A0A0A0]">{extInstalled === false ? 'Chưa thấy extension. Hãy cài + mở extension trên trình duyệt này.' : 'Chưa có tài khoản nào. Nhân viên cài extension + đăng nhập Facebook để tài khoản hiện ra.'}</span>
        ) : (role === "admin" || role === "leader") ? (
          <div className="w-full">
            <TeamAccountTree
              sessions={sessions}
              ownerNames={ownerNames}
              teams={teams}
              selectedAcc={acc}
              role={role}
              owner={owner}
              onSelect={selectAcc}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => {
              const isOnline = s.status === "online";
              const isPaused = s.status === "paused";
              return (
                <button key={s.user_id} onClick={() => selectAcc(s.user_id)}
                  title={isOnline ? "Đang online — đọc/trả lời được" : isPaused ? "Inbox realtime đang tạm dừng trên extension" : "Offline (nhân viên tắt máy) — chỉ xem tin cũ"}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold border transition ${acc === s.user_id ? "bg-[#E3000F] text-white border-[#E3000F]" : `border-[#E5E5E5] hover:border-[#E3000F] ${isOnline ? "text-[#1A1A1A]" : isPaused ? "text-amber-700" : "text-[#A0A0A0]"}`}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : isPaused ? "bg-amber-400" : "bg-gray-300"}`} />{accLabel(s)}{!isOnline && <span className="text-[10px] opacity-70">({isPaused ? "paused" : "offline"})</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="text-[11px] text-[#A0A0A0] mt-1.5">Online: đọc + trả lời realtime. Offline: chỉ xem tin cũ tới khi máy nhân viên bật lại.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
          <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-[#F8F8F8] p-0.5 mb-3">
            <button onClick={() => { setViewMode("inbox"); setArchiveReading(false); }} className={`text-xs font-bold px-3 py-1.5 rounded-md transition ${viewMode === "inbox" ? "bg-white text-[#E3000F] shadow-sm" : "text-[#666666] hover:text-[#1A1A1A]"}`}>Hộp thư</button>
            <button onClick={() => setViewMode("archive")} className={`text-xs font-bold px-3 py-1.5 rounded-md transition ${viewMode === "archive" ? "bg-white text-[#E3000F] shadow-sm" : "text-[#666666] hover:text-[#1A1A1A]"}`}>Lưu trữ</button>
          </div>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {viewMode === "archive" ? (
              loadingArchives && archives.length === 0
                ? <div className="text-center text-[#A0A0A0] py-10 text-sm animate-pulse">Đang tải lưu trữ...</div>
                : archives.length === 0 ? <div className="text-center text-[#A0A0A0] py-10 text-sm">Chưa có hội thoại lưu trữ.</div> :
                archives.map(a => (
                  <div key={a.conv_id} className={`border rounded-lg p-3 transition ${openConv === a.conv_id && archiveReading ? "border-[#E3000F] bg-[#FFF5F5]" : "border-[#E5E5E5]"}`}>
                    <div onClick={() => openArchive(a.conv_id)} title="Xem bản lưu" className="flex justify-between gap-2 cursor-pointer">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#1A1A1A]">{a.name || a.conv_id}</div>
                        <div className="text-xs text-[#A0A0A0] truncate">{a.preview || "(không có preview)"}</div>
                      </div>
                      <div className="text-xs text-[#A0A0A0] whitespace-nowrap">{a.messages_count || 0} tin</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {a.is_customer && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">khách</span>}
                      {a.pushed_to_zalo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">đã đẩy Zalo</span>}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{a.archive_reason === "hidden_from_inbox" ? "đã ẩn" : "đã lưu"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button onClick={() => openArchive(a.conv_id)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">Xem lại</button>
                      <button onClick={() => { setViewMode("inbox"); openChat(a.conv_id); }} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">Mở inbox</button>
                    </div>
                  </div>
                ))
            ) : (loadingConvs && filtered.length === 0
              ? <div className="text-center text-[#A0A0A0] py-10 text-sm animate-pulse">Đang tải hộp thư của tài khoản...</div>
              : filtered.length === 0 ? <div className="text-center text-[#A0A0A0] py-10 text-sm">Chưa có hội thoại gần đây. Tin cũ nên lưu khách hoặc để ở lưu trữ.</div> :
              filtered.map(c => (
                <div key={c.conv_id} className={`border rounded-lg p-3 transition ${openConv === c.conv_id && !archiveReading ? "border-[#E3000F] bg-[#FFF5F5]" : "border-[#E5E5E5]"}`}>
                  <div onClick={() => openChat(c.conv_id)} title="Bấm để mở hội thoại" className="flex justify-between gap-2 cursor-pointer">
                    <div className="min-w-0">
                      <div className={`truncate ${c.unread ? "font-extrabold" : "font-semibold"} text-[#1A1A1A]`}>{c.name}</div>
                      <div className="text-xs text-[#A0A0A0] truncate">{c.preview || "(không có preview)"}</div>
                    </div>
                    <div className="text-xs text-[#A0A0A0] whitespace-nowrap">{c.time}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {needsReply(c) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">cần trả lời</span>}
                    {c.unread && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">chưa đọc</span>}
                    {c.is_customer && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">khách</span>}
                    {c.pushed_to_zalo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">đã đẩy Zalo</span>}
                    {c.archived && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">đã lưu</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button onClick={() => openChat(c.conv_id)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">Mở chat</button>
                    <button onClick={() => mark(c.conv_id, "is_customer", !c.is_customer)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">{c.is_customer ? "Bỏ khách" : "Là khách"}</button>
                    {c.is_customer && <button onClick={() => mark(c.conv_id, "pushed_to_zalo", !c.pushed_to_zalo)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">{c.pushed_to_zalo ? "Bỏ Zalo" : "Đã đẩy Zalo"}</button>}
                    <button onClick={() => saveArchive(c.conv_id, false)} className="text-xs px-2.5 py-1 rounded-lg border border-[#E5E5E5] hover:border-[#E3000F] text-[#1A1A1A] font-semibold transition">Lưu khách</button>
                    <button onClick={() => { if (window.confirm(`Ẩn "${c.name || "hội thoại này"}" khỏi hộp thư? Markee sẽ lưu lại bản archive, không xóa trên Messenger.`)) saveArchive(c.conv_id, true); }} className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 font-semibold transition">Ẩn</button>
                  </div>
                </div>
              ))) }
          </div>
        </div>

        {/* Khung chat */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-5">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Hội thoại</h2>
          {!openConv ? <div className="text-center text-[#A0A0A0] py-10 text-sm">Chọn 1 hội thoại để xem tin nhắn.</div> : (
            <>
              <div ref={chatScrollRef} className="max-h-[430px] overflow-auto mb-3 space-y-2 p-1">
                {loadingChat && msgs.length === 0
                  ? <div className="text-sm text-[#A0A0A0]">Đang tải hội thoại (extension đang mở Messenger quét)... lần đầu có thể chờ 30–60s.</div>
                  : msgs.length === 0
                    ? <div className="text-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-amber-800 space-y-2">
                        {archiveReading
                          ? <div>Bản lưu này chưa có nội dung tin nhắn. Hãy mở hội thoại live một lần để tải thread rồi lưu lại.</div>
                          : needRelogin
                          ? <div>🔑 Cookie tài khoản đã hết hạn — vào tab <b>Tài khoản</b> đăng nhập lại rồi mở lại hội thoại.</div>
                          : accPaused
                            ? <div>⏸️ Inbox realtime đang <b>tạm dừng</b> trong extension của nhân viên. Bật lại công tắc Inbox realtime trong popup extension để lấy tin mới.</div>
                          : !accOnline
                            ? <div>💤 Tài khoản đang <b>offline</b> — nhân viên cần mở máy + extension và giữ 1 tab Messenger để lấy được tin.</div>
                            : <div>Chưa lấy được tin nhắn. Đảm bảo extension đang bật và mở 1 tab <b>Messenger</b> trên máy nhân viên, rồi bấm <b>Quét lại</b>.</div>}
                        {!archiveReading && accOnline && !needRelogin && (
                          <button onClick={() => openChat(openConv)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition">↻ Quét lại hội thoại</button>
                        )}
                      </div>
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
                  disabled={archiveReading || !accOnline || needRelogin}
                  placeholder={archiveReading ? "Đang xem bản lưu trữ — mở inbox live để trả lời" : needRelogin ? "Cookie hết hạn — đăng nhập lại để gửi" : accPaused ? "Inbox realtime đang tạm dừng — chưa gửi được" : !accOnline ? "Tài khoản offline — không gửi được" : "Nhập trả lời..."}
                  className="flex-1 border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A] disabled:bg-[#F5F5F5] disabled:cursor-not-allowed" />
                <button onClick={sendReply} disabled={archiveReading || !accOnline || needRelogin} className="px-4 py-2 rounded-lg bg-[#E3000F] text-white text-sm font-bold hover:bg-[#C40009] transition disabled:opacity-50 disabled:cursor-not-allowed">Gửi</button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-lg text-white font-semibold shadow-lg ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>}
    </div>
  );
}
