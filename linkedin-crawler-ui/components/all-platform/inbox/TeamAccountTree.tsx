"use client";

/**
 * Cây chọn tài khoản FB cho ADMIN / LEADER ở trang Inbox:
 *   Team → thành viên → tài khoản FB (lọc theo session.owner === member.id).
 * Bấm 1 tài khoản → onSelect(user_id) (tái dùng toàn bộ logic inbox của trang).
 * - Tự mở team chứa tài khoản đang chọn.
 * - Hiện số hội thoại CHƯA ĐỌC trên mỗi tài khoản & tổng trên mỗi team (fetch khi mở team).
 * Member không dùng component này (giữ danh sách chip đơn giản).
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { teamsService, type TeamRow } from "@/services/all-platform.service";
import { fbFetch } from "@/lib/markee-fb-api";

export interface TreeSession {
  user_id: string;
  label?: string;
  owner?: string;
  status?: string; // "online" | "offline"
}

interface Props {
  sessions: TreeSession[];
  ownerNames: Record<string, string>;
  selectedAcc: string;
  onSelect: (userId: string) => void;
  role: string; // "admin" | "leader" | ...
  owner: string; // id user hiện tại
}

interface MemberNode { id: string; name: string; accounts: TreeSession[]; }
interface TeamNode { id: string; name: string; members: MemberNode[]; accountCount: number; }

export default function TeamAccountTree({ sessions, ownerNames, selectedAcc, onSelect, role, owner }: Props) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({}); // user_id -> số hội thoại chưa đọc

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await teamsService.getAll();
        if (cancelled) return;
        const all = Array.isArray(res?.data) ? res.data : [];
        // leader chỉ thấy team mình; admin thấy hết
        setTeams(role === "leader" ? all.filter(t => t.id_leader === owner) : all);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [role, owner]);

  const accName = (s: TreeSession) => (s.owner && ownerNames[s.owner]) || s.label || s.user_id;

  // Dựng cây: gom session theo owner, map vào member của từng team.
  const { tree, orphan } = useMemo(() => {
    const byOwner = new Map<string, TreeSession[]>();
    for (const s of sessions) {
      const key = s.owner || "";
      if (!byOwner.has(key)) byOwner.set(key, []);
      byOwner.get(key)!.push(s);
    }
    const usedOwners = new Set<string>();
    const tree: TeamNode[] = [];
    for (const t of teams) {
      const members: MemberNode[] = [];
      // leader cũng có thể có acc riêng → thêm leader như 1 "thành viên" đầu danh sách
      const memberList = [
        { id: t.id_leader, name: t.leader_name || t.leader_email || t.id_leader },
        ...(t.members || []).map(m => ({ id: m.id, name: m.name || m.email || m.id })),
      ];
      let count = 0;
      for (const m of memberList) {
        const accs = byOwner.get(m.id) || [];
        if (accs.length) { usedOwners.add(m.id); count += accs.length; }
        members.push({ id: m.id, name: m.name, accounts: accs });
      }
      tree.push({ id: t.id, name: t.name_team, members, accountCount: count });
    }
    // Acc có owner không thuộc team nào (hoặc owner rỗng)
    const orphan: TreeSession[] = [];
    for (const [ownerId, accs] of byOwner) {
      if (!usedOwners.has(ownerId)) orphan.push(...accs);
    }
    return { tree, orphan };
  }, [teams, sessions]);

  // Đếm hội thoại chưa đọc cho 1 loạt tài khoản (gọi khi mở team / mục Khác).
  const fetchUnread = useCallback((accs: TreeSession[]) => {
    accs.forEach(async (s) => {
      try {
        const r = await fbFetch(`/inbox/conversations?user_id=${encodeURIComponent(s.user_id)}`);
        const d = await r.json();
        const n = Array.isArray(d.conversations) ? d.conversations.filter((c: { unread?: boolean; deleted?: boolean }) => c.unread && !c.deleted).length : 0;
        setUnread(prev => ({ ...prev, [s.user_id]: n }));
      } catch { /* ignore */ }
    });
  }, []);

  const toggle = (id: string, accs?: TreeSession[]) => {
    setExpanded(p => {
      const next = { ...p, [id]: !p[id] };
      if (!p[id] && accs?.length) fetchUnread(accs); // vừa mở → nạp số chưa đọc
      return next;
    });
  };

  // Tự mở team (hoặc mục Khác) chứa tài khoản đang chọn.
  useEffect(() => {
    if (!selectedAcc) return;
    const team = tree.find(t => t.members.some(m => m.accounts.some(a => a.user_id === selectedAcc)));
    if (team) {
      setExpanded(p => (p[team.id] ? p : { ...p, [team.id]: true }));
      fetchUnread(team.members.flatMap(m => m.accounts));
    } else if (orphan.some(a => a.user_id === selectedAcc)) {
      setExpanded(p => (p["__orphan__"] ? p : { ...p, __orphan__: true }));
      fetchUnread(orphan);
    }
  }, [selectedAcc, tree, orphan, fetchUnread]);

  const matchQ = (s: TreeSession) => !q.trim() || accName(s).toLowerCase().includes(q.trim().toLowerCase());
  const dot = (s: TreeSession) => (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${s.status === "online" ? "bg-green-500" : "bg-gray-300"}`} />
  );
  const teamUnread = (t: TeamNode) => t.members.reduce((s, m) => s + m.accounts.reduce((x, a) => x + (unread[a.user_id] || 0), 0), 0);

  const AccBtn = ({ s }: { s: TreeSession }) => {
    const u = unread[s.user_id] || 0;
    const sel = selectedAcc === s.user_id;
    return (
      <button onClick={() => onSelect(s.user_id)}
        title={s.status === "online" ? "Đang online" : "Offline — chỉ xem tin cũ"}
        className={`w-full text-left inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-md text-sm font-medium border-l-2 transition ${sel ? "bg-[#FFF0F0] text-[#C40009] border-[#E3000F]" : "border-transparent hover:bg-[#F5F5F5] text-[#1A1A1A]"}`}>
        {dot(s)}<span className="truncate">{accName(s)}</span>
        {u > 0 && <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{u}</span>}
        {s.status !== "online" && <span className={`text-[10px] text-[#A0A0A0] ${u > 0 ? "" : "ml-auto"}`}>offline</span>}
      </button>
    );
  };

  return (
    <div className="text-sm">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tài khoản / nhân viên..."
        className="w-full mb-2 border border-[#E5E5E5] rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] text-[#1A1A1A]" />
      <div className="max-h-[360px] overflow-auto space-y-1 pr-1">
        {tree.length === 0 && orphan.length === 0 && (
          <div className="text-[#A0A0A0] text-xs py-4 text-center">Chưa có team / tài khoản nào.</div>
        )}
        {tree.map(team => {
          const tu = teamUnread(team);
          return (
            <div key={team.id} className="border border-[#E5E5E5] rounded-lg">
              <button onClick={() => toggle(team.id, team.members.flatMap(m => m.accounts))} className="w-full flex items-center justify-between px-3 py-2 font-bold text-[#1A1A1A]">
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-[#A0A0A0]">{expanded[team.id] ? "▾" : "▸"}</span>{team.name}
                </span>
                <span className="flex items-center gap-1.5">
                  {tu > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{tu} chưa đọc</span>}
                  <span className="text-[11px] text-[#A0A0A0] font-semibold">{team.accountCount} acc</span>
                </span>
              </button>
              {expanded[team.id] && (
                <div className="px-2 pb-2 space-y-1">
                  {team.members.map(m => {
                    const accs = m.accounts.filter(matchQ);
                    if (q.trim() && accs.length === 0) return null;
                    return (
                      <div key={m.id} className="pl-2">
                        <div className="text-xs font-semibold text-[#666666] px-1 py-0.5">{m.name}{m.accounts.length === 0 && <span className="text-[#C0C0C0] font-normal"> · chưa có tài khoản</span>}</div>
                        <div className="space-y-0.5">{accs.map(s => <AccBtn key={s.user_id} s={s} />)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {orphan.filter(matchQ).length > 0 && (
          <div className="border border-[#E5E5E5] rounded-lg">
            <button onClick={() => toggle("__orphan__", orphan)} className="w-full flex items-center justify-between px-3 py-2 font-bold text-[#1A1A1A]">
              <span className="flex items-center gap-1.5"><span className="text-[#A0A0A0]">{expanded["__orphan__"] ? "▾" : "▸"}</span>Khác / chưa thuộc team</span>
              <span className="text-[11px] text-[#A0A0A0] font-semibold">{orphan.length} acc</span>
            </button>
            {expanded["__orphan__"] && (
              <div className="px-2 pb-2 space-y-0.5">{orphan.filter(matchQ).map(s => <AccBtn key={s.user_id} s={s} />)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
