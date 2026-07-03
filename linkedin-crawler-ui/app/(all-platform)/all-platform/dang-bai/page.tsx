"use client";

/**
 * Trang ĐĂNG BÀI FACEBOOK (seeding) — tích hợp vào dashboard all-platform.
 * Cách A: UI nằm trong dashboard, nhưng gọi thẳng MARKEE SERVICE để đăng bài.
 *
 * Markee service: nhận POST /post {user_id, content, media_urls, target_type, target_id}.
 * Lấy danh sách acc online: GET /extensions. Thư viện group: GET /groups.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { provisionExtension, pingExtension } from "@/lib/markee-ext-provision";
import { fbFetch, fbHeaders, getFbProvisionConfig } from "@/lib/markee-fb-api";
import { MaterialIcon } from "@/components/ui";
import { allPlatformGroupsService } from "@/services/all-platform.service";
import type { FacebookGroup } from "@/types/unified.types";
import { toast } from "sonner";
import { KpiProgressCard } from "@/components/all-platform/components/kpi-progress-card";

interface Ext { user_id: string; owner?: string; label?: string; email?: string; note?: string; status: string; version?: string; features?: string[]; }
interface FbSession { user_id: string; owner?: string; label?: string; email?: string; note?: string; }
interface Grp { id: string; name: string; url: string; team?: string; intent?: string; }
interface AccountGroup {
  group_id?: string;
  name: string;
  url: string;
  accounts: string[];
  account_count: number;
  total_selected: number;
  all_selected: boolean;
}

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

function accountGroupTargetId(group: AccountGroup) {
  return (group.url || group.group_id || "").trim();
}

function accountGroupIdentity(group: AccountGroup) {
  return (group.group_id || group.url || group.name || "").trim();
}

function accountGroupSelectionKey(uid: string, group: AccountGroup) {
  const key = accountGroupIdentity(group);
  return key ? `${uid}::${key}` : "";
}

const DS = {
  page: "w-full bg-background p-lg space-y-lg text-on-surface",
  card: "bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden",
  cardHeader: "px-lg py-md border-b border-outline-variant bg-surface-container-low",
  sectionTitle: "text-h3 text-on-surface flex items-center gap-sm",
  muted: "text-body-sm text-on-surface-variant",
  label: "text-label-md uppercase text-on-surface-variant",
  primaryButton: "inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-body-sm font-semibold text-on-primary shadow-sm transition hover:bg-on-primary-fixed-variant active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton: "inline-flex items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface px-sm py-xs text-body-sm font-semibold text-on-surface transition hover:border-primary hover:text-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  iconButton: "inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
  field: "w-full rounded-lg border border-outline-variant bg-surface px-md py-sm text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low",
  chip: "inline-flex items-center gap-xs rounded-full border px-sm py-xs text-body-sm font-semibold transition",
  selectedChip: "border-primary bg-primary/10 text-primary shadow-sm",
  subtleChip: "border-outline-variant bg-surface text-on-surface hover:border-primary hover:text-primary",
};

export default function DangBaiPage() {
  const { user } = useAppAuth();
  const owner = user?.id || "";  // tài khoản Markee đang login = chủ sở hữu các acc FB
  const userEmail = user?.email || "";
  const userName = user?.name || "";

  const [exts, setExts] = useState<Ext[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [kpiPosts, setKpiPosts] = useState<KpiPost[]>([]);
  const [kpiTarget, setKpiTarget] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState<"profile" | "group">("profile");
  const [selectedAccountGroupKeys, setSelectedAccountGroupKeys] = useState<Set<string>>(new Set());
  const [groupPickerAccountId, setGroupPickerAccountId] = useState<string | null>(null);
  const [groupSearchByAccount, setGroupSearchByAccount] = useState<Record<string, string>>({});
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [groupLastScan, setGroupLastScan] = useState<Record<string, string | null>>({});
  const [scanningGroups, setScanningGroups] = useState<Set<string>>(new Set());
  const [deletingAccountGroupKeys, setDeletingAccountGroupKeys] = useState<Set<string>>(new Set());
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<Array<{ jobId: string; uid: string; group: string; status: "processing" | "success" | "failed"; postUrl?: string; error?: string; createdAt: number }>>([]);

  // Dung chung GET /jobs (da duoc backend loc dung theo vai tro: member chi thay acc
  // cua minh, leader thay ca team, admin thay het) thay vi chi luu state rieng tren
  // trinh duyet nay -> ca team deu thay job dang xu ly cua nhau. Khong con gioi han
  // "het thoi gian cho" cung 60s nua (ex co the mat vai phut la binh thuong) - luon
  // phan anh dung trang thai that tu server, khong tu bao that bai.
  const fetchSharedJobs = useCallback(async () => {
    try {
      const r = await fbFetch("/jobs");
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.jobs)) return;
      setPendingJobs(prev => {
        const byId = new Map(prev.map(p => [p.jobId, p]));
        for (const j of d.jobs as Array<Record<string, unknown>>) {
          const jobId = j.job_id as string | undefined;
          if (!jobId) continue;
          const existing = byId.get(jobId);
          if (j.status === "processing") {
            if (!existing) {
              const targetId = j.target_id as string | undefined;
              byId.set(jobId, {
                jobId,
                uid: (j.user_id as string) || "",
                group: j.target_type === "group" ? `Nhóm ...${(targetId || "").slice(-6)}` : "",
                status: "processing",
                createdAt: Date.parse((j.created_at as string) || "") || Date.now(),
              });
            }
          } else if (existing) {
            byId.set(jobId, { ...existing, status: j.status as "success" | "failed", postUrl: j.post_url as string | undefined, error: j.error as string | undefined });
          }
        }
        return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
      });
    } catch { /* bo qua, thu lai vong sau */ }
  }, []);

  useEffect(() => {
    if (!owner) return;
    void fetchSharedJobs();
    const interval = setInterval(() => { void fetchSharedJobs(); }, 5000);
    return () => clearInterval(interval);
  }, [owner, fetchSharedJobs]);
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
        await provisionExtension({ serverUrl: cfg.serverUrl, owner, apiKey: cfg.extensionApiKey, label: userName || userEmail || owner });
      }
    })();
  }, [owner, userEmail, userName]);

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
          body: JSON.stringify({ email: userEmail, limit: 30 })
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
  }, [owner, userEmail]);

  useEffect(() => {
    const first = window.setTimeout(() => { void refresh(); }, 0);
    const t = window.setInterval(() => { void refresh(); }, 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [refresh]);

  function shortFbId(id: string) {
    const raw = id.replace(/^fb_/, "");
    return raw.length > 10 ? `fb ${raw.slice(0, 4)}...${raw.slice(-4)}` : id;
  }

  function labelOf(e: Ext) {
    const explicit = (e.label || "").trim();
    if (explicit && explicit !== e.user_id) return explicit;
    return e.email || "Tài khoản Facebook";
  }

  const online = useMemo(() => exts.filter(e => e.status === "online"), [exts]);
  const selectedOnline = useMemo(() => online.filter(e => selected.has(e.user_id)), [online, selected]);
  const selectedIds = useMemo(() => selectedOnline.map(e => e.user_id), [selectedOnline]);
  const selectedIdsKey = useMemo(() => selectedIds.join(","), [selectedIds]);
  const selectedOnlineIds = useMemo(() => new Set(selectedOnline.map(e => e.user_id)), [selectedOnline]);
  const hasAccountGroupsFeature = useCallback((e: Ext) => (e.features || []).includes("account_groups"), []);
  const selectedWithoutGroupScan = useMemo(
    () => selectedOnline.filter(e => !hasAccountGroupsFeature(e)),
    [selectedOnline, hasAccountGroupsFeature]
  );
  const accountLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    exts.forEach(e => map.set(e.user_id, labelOf(e)));
    return map;
  }, [exts]);
  const accountGroupsByAccount = useMemo(() => {
    const map = new Map<string, AccountGroup[]>();
    selectedOnline.forEach(e => map.set(e.user_id, []));
    accountGroups.forEach(group => {
      const targetId = accountGroupTargetId(group);
      if (!targetId) return;
      group.accounts.forEach(uid => {
        if (!selectedOnlineIds.has(uid)) return;
        const list = map.get(uid);
        if (list) list.push(group);
      });
    });
    map.forEach((list, uid) => {
      const deduped = new Map<string, AccountGroup>();
      list.forEach(group => {
        const key = accountGroupSelectionKey(uid, group);
        if (key) deduped.set(key, group);
      });
      map.set(uid, [...deduped.values()].sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi")));
    });
    return map;
  }, [accountGroups, selectedOnline, selectedOnlineIds]);
  const availableAccountGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    accountGroups.forEach(group => {
      if (!accountGroupTargetId(group)) return;
      group.accounts.forEach(uid => {
        if (!selectedOnlineIds.has(uid)) return;
        const key = accountGroupSelectionKey(uid, group);
        if (key) keys.add(key);
      });
    });
    return keys;
  }, [accountGroups, selectedOnlineIds]);
  const selectedAccountGroupCount = selectedAccountGroupKeys.size;
  const groupPostTargets = useMemo(() => {
    const seen = new Set<string>();
    const usedUsers = new Set<string>();
    const targets: Array<{ user_id: string; target_id: string; group_name: string }> = [];
    accountGroups.forEach(group => {
      const targetId = accountGroupTargetId(group);
      if (!targetId) return;
      group.accounts.forEach(uid => {
        if (!selectedOnlineIds.has(uid)) return;
        if (usedUsers.has(uid)) return;
        const selectedKey = accountGroupSelectionKey(uid, group);
        if (!selectedKey || !selectedAccountGroupKeys.has(selectedKey)) return;
        const key = `${uid}::${targetId}`;
        if (seen.has(key)) return;
        seen.add(key);
        usedUsers.add(uid);
        targets.push({ user_id: uid, target_id: targetId, group_name: group.name || targetId });
      });
    });
    return targets;
  }, [accountGroups, selectedOnlineIds, selectedAccountGroupKeys]);

  const refreshAccountGroups = useCallback(async (ids?: string[]) => {
    const targetIds = ids ?? (selectedIdsKey ? selectedIdsKey.split(",") : []);
    if (targetIds.length === 0) {
      setAccountGroups([]);
      setGroupLastScan({});
      return;
    }
    try {
      const qs = encodeURIComponent(targetIds.join(","));
      const d = await fbFetch(`/account-groups/summary?user_ids=${qs}`).then(r => r.json());
      setAccountGroups(d.groups || []);
      setGroupLastScan(d.last_scan || {});
      return d;
    } catch {
      setAccountGroups([]);
      setGroupLastScan({});
      return null;
    }
  }, [selectedIdsKey]);

  const waitForGroupScan = useCallback(async (ids: string[], before: Record<string, string | null>) => {
    const isDone = (lastScan: Record<string, string | null>) => ids.every(uid => {
      const next = lastScan[uid];
      if (!next) return false;
      const prev = before[uid];
      if (!prev) return true;
      return Date.parse(next) > Date.parse(prev);
    });

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const d = await refreshAccountGroups(ids);
      if (d?.last_scan && isDone(d.last_scan)) return true;
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    await refreshAccountGroups(ids);
    return false;
  }, [refreshAccountGroups]);

  useEffect(() => {
    if (targetType !== "group") return;
    const t = window.setTimeout(() => { void refreshAccountGroups(); }, 0);
    return () => window.clearTimeout(t);
  }, [targetType, selectedIdsKey, refreshAccountGroups]);

  useEffect(() => {
    if (targetType !== "group" || selectedAccountGroupKeys.size === 0) return;
    const t = window.setTimeout(() => {
      setSelectedAccountGroupKeys(prev => {
        const next = new Set([...prev].filter(key => availableAccountGroupKeys.has(key)));
        if (next.size === prev.size && [...next].every(key => prev.has(key))) return prev;
        return next;
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [targetType, selectedAccountGroupKeys.size, availableAccountGroupKeys]);

  const toggleAccountGroup = (uid: string, group: AccountGroup) => {
    const key = accountGroupSelectionKey(uid, group);
    if (!key) return;
    const prefix = `${uid}::`;
    setSelectedAccountGroupKeys(prev => {
      const wasSelected = prev.has(key);
      const next = new Set([...prev].filter(item => !item.startsWith(prefix)));
      if (!wasSelected) next.add(key);
      return next;
    });
  };

  const clearGroupsForAccount = (uid: string) => {
    const prefix = `${uid}::`;
    setSelectedAccountGroupKeys(prev => new Set([...prev].filter(key => !key.startsWith(prefix))));
  };

  const clearAllAccountGroups = () => setSelectedAccountGroupKeys(new Set());

  const toggle = (uid: string) => {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
  };

  async function scanGroupsForAccounts(accounts: Ext[]) {
    const accountsToScan = accounts.filter(e => selectedOnlineIds.has(e.user_id));
    if (accountsToScan.length === 0) return toast.error("Chọn tài khoản online trước khi quét group");
    const withoutGroupScan = accountsToScan.filter(e => !hasAccountGroupsFeature(e));
    if (withoutGroupScan.length > 0) {
      const names = withoutGroupScan
        .map(e => `${labelOf(e)}${e.version ? ` (${e.version})` : ""}`)
        .slice(0, 3)
        .join(", ");
      const more = withoutGroupScan.length > 3 ? ` +${withoutGroupScan.length - 3}` : "";
      toast.error(`Có ${withoutGroupScan.length} tài khoản đang dùng extension cũ: ${names}${more}. Hãy tải/cập nhật Seeding Markee rồi reload extension`);
    }
    const targets = accountsToScan.filter(hasAccountGroupsFeature).map(e => e.user_id);
    if (targets.length === 0) return;
    const beforeScan = { ...groupLastScan };
    setScanningGroups(prev => new Set([...prev, ...targets]));
    try {
      const results = await Promise.all(targets.map(async uid => {
        try {
          const r = await fbFetch("/account-groups/scan", {
            method: "POST",
            headers: fbHeaders(),
            body: JSON.stringify({ user_id: uid, force: true }),
          });
          const d = await r.json().catch(() => ({}));
          return { uid, ok: r.ok, detail: d.detail };
        } catch {
          return { uid, ok: false, detail: "không kết nối được" };
        }
      }));
      const ok = results.filter(x => x.ok).length;
      const fail = results.filter(x => !x.ok);
      if (ok > 0) toast.success(`Đã gửi lệnh quét group cho ${ok} tài khoản`);
      if (fail.length > 0) {
        const details = fail
          .map(x => `${accountLabelMap.get(x.uid) || shortFbId(x.uid)}: ${x.detail || "lỗi không rõ"}`)
          .slice(0, 3)
          .join("; ");
        const more = fail.length > 3 ? `; +${fail.length - 3} tài khoản khác` : "";
        toast.error(`Không quét được ${fail.length} tài khoản: ${details}${more}`);
      }
      if (ok > 0) {
        const done = await waitForGroupScan(results.filter(x => x.ok).map(x => x.uid), beforeScan);
        if (done) toast.success("Đã cập nhật danh sách group");
        else toast.error("Chưa nhận được kết quả quét group, kiểm tra tab Facebook/extension rồi bấm quét lại");
      }
    } finally {
      setScanningGroups(prev => {
        const next = new Set(prev);
        targets.forEach(uid => next.delete(uid));
        return next;
      });
    }
  }

  async function scanGroupsForSelected() {
    return scanGroupsForAccounts(selectedOnline);
  }

  async function deleteAccountGroup(uid: string, group: AccountGroup) {
    const groupKey = accountGroupIdentity(group);
    const selectionKey = accountGroupSelectionKey(uid, group);
    if (!groupKey || !selectionKey) return;
    const ok = window.confirm(`Xóa "${group.name || group.url || group.group_id}" khỏi cache của ${accountLabelMap.get(uid) || shortFbId(uid)}?\n\nLƯU Ý: group này sẽ bị loại trừ VĨNH VIỄN, không tự hiện lại dù quét lại nhiều lần (chỉ dùng để lọc group rác). Không phải để "làm sạch rồi quét lại" — nếu lỡ xoá nhầm, có nút "Khôi phục group đã ẩn" khi danh sách group trống.`);
    if (!ok) return;

    setDeletingAccountGroupKeys(prev => new Set([...prev, selectionKey]));
    try {
      const params = new URLSearchParams({ user_id: uid, group_key: groupKey });
      const r = await fbFetch(`/account-groups?${params.toString()}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || "Không xóa được group");
      setSelectedAccountGroupKeys(prev => {
        const next = new Set(prev);
        next.delete(selectionKey);
        return next;
      });
      await refreshAccountGroups();
      toast.success("Đã xóa group khỏi cache tài khoản");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xóa được group");
    } finally {
      setDeletingAccountGroupKeys(prev => {
        const next = new Set(prev);
        next.delete(selectionKey);
        return next;
      });
    }
  }

  async function restoreExcludedGroups(uid: string) {
    const ok = window.confirm(`Khôi phục toàn bộ group đã bị ẩn/xoá trước đó cho ${accountLabelMap.get(uid) || shortFbId(uid)}? Sau khi khôi phục, bấm "Quét" lại để cập nhật danh sách.`);
    if (!ok) return;
    try {
      const r = await fbFetch("/account-groups/reset-excluded", {
        method: "POST", headers: fbHeaders(), body: JSON.stringify({ user_id: uid }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || "Không khôi phục được");
      toast.success(`Đã khôi phục ${d.restored || 0} group bị ẩn — bấm "Quét" lại để cập nhật danh sách.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không khôi phục được");
    }
  }

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
    if (selectedOnline.length === 0) return toast.error("Chưa chọn tài khoản online nào");
    if (!content.trim() && mediaUrls.length === 0) return toast.error("Chưa nhập nội dung hoặc ảnh");
    const jobs = targetType === "group"
      ? groupPostTargets.map(t => ({ user_id: t.user_id, target_type: "group" as const, target_id: t.target_id, group_name: t.group_name }))
      : selectedOnline.map(e => ({ user_id: e.user_id, target_type: "profile" as const, target_id: null as string | null, group_name: "" }));
    if (targetType === "group") {
      if (selectedAccountGroupKeys.size === 0) return toast.error("Chưa chọn group");
      if (jobs.length === 0) return toast.error("Các group đã chọn chưa có tài khoản online nào phù hợp");
    }

    setSending(true);
    const results = await Promise.all(jobs.map(async job => {
      try {
        const r = await fbFetch("/post", {
          method: "POST", headers: fbHeaders(),
          body: JSON.stringify({
            user_id: job.user_id,
            content,
            media_urls: mediaUrls,
            target_type: job.target_type,
            target_id: job.target_id,
          }),
        });
        const d = await r.json().catch(() => ({}));
        return { uid: job.user_id, group: job.group_name, ok: r.ok, detail: d.detail, jobId: d.job_id as string | undefined };
      } catch { return { uid: job.user_id, group: job.group_name, ok: false, detail: "không kết nối được", jobId: undefined as string | undefined }; }
    }));

    const ok = results.filter(x => x.ok).length;
    const fail = results.filter(x => !x.ok);

    const newPending = results
      .filter(x => x.ok && x.jobId)
      .map(x => ({ jobId: x.jobId as string, uid: x.uid, group: x.group, status: "processing" as const, createdAt: Date.now() }));
    if (newPending.length) {
      setPendingJobs(prev => [...newPending, ...prev].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30));
      setTimeout(() => { void fetchSharedJobs(); }, 3000);
    }

    if (fail.length === 0) {
      toast.success(`Đã gửi ${ok}/${jobs.length} lệnh đăng!`);
      setContent("");
      setMediaUrls([]);
      setSelectedAccountGroupKeys(new Set());
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

  return (
    <div className={DS.page}>
      {/* Header */}
      <div className={`${DS.card} p-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md`}>
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MaterialIcon name="send" className="text-primary text-xl" />
            </div>
            <h1 className="text-h2 text-on-surface">Đăng bài Facebook (Seeding)</h1>
          </div>
          <p className={DS.muted}>Soạn và đăng bài tự động tới profile cá nhân hoặc các nhóm Facebook.</p>
        </div>
        <button
          onClick={() => setIsPostModalOpen(true)}
          className={DS.primaryButton}
        >
          <MaterialIcon name="add" className="text-[20px]" /> Đăng bài mới
        </button>
      </div>

      {connErr && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-lg py-md text-body-md text-amber-800 flex items-start gap-sm shadow-sm">
          <MaterialIcon name="warning" className="text-amber-600 shrink-0 text-[18px]" />
          <div>
            <strong>Lỗi kết nối:</strong> Không kết nối được Facebook automation service. Vui lòng kiểm tra backend và extension.
          </div>
        </div>
      )}

      {/* KPI Progress Bar */}
      {userEmail && (
        <KpiProgressCard email={userEmail} type="post" />
      )}

      {/* Cac lenh dang dang moi bam - hien ngay, khong doi bang KPI */}
      {pendingJobs.length > 0 && (
        <div className={DS.card}>
          <div className={`${DS.cardHeader} flex items-center justify-between`}>
            <h2 className={DS.sectionTitle}>
              <MaterialIcon name="sync" className="text-on-surface-variant" />
              Đang xử lý ({pendingJobs.filter(j => j.status === "processing").length})
            </h2>
            <button type="button" onClick={() => setPendingJobs([])} className={`${DS.muted} font-medium hover:underline`}>Xoá danh sách</button>
          </div>
          <div className="divide-y divide-outline-variant">
            {pendingJobs.map(job => (
              <div key={job.jobId} className="flex items-center justify-between gap-md px-lg py-sm">
                <div className="min-w-0">
                  <div className="text-body-sm font-semibold text-on-surface truncate">
                    {(() => { const ext = exts.find(e => e.user_id === job.uid); return ext ? labelOf(ext) : shortFbId(job.uid); })()}
                    {job.group ? ` → ${job.group}` : " → Cá nhân"}
                  </div>
                  {job.status === "failed" && job.error && <div className="text-body-sm text-red-600 truncate">{job.error}</div>}
                </div>
                <div className="shrink-0">
                  {job.status === "processing" && (
                    <span className="inline-flex items-center gap-xs text-amber-700 bg-amber-50 px-sm py-xs rounded-full text-body-sm font-bold border border-amber-100">
                      <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> Đang xử lý
                    </span>
                  )}
                  {job.status === "success" && (
                    <span className="inline-flex items-center gap-xs text-green-700 bg-green-50 px-sm py-xs rounded-full text-body-sm font-bold border border-green-100">
                      <MaterialIcon name="check" className="text-[14px]" /> Thành công
                      {job.postUrl && (
                        <a href={job.postUrl} target="_blank" rel="noopener noreferrer" className="ml-xs underline">Xem bài</a>
                      )}
                    </span>
                  )}
                  {job.status === "failed" && (
                    <span className="inline-flex items-center gap-xs text-red-700 bg-red-50 px-sm py-xs rounded-full text-body-sm font-bold border border-red-100">
                      <MaterialIcon name="error" className="text-[14px]" /> Thất bại
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lịch sử gần đây */}
      <div className={DS.card}>
        <div className={`${DS.cardHeader} flex items-center justify-between`}>
          <h2 className={DS.sectionTitle}>
            <MaterialIcon name="history" className="text-on-surface-variant" />
            Lịch sử đăng bài gần đây
          </h2>
          <span className={`${DS.muted} font-medium`}>Chỉ hiển thị bài đăng của bạn</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-left text-table-header text-on-surface">
                <th className="py-sm px-lg">Thời gian</th>
                <th className="py-sm px-lg">Tài khoản</th>
                <th className="py-sm px-lg">Nơi đăng</th>
                <th className="py-sm px-lg">Nội dung</th>
                <th className="py-sm px-lg text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {kpiPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-on-surface-variant py-xl">
                    <MaterialIcon name="article" className="text-4xl text-outline mb-sm block mx-auto" />
                    Chưa có bài đăng KPI nào trong tuần này
                  </td>
                </tr>
              ) : (
                kpiPosts.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-container-low transition-colors align-top">
                    <td className="py-md px-lg whitespace-nowrap text-on-surface-variant text-body-sm">
                      {j.posted_at ? new Date(j.posted_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-"}
                    </td>
                    <td className="py-md px-lg font-semibold text-on-surface">
                      {(() => {
                        const ext = exts.find(e => e.user_id === j.user_id);
                        return ext ? labelOf(ext) : shortFbId(j.user_id || "");
                      })()}
                    </td>
                    <td className="py-md px-lg whitespace-nowrap">
                      {j.target_type === "group" ? (
                        <span className="inline-flex items-center gap-xs text-purple-700 bg-purple-50 px-sm py-xs rounded-lg text-body-sm font-medium border border-purple-100">
                          <MaterialIcon name="groups" className="text-[14px]" /> Group
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-xs text-blue-700 bg-blue-50 px-sm py-xs rounded-lg text-body-sm font-medium border border-blue-100">
                          <MaterialIcon name="person" className="text-[14px]" /> Cá nhân
                        </span>
                      )}
                    </td>
                    <td className="py-md px-lg max-w-sm truncate text-on-surface" title={j.content}>
                      {j.content || <span className="text-on-surface-variant italic text-body-sm">Không có nội dung</span>}
                    </td>
                    <td className="py-md px-lg text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-xs text-green-700 bg-green-50 px-sm py-xs rounded-full text-body-sm font-bold border border-green-100">
                           Thành công
                        </span>
                        {j.post_url && (
                          <a
                            href={j.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-body-sm text-primary font-bold hover:underline inline-flex items-center gap-0.5 transition"
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
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-md transition-all"
          onClick={() => setIsPostModalOpen(false)}
        >
          <div
            className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-[95vw] md:w-[820px] max-w-[52rem] flex flex-col max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`${DS.cardHeader} flex justify-between items-center`}>
              <div className="flex items-center gap-sm">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MaterialIcon name="send" className="text-primary text-base" />
                </div>
                <h3 className="text-h3 text-on-surface">Đăng bài Facebook Seeding mới</h3>
              </div>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className={DS.iconButton}
              >
                <MaterialIcon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-lg space-y-md overflow-y-auto flex-1 text-on-surface">
              {/* Step 1: Chọn tài khoản */}
              <div className="space-y-sm">
                <div className="flex items-center justify-between">
                  <label className={DS.label}>Tài khoản đăng (đang online: {online.length})</label>
                  {online.length > 0 && (
                    <button
                      className="text-body-sm font-semibold text-primary hover:underline transition"
                      onClick={() => setSelected(new Set(online.map(e => e.user_id)))}
                    >
                      Chọn tất cả
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-xs max-h-[140px] overflow-y-auto p-xs border border-outline-variant rounded-lg bg-surface-container-low">
                  {online.length === 0 ? (
                    <span className="text-body-sm text-on-surface-variant italic p-xs">Chưa có tài khoản Facebook nào đang online.</span>
                  ) : (
                    online.map(e => {
                      const isSel = selected.has(e.user_id);
                      return (
                        <div
                          key={e.user_id}
                          className={`${DS.chip} pl-sm pr-xs cursor-pointer select-none ${
                            isSel
                              ? DS.selectedChip
                              : DS.subtleChip
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
                            className={`hover:text-primary transition p-0.5 rounded ${isSel ? "text-primary/70" : "text-on-surface-variant"}`}
                          >
                            <MaterialIcon name="edit" className="text-[13px]" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {extInstalled === false && (
                  <p className="text-body-sm text-amber-700 bg-amber-50 px-sm py-xs rounded-lg border border-amber-200">
                    ⚠️ Chưa phát hiện extension trên trình duyệt này. Vui lòng cài và mở extension để các tài khoản Facebook online hiển thị.
                  </p>
                )}
              </div>

              {/* Step 2: Chọn nơi đăng */}
              <div className="space-y-sm">
                <label className={`${DS.label} block`}>Chọn nơi đăng bài</label>
                <div className="grid grid-cols-2 gap-xs p-xs bg-surface-container-low border border-outline-variant rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTargetType("profile")}
                    className={`py-sm text-body-sm font-bold rounded-lg flex items-center justify-center gap-xs transition-all ${
                      targetType === "profile"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <MaterialIcon name="person" className="text-[16px]" /> Trang cá nhân
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("group")}
                    className={`py-sm text-body-sm font-bold rounded-lg flex items-center justify-center gap-xs transition-all ${
                      targetType === "group"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <MaterialIcon name="groups" className="text-[16px]" /> Nhóm (Group)
                  </button>
                </div>
              </div>

              {/* Nếu chọn đăng Group thì render danh sách group theo từng acc đã quét */}
              {targetType === "group" && (
                <div className="space-y-sm">
                  <div className="flex items-center justify-between gap-3">
                    <label className={`${DS.label} block`}>Chọn group theo từng tài khoản</label>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center rounded-full bg-surface-container-low px-sm py-xs text-[10px] font-bold text-on-surface-variant border border-outline-variant">
                        Tối đa 1 group/acc
                      </span>
                      {selectedAccountGroupCount > 0 && (
                        <button
                          type="button"
                          onClick={clearAllAccountGroups}
                          className="text-body-sm font-bold text-primary hover:underline"
                        >
                          Bỏ chọn group
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={scanGroupsForSelected}
                        disabled={scanningGroups.size > 0 || selectedOnline.length === 0 || selectedWithoutGroupScan.length === selectedOnline.length}
                        title={selectedWithoutGroupScan.length > 0 ? "Một số tài khoản cần cập nhật extension Seeding Markee mới để quét group" : undefined}
                        className={DS.secondaryButton}
                      >
                        {scanningGroups.size > 0 ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MaterialIcon name="sync" className="text-[14px]" />
                        )}
                        Quét group
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-sm rounded-lg bg-surface-container-low border border-outline-variant px-sm py-xs text-body-sm text-on-surface-variant">
                    <span>{selectedOnline.length} acc online đã chọn</span>
                    <span className="font-bold text-on-surface">{groupPostTargets.length}/{selectedOnline.length} acc có group · {groupPostTargets.length} lệnh đăng</span>
                  </div>

                  <div className="max-h-[430px] overflow-y-auto space-y-sm pr-1">
                    {selectedIds.length === 0 ? (
                      <div className="rounded-lg border border-outline-variant bg-surface p-md text-body-sm text-on-surface-variant">Chọn tài khoản trước.</div>
                    ) : (
                      selectedOnline.map(e => {
                        const list = accountGroupsByAccount.get(e.user_id) || [];
                        const canScanGroups = hasAccountGroupsFeature(e);
                        const selectedGroup = list.find(g => selectedAccountGroupKeys.has(accountGroupSelectionKey(e.user_id, g)));
                        const isScanning = scanningGroups.has(e.user_id);
                        const isPickerOpen = groupPickerAccountId === e.user_id;
                        const search = groupSearchByAccount[e.user_id] || "";
                        const q = search.trim().toLowerCase();
                        const filteredList = q
                          ? list.filter(g => (g.name || "").toLowerCase().includes(q) || (g.url || "").toLowerCase().includes(q) || (g.group_id || "").toLowerCase().includes(q))
                          : list;
                        return (
                          <div key={e.user_id} className="rounded-xl border border-outline-variant bg-surface overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm px-sm py-sm border-b border-outline-variant bg-surface-container-low">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-body-md font-bold text-on-surface truncate">{labelOf(e)}</span>
                                  <span className="text-[10px] text-on-surface-variant shrink-0">{shortFbId(e.user_id)}</span>
                                </div>
                                <div className="mt-0.5 text-[10px] text-on-surface-variant">
                                  {canScanGroups
                                    ? groupLastScan[e.user_id] ? `Quét gần nhất ${new Date(groupLastScan[e.user_id] as string).toLocaleDateString("vi-VN")}` : "Chưa quét group"
                                    : `Cần cập nhật extension${e.version ? ` (${e.version})` : ""}`}
                                  {canScanGroups && list.length > 0 ? ` · ${list.length} group đã lưu` : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {selectedGroup && (
                                  <button
                                    type="button"
                                    onClick={() => clearGroupsForAccount(e.user_id)}
                                    className={DS.secondaryButton}
                                  >
                                    Bỏ chọn
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setGroupPickerAccountId(prev => prev === e.user_id ? null : e.user_id)}
                                  disabled={!canScanGroups || list.length === 0}
                                  className={DS.primaryButton}
                                >
                                  <MaterialIcon name={isPickerOpen ? "arrow_drop_down" : selectedGroup ? "edit" : "search"} className="text-[14px]" />
                                  {isPickerOpen ? "Đóng" : selectedGroup ? "Đổi group" : "Chọn group"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => scanGroupsForAccounts([e])}
                                  disabled={!canScanGroups || isScanning}
                                  className={DS.secondaryButton}
                                >
                                  {isScanning ? (
                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <MaterialIcon name="sync" className="text-[14px]" />
                                  )}
                                  Quét
                                </button>
                              </div>
                            </div>

                            {!canScanGroups ? (
                              <div className="p-sm text-body-sm text-amber-700 bg-amber-50">
                                Tài khoản này đang dùng extension cũ nên chưa quét được group.
                              </div>
                            ) : list.length === 0 ? (
                              <div className="p-sm text-body-sm text-on-surface-variant space-y-xs">
                                <div>Chưa có group trong cache. Bấm Quét để cập nhật group của tài khoản này.</div>
                                <div>
                                  Nếu trước đó đã lỡ xoá hết group (xoá = loại trừ vĩnh viễn khỏi lần quét sau), bấm{" "}
                                  <button type="button" onClick={() => restoreExcludedGroups(e.user_id)} className="font-bold text-primary hover:underline">
                                    khôi phục group đã ẩn
                                  </button>{" "}rồi quét lại.
                                </div>
                              </div>
                            ) : (
                              <div className="p-sm space-y-sm">
                                {selectedGroup ? (
                                  <div className="flex items-start gap-sm rounded-lg border border-emerald-100 bg-emerald-50 px-sm py-xs">
                                    <MaterialIcon name="check_circle" className="text-[18px] text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-body-md font-bold text-on-surface truncate">{selectedGroup.name}</div>
                                      <div className="mt-0.5 text-[10px] text-on-surface-variant truncate">{selectedGroup.url || selectedGroup.group_id}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-outline-variant px-sm py-xs text-body-sm text-on-surface-variant">
                                    Chưa chọn group cho tài khoản này.
                                  </div>
                                )}

                                {isPickerOpen && (
                                  <div className="rounded-lg border border-outline-variant overflow-hidden">
                                    <div className="p-xs border-b border-outline-variant bg-surface-container-low">
                                      <input
                                        value={search}
                                        onChange={ev => setGroupSearchByAccount(prev => ({ ...prev, [e.user_id]: ev.target.value }))}
                                        placeholder="Tìm group của tài khoản này..."
                                        className={DS.field}
                                      />
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto divide-y divide-outline-variant bg-surface">
                                      {filteredList.length === 0 ? (
                                        <div className="p-sm text-body-sm text-on-surface-variant">Không có group khớp bộ lọc.</div>
                                      ) : filteredList.map(g => {
                                        const selectionKey = accountGroupSelectionKey(e.user_id, g);
                                        const checked = selectedAccountGroupKeys.has(selectionKey);
                                        const deleting = deletingAccountGroupKeys.has(selectionKey);
                                        return (
                                          <div
                                            key={selectionKey}
                                            className={`flex items-start gap-sm px-sm py-sm transition ${
                                              checked ? "bg-primary/5" : "hover:bg-surface-container-low"
                                            }`}
                                          >
                                            <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                                              <input
                                                type="radio"
                                                name={`group-${e.user_id}`}
                                                checked={checked}
                                                onChange={() => {
                                                  toggleAccountGroup(e.user_id, g);
                                                  setGroupPickerAccountId(null);
                                                }}
                                                className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                                              />
                                              <div className="min-w-0 flex-1">
                                                <div className="text-body-md font-semibold text-on-surface truncate">{g.name}</div>
                                                <div className="mt-0.5 text-[10px] text-on-surface-variant truncate">{g.url || g.group_id}</div>
                                              </div>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => deleteAccountGroup(e.user_id, g)}
                                              disabled={deleting}
                                              title="Xóa group khỏi cache tài khoản này"
                                              className={`${DS.iconButton} shrink-0`}
                                            >
                                              {deleting ? (
                                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                              ) : (
                                                <MaterialIcon name="delete" className="text-[16px]" />
                                              )}
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-sm text-[10px] text-on-surface-variant">
                    <span>{groups.length > 0 ? `Thư viện đối chiếu: ${groups.length} group.` : "Cache group lấy từ extension."}</span>
                    <span className="shrink-0 font-bold text-on-surface">
                      {targetType === "group" ? `${groupPostTargets.length} lệnh đăng` : ""}
                    </span>
                  </div>
                </div>
              )}

              {/* Step 3: Nội dung */}
              <div className="space-y-1.5">
                <label className={DS.label}>Nội dung bài viết seeding</label>
                <textarea
                  value={content}
                  onChange={ev => setContent(ev.target.value)}
                  placeholder="Nhập nội dung bài viết muốn đăng..."
                  className={`${DS.field} min-h-[128px] resize-y`}
                />
              </div>

              {/* Step 4: Hình ảnh */}
              <div className="space-y-2">
                <label className={DS.label}>Hình ảnh kèm theo (tùy chọn)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low transition hover:border-primary hover:bg-primary/5">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <MaterialIcon name="image" className="mb-1 text-2xl text-on-surface-variant" />
                      <p className="text-body-sm font-medium text-on-surface-variant">Click để chọn tải ảnh từ máy tính</p>
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
                      <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low shadow-sm group">
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
            <div className="flex justify-end gap-sm border-t border-outline-variant bg-surface-container-low px-lg py-md">
              <button
                onClick={() => setIsPostModalOpen(false)}
                className={DS.secondaryButton}
              >
                Hủy
              </button>
              <button
                onClick={submit}
                disabled={sending}
                className={DS.primaryButton}
              >
                {sending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang gửi ({targetType === "group" ? groupPostTargets.length : selectedOnline.length})...
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
