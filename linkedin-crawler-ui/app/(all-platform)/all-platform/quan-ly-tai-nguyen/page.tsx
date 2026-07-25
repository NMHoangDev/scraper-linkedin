'use client';

import React, { useState } from 'react';

// ==================== TYPES & INTERFACES ====================
type TabType = 'domain' | 'vps' | 'seeding';
type DomainType = 'own' | 'client';
type PlatformType = 'facebook' | 'linkedin' | 'gmail';

interface DomainItem {
  id: string;
  name: string;
  type: DomainType;
  da: number;
  status: 'active' | 'expiring' | 'expired';
  expireDate: string;
  backlinks?: number;
  registrar?: string;
}

interface VpsItem {
  id: string;
  name: string;
  provider: string;
  region: string;
  spec: string;
  status: 'online' | 'warning' | 'offline';
  purpose: string;
  cpu: number;
  ram: number;
  uptime: string;
  ip?: string;
  os?: string;
}

interface SeedingItem {
  id: string;
  name: string;
  username: string;
  vps: string;
  platform: PlatformType;
  status: 'online' | 'offline' | 'warning';
  onlineTime: string;
  statLabel: string;
  statValue: string;
  age: string;
  tagExtra?: string;
}

interface DetailModalData {
  title: string;
  rows: [string, string][];
}

// ==================== INITIAL MOCK DATA ====================
const INITIAL_DOMAINS: DomainItem[] = [
  { id: '1', name: 'example.vn', type: 'own', da: 45, status: 'active', expireDate: '12/2026', backlinks: 38, registrar: 'Mắt Bão' },
  { id: '2', name: 'client-shop.com', type: 'client', da: 32, status: 'active', expireDate: '03/2027', backlinks: 12, registrar: 'GoDaddy' },
  { id: '3', name: 'seo-blog.net', type: 'own', da: 28, status: 'expiring', expireDate: '08/2026', backlinks: 54, registrar: 'Namecheap' },
  { id: '4', name: 'brand-viet.vn', type: 'client', da: 61, status: 'active', expireDate: '06/2027', backlinks: 102, registrar: 'PA Việt Nam' },
  { id: '5', name: 'oldsite.com', type: 'own', da: 15, status: 'expired', expireDate: '01/2026', backlinks: 5, registrar: 'GoDaddy' },
  { id: '6', name: 'fashion-hub.vn', type: 'client', da: 39, status: 'active', expireDate: '09/2026', backlinks: 24, registrar: 'Mắt Bão' },
  { id: '7', name: 'travelviet.com', type: 'client', da: 24, status: 'active', expireDate: '11/2026', backlinks: 18, registrar: 'Cloudflare' },
];

const INITIAL_VPS: VpsItem[] = [
  { id: '1', name: 'VPS-SEO-01', provider: 'Vultr', region: 'Singapore', spec: '4 vCPU / 8GB', status: 'online', purpose: 'Seeding FB', cpu: 23, ram: 61, uptime: '99.9%', ip: '103.14.22.1', os: 'Ubuntu 22.04 LTS' },
  { id: '2', name: 'VPS-SEO-02', provider: 'DigitalOcean', region: 'US', spec: '2 vCPU / 4GB', status: 'warning', purpose: 'Seeding Gmail', cpu: 88, ram: 94, uptime: '98.1%', ip: '104.28.19.82', os: 'Debian 11' },
  { id: '3', name: 'VPS-CRAW-01', provider: 'Linode', region: 'Japan', spec: '8 vCPU / 16GB', status: 'online', purpose: 'Crawl dữ liệu', cpu: 45, ram: 52, uptime: '100%', ip: '139.162.2.45', os: 'Ubuntu 20.04 LTS' },
  { id: '4', name: 'VPS-SEO-03', provider: 'Vultr', region: 'Tokyo', spec: '4 vCPU / 8GB', status: 'online', purpose: 'Seeding LinkedIn', cpu: 36, ram: 45, uptime: '99.7%', ip: '108.61.12.9', os: 'Ubuntu 22.04 LTS' },
];

const INITIAL_SEEDING: SeedingItem[] = [
  { id: '1', name: 'Nguyễn Văn A', username: 'van.a', vps: 'VPS-SEO-01', platform: 'facebook', status: 'online', onlineTime: '6h20p', statLabel: 'Bạn bè', statValue: '1240', age: '2y3m', tagExtra: 'Bình thường' },
  { id: '2', name: 'Trần Thị B', username: 'thi.b', vps: 'VPS-SEO-02', platform: 'facebook', status: 'offline', onlineTime: '0h00p', statLabel: 'Bạn bè', statValue: '980', age: '1y1m', tagExtra: '▲ Checkpoint' },
  { id: '3', name: 'Le Van C', username: 'levanc', vps: 'VPS-CRAW-01', platform: 'linkedin', status: 'online', onlineTime: '4h10p', statLabel: 'Kết nối', statValue: '540', age: '3y6m', tagExtra: '540+ kết nối' },
  { id: '4', name: 'seed.gmail01', username: 'Gmail', vps: 'VPS-SEO-01', platform: 'gmail', status: 'online', onlineTime: '8h00p', statLabel: 'Email gửi', statValue: '120', age: '4y0m' },
  { id: '5', name: 'Pham Thi D', username: 'phamthid', vps: 'VPS-SEO-03', platform: 'linkedin', status: 'online', onlineTime: '3h40p', statLabel: 'Kết nối', statValue: '320', age: '1y8m', tagExtra: '320 kết nối' },
  { id: '6', name: 'seed.gmail02', username: 'Gmail', vps: 'VPS-SEO-02', platform: 'gmail', status: 'warning', onlineTime: '1h05p', statLabel: 'Email gửi', statValue: '42', age: '0y6m', tagExtra: '▲ Cần xác minh' },
];

export default function ResourceManagementPage() {
  // ==================== STATES ====================
  const [activeTab, setActiveTab] = useState<TabType>('domain');
  
  // Data State
  const [domains, setDomains] = useState<DomainItem[]>(INITIAL_DOMAINS);
  const [vpsList, setVpsList] = useState<VpsItem[]>(INITIAL_VPS);
  const [seedingList, setSeedingList] = useState<SeedingItem[]>(INITIAL_SEEDING);

  // Filters
  const [domainFilter, setDomainFilter] = useState<'all' | 'own' | 'client'>('all');
  const [seedingFilter, setSeedingFilter] = useState<'all' | 'facebook' | 'linkedin' | 'gmail' | 'unassigned'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI Control
  const [activeDrawer, setActiveDrawer] = useState<'add-domain' | 'add-vps' | 'add-seeding' | 'detail' | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModalData | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  // ==================== HANDLERS ====================
  const addToast = (msg: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const openDetail = (title: string, rows: [string, string][]) => {
    setDetailModal({ title, rows });
    setActiveDrawer('detail');
  };

  // Form Submissions
  const handleAddDomain = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const type = formData.get('type') as DomainType;
    const da = Number(formData.get('da')) || 0;
    const exp = formData.get('exp') as string;

    const [y, m] = exp ? exp.split('-') : ['2027', '01'];
    const newDomain: DomainItem = {
      id: String(Date.now()),
      name,
      type,
      da,
      status: 'active',
      expireDate: `${m}/${y}`,
      backlinks: 0,
      registrar: 'Khác',
    };

    setDomains([newDomain, ...domains]);
    setActiveDrawer(null);
    addToast(`Đã thêm domain ${name}`);
  };

  const handleAddVps = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const provider = (formData.get('provider') as string) || 'Vultr';
    const region = (formData.get('region') as string) || 'Singapore';
    const spec = (formData.get('spec') as string) || '4 vCPU / 8GB';
    const purpose = formData.get('purpose') as string;

    const newVps: VpsItem = {
      id: String(Date.now()),
      name,
      provider,
      region,
      spec,
      status: 'online',
      purpose,
      cpu: Math.floor(Math.random() * 20) + 5,
      ram: Math.floor(Math.random() * 20) + 10,
      uptime: '100%',
      ip: `103.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.1`,
      os: 'Ubuntu 22.04 LTS',
    };

    setVpsList([newVps, ...vpsList]);
    setActiveDrawer(null);
    addToast(`Đã thêm VPS ${name}`);
  };

  const handleAddSeeding = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const platform = formData.get('platform') as PlatformType;
    const username = (formData.get('username') as string) || '—';
    const vps = (formData.get('vps') as string) || 'Chưa gán';

    const newSeeding: SeedingItem = {
      id: String(Date.now()),
      name,
      username,
      vps,
      platform,
      status: 'online',
      onlineTime: '0h01p',
      statLabel: 'Hoạt động',
      statValue: '—',
      age: 'Mới',
      tagExtra: 'Mới thêm',
    };

    setSeedingList([newSeeding, ...seedingList]);
    setActiveDrawer(null);
    addToast(`Đã thêm tài khoản ${name}`);
  };

  // Filter Computation
  const filteredDomains = domains.filter((d) => {
    const matchesType = domainFilter === 'all' || d.type === domainFilter;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredVps = vpsList.filter((v) =>
    (v.name + ' ' + v.provider + ' ' + v.region).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSeeding = seedingList.filter((s) => {
    let matchesPlatform = true;
    if (seedingFilter === 'unassigned') {
      matchesPlatform = !s.vps || s.vps === 'Chưa gán';
    } else if (seedingFilter !== 'all') {
      matchesPlatform = s.platform === seedingFilter;
    }
    const matchesSearch = (s.name + ' ' + s.username).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  return (
    <div className="resource-page-container">
      {/* Scoped CSS cho riêng phần Content */}
      <style>{`
        .resource-page-container {
          --bg: #F3F4F8;
          --surface: #FFFFFF;
          --surface-soft: #F9FAFC;
          --border: #E4E7EF;
          --border-strong: #CDD2E0;
          --ink-900: #0F1424;
          --ink-950: #090C16;
          --ink-line: #2B3350;
          --text-900: #0D1020;
          --text-600: #565C74;
          --text-400: #8C91A6;
          --brand: #C8102E;
          --brand-dark: #96081F;
          --brand-tint: #FCE9EC;
          --signal: #17A34A;
          --signal-dark: #0E7A38;
          --signal-tint: #E6F7EC;
          --indigo: #5A5FE0;
          --indigo-dark: #4448B8;
          --indigo-tint: #ECEDFC;
          --amber: #E08A1E;
          --amber-tint: #FDF1DC;
          --rose: #E3394F;
          --rose-tint: #FCE7EA;
          --sky: #2C93E8;
          --sky-tint: #E7F2FD;
          --font-display: 'Sora', system-ui, sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;
          --radius: 12px;
          
          font-family: var(--font-body);
          color: var(--text-900);
          padding: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .page-head { margin-bottom: 22px; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .page-head h1 { font-family: var(--font-display); font-size: 23px; font-weight: 800; letter-spacing: -0.01em; margin: 0; }
        .page-head p { color: var(--text-600); font-size: 13.5px; margin-top: 5px; max-width: 560px; }

        /* RESOURCE CHAIN */
        .chain { background: linear-gradient(160deg, var(--ink-900), var(--ink-950) 75%); border-radius: 16px; padding: 22px 26px 20px; margin-bottom: 24px; color: #fff; position: relative; overflow: hidden; border: 1px solid var(--ink-line); border-top: 2.5px solid var(--brand); }
        .chain::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.05) 1px, transparent 0); background-size: 18px 18px; pointer-events: none; }
        .chain::after { content: ""; position: absolute; top: -80px; right: -60px; width: 260px; height: 260px; background: radial-gradient(circle, rgba(200,16,46,.22), transparent 70%); pointer-events: none; }
        .chain-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px; position: relative; }
        .chain-label { font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; color: #7B81A6; text-transform: uppercase; letter-spacing: 0.12em; }
        .chain-updated { font-family: var(--font-mono); font-size: 10.5px; color: #4E5478; display:flex; align-items:center; gap:6px; }
        .chain-row { display: flex; align-items: stretch; gap: 0; position: relative; }
        .chain-node { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; border-radius: 12px; cursor: pointer; background: rgba(255,255,255,.03); border: 1px solid transparent; transition: background .15s, border-color .15s, transform .15s; position: relative; z-index: 1; }
        .chain-node:hover { background: rgba(255,255,255,.06); transform: translateY(-2px); }
        .chain-node.is-active { border-color: var(--chain-c); background: rgba(255,255,255,.06); }
        .chain-node-head { display: flex; align-items: center; gap: 9px; }
        .chain-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--chain-c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--chain-c) 22%, transparent); }
        .chain-node-title { font-size: 12px; font-weight: 600; color: #B7BBD6; }
        .chain-node-num { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: #fff; }
        .chain-node-sub { font-family: var(--font-mono); font-size: 10.5px; color: #7B81A6; }
        .chain-arrow { display: flex; align-items: center; justify-content: center; width: 34px; flex-shrink: 0; color: #3C4266; }
        .chain-arrow svg { width: 18px; height: 18px; }
        .chain-node[data-node="domain"]   { --chain-c: var(--sky); }
        .chain-node[data-node="vps"]      { --chain-c: var(--indigo); }
        .chain-node[data-node="seeding"]  { --chain-c: var(--signal); }
        .chain-footer { display: grid; grid-template-columns: repeat(2, auto); gap: 20px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ink-line); position: relative; }
        .chain-mini { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #9BA0C4; }
        .chain-mini b { font-family: var(--font-mono); color: #fff; font-weight: 600; }
        .chain-mini .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .chain-mini .dot.online { background: var(--signal); }
        .chain-mini .dot.alert { background: var(--amber); }

        /* TAB BAR */
        .tab-bar { display: flex; gap: 4px; margin-bottom: 22px; border-bottom: 2px solid var(--border); }
        .tab { padding: 11px 18px; font-size: 13.5px; font-weight: 600; cursor: pointer; color: var(--text-600); border-bottom: 2.5px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 8px; transition: color .15s, border-color .15s; }
        .tab svg { width: 15px; height: 15px; }
        .tab:hover { color: var(--text-900); }
        .tab.active { color: var(--brand); border-bottom-color: var(--brand); }
        .tab-count { font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; background: var(--border); color: var(--text-600); border-radius: 5px; padding: 1.5px 7px; transition: background .15s, color .15s; }
        .tab.active .tab-count { background: var(--brand-tint); color: var(--brand); }

        /* SECTION HEADER */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
        .section-title { font-family: var(--font-display); font-size: 16.5px; font-weight: 700; }
        .section-sub { color: var(--text-600); font-size: 12.5px; margin-top: 3px; }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .search-box { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 9px; padding: 8px 13px; min-width: 230px; transition: border-color .15s, box-shadow .15s; }
        .search-box:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-tint); }
        .search-box svg { flex-shrink: 0; color: var(--text-400); width: 15px; height:15px; }
        .search-box input { border: none; outline: none; font-family: var(--font-body); font-size: 13px; width: 100%; background: transparent; color: var(--text-900); }
        .btn-primary { background: var(--brand); color: #fff; border: none; border-radius: 9px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 7px; font-family: var(--font-body); transition: background .15s, transform .1s; white-space: nowrap; box-shadow: 0 3px 10px rgba(200,16,46,.25); }
        .btn-primary svg { width: 15px; height: 15px; }
        .btn-primary:hover { background: var(--brand-dark); }

        /* PILLS */
        .pill-tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
        .pill { padding: 7px 15px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border); transition: all .15s; font-family: var(--font-mono); color: var(--text-600); background: var(--surface); }
        .pill.active { background: var(--brand); color: #fff; border-color: var(--brand); }
        .pill:not(.active):hover { border-color: var(--border-strong); color: var(--text-900); }

        /* CARDS & GRID */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(315px, 1fr)); gap: 14px; }
        .res-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 17px; display: flex; flex-direction: column; gap: 13px; transition: border-color .18s, box-shadow .18s, transform .18s; }
        .res-card:hover { border-color: var(--border-strong); box-shadow: 0 10px 26px rgba(15,20,40,.08); transform: translateY(-2px); }
        .card-top { display: flex; align-items: flex-start; justify-content: space-between; }
        .card-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 13.5px; flex-shrink: 0; font-family: var(--font-display); font-weight: 700; color: #fff; }
        .card-avatar.fb  { background: var(--sky); }
        .card-avatar.li  { background: var(--indigo); }
        .card-avatar.gm  { background: var(--rose); }
        .card-avatar.vps { background: var(--indigo-dark); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
        .status-dot.online  { background: var(--signal); box-shadow: 0 0 0 3px var(--signal-tint); }
        .status-dot.offline { background: var(--rose); box-shadow: 0 0 0 3px var(--rose-tint); }
        .status-dot.warning { background: var(--amber); box-shadow: 0 0 0 3px var(--amber-tint); }
        .card-name { font-weight: 700; font-size: 13.5px; }
        .card-meta { font-size: 12px; color: var(--text-600); font-family: var(--font-mono); margin-top: 1px; }
        .card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .tag { background: var(--border); color: var(--text-600); border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 600; font-family: var(--font-mono); display: inline-flex; align-items: center; gap: 4px; }
        .tag.green  { background: var(--signal-tint); color: var(--signal-dark); }
        .tag.yellow { background: var(--amber-tint); color: #97620E; }
        .tag.red    { background: var(--rose-tint); color: #C22A3B; }
        .tag.blue   { background: var(--sky-tint); color: #1976C4; }
        .tag.purple { background: var(--indigo-tint); color: var(--indigo-dark); }
        .card-stats { display: flex; gap: 16px; border-top: 1px solid var(--border); padding-top: 12px; }
        .stat-item { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; flex: 1; }
        .stat-label { font-size: 10px; color: var(--text-400); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .stat-value { font-size: 14px; font-weight: 700; color: var(--text-900); font-family: var(--font-mono); }
        .gauge { display: flex; align-items: center; gap: 8px; }
        .gauge-ring { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display:flex; align-items:center; justify-content:center; position: relative; }
        .gauge-ring svg { transform: rotate(-90deg); }
        .gauge-ring .bg { fill: none; stroke: var(--border); stroke-width: 3.5; }
        .gauge-ring .fg { fill: none; stroke-width: 3.5; stroke-linecap: round; transition: stroke-dasharray .6s ease; }
        .gauge-num { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; position: absolute; }
        .card-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .btn-sm { padding: 7px 13px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-body); }
        .btn-sm.outline { background: none; border: 1.5px solid var(--border); color: var(--text-600); }
        .btn-sm.outline:hover { border-color: var(--brand); color: var(--brand); }
        .btn-sm.danger  { background: var(--rose-tint); color: #C22A3B; }
        .btn-sm.ghost { background: var(--signal-tint); color: var(--signal-dark); }

        /* DATA TABLE */
        .data-table { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .dt-head { display: grid; grid-template-columns: var(--cols); background: var(--surface-soft); padding: 12px 20px; font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; color: var(--text-400); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1.5px solid var(--border); }
        .dt-row { display: grid; grid-template-columns: var(--cols); padding: 14px 20px; border-top: 1px solid var(--border); align-items: center; }
        .dt-row:first-of-type { border-top: none; }
        .dt-row:hover { background: var(--surface-soft); }
        .dt-domain { font-weight: 700; font-size: 13px; display:flex; align-items:center; gap:8px; }
        .dt-domain svg { width: 14px; height: 14px; color: var(--text-400); flex-shrink:0; }
        .dt-mono { font-family: var(--font-mono); font-weight: 600; font-size: 13px; }

        /* PANELS */
        .panel { display: none; }
        .panel.active { display: block; animation: panelIn .3s cubic-bezier(.4,0,.2,1); }
        @keyframes panelIn { from { opacity: 0; transform: translateY(8px);} to { opacity:1; transform:none;} }

        /* DRAWER & OVERLAY */
        .overlay { position: fixed; inset: 0; background: rgba(9,12,22,.45); backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 40; }
        .overlay.show { opacity: 1; pointer-events: auto; }
        .drawer { position: fixed; top: 0; right: 0; height: 100%; width: 420px; max-width: 92vw; background: var(--surface); border-left: 1px solid var(--border); transform: translateX(100%); transition: transform .28s cubic-bezier(.4,0,.2,1); z-index: 41; display: flex; flex-direction: column; box-shadow: -12px 0 40px rgba(0,0,0,.18); }
        .drawer.show { transform: translateX(0); }
        .drawer-head { padding: 20px 22px; border-bottom: 1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .drawer-head h3 { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin:0; }
        .drawer-close { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid var(--border); background: none; cursor: pointer; color: var(--text-600); display:flex; align-items:center; justify-content:center; }
        .drawer-body { padding: 22px; overflow-y: auto; flex: 1; display:flex; flex-direction:column; gap: 16px; }
        .drawer-foot { padding: 16px 22px; border-top: 1px solid var(--border); display:flex; gap: 10px; }
        .field { display:flex; flex-direction:column; gap: 7px; }
        .field label { font-size: 12.5px; font-weight: 600; color: var(--text-600); }
        .field input, .field select, .field textarea { border: 1.5px solid var(--border); border-radius: 9px; padding: 9px 12px; font-size: 13.5px; font-family: var(--font-body); background: var(--surface); color: var(--text-900); outline: none; }
        .field-row { display: flex; gap: 12px; }
        .field-row .field { flex: 1; }
        .btn-outline-full { flex: 1; padding: 11px; border-radius: 9px; border: 1.5px solid var(--border); background: none; color: var(--text-600); font-weight: 700; font-size: 13.5px; cursor: pointer; }
        .btn-primary-full { flex: 1.4; padding: 11px; border-radius: 9px; border: none; background: var(--brand); color: #fff; font-weight: 700; font-size: 13.5px; cursor: pointer; }

        /* TOAST */
        .toast-wrap { position: fixed; bottom: 22px; right: 22px; z-index: 60; display:flex; flex-direction: column; gap: 10px; }
        .toast { background: var(--ink-900); color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; display:flex; align-items:center; gap: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.25); border: 1px solid var(--ink-line); animation: toastIn .25s forwards; }
        .toast svg { width: 16px; height: 16px; color: var(--signal); flex-shrink: 0; }
        @keyframes toastIn { from { transform: translateY(10px); opacity:0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* SVG ICONS DEFS */}
      <svg style={{ display: 'none' }}>
        <symbol id="ic-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></symbol>
        <symbol id="ic-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>
        <symbol id="ic-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>
        <symbol id="ic-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></symbol>
        <symbol id="ic-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></symbol>
        <symbol id="ic-server" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><line x1="6" y1="7" x2="6.01" y2="7"/><line x1="6" y1="17" x2="6.01" y2="17"/></symbol>
        <symbol id="ic-seed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 8-9 0 5 4 6 4 10a5 5 0 0 1-5 6z"/><path d="M12 20v-8"/></symbol>
        <symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></symbol>
      </svg>

      {/* HEADER SECTION */}
      <div className="page-head">
        <div>
          <h1>Kho tài nguyên</h1>
          <p>Quản lý tập trung domain, VPS và tài khoản seeding Facebook · LinkedIn · Gmail phục vụ SEO & marketing.</p>
        </div>
      </div>

      {/* RESOURCE CHAIN */}
      <div className="chain">
        <div className="chain-top">
          <span className="chain-label">Chuỗi vận hành tài nguyên · toàn nhóm</span>
          <span className="chain-updated"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><use href="#ic-clock"/></svg> CẬP NHẬT 2 PHÚT TRƯỚC</span>
        </div>
        <div className="chain-row">
          <div className={`chain-node ${activeTab === 'domain' ? 'is-active' : ''}`} data-node="domain" onClick={() => setActiveTab('domain')}>
            <div className="chain-node-head"><span className="chain-dot"></span><span className="chain-node-title">Domain & Website</span></div>
            <div className="chain-node-num">{String(domains.length).padStart(2, '0')}</div>
            <div className="chain-node-sub">đang trỏ backlink SEO</div>
          </div>
          <div className="chain-arrow"><svg><use href="#ic-arrow"/></svg></div>
          <div className={`chain-node ${activeTab === 'vps' ? 'is-active' : ''}`} data-node="vps" onClick={() => setActiveTab('vps')}>
            <div className="chain-node-head"><span className="chain-dot"></span><span className="chain-node-title">VPS & Server</span></div>
            <div className="chain-node-num">{String(vpsList.length).padStart(2, '0')}</div>
            <div className="chain-node-sub">host seeding & crawl</div>
          </div>
          <div className="chain-arrow"><svg><use href="#ic-arrow"/></svg></div>
          <div className={`chain-node ${activeTab === 'seeding' ? 'is-active' : ''}`} data-node="seeding" onClick={() => setActiveTab('seeding')}>
            <div className="chain-node-head"><span className="chain-dot"></span><span className="chain-node-title">Tài khoản seeding</span></div>
            <div className="chain-node-num">{String(seedingList.length).padStart(2, '0')}</div>
            <div className="chain-node-sub">FB · LinkedIn · Gmail</div>
          </div>
        </div>
        <div className="chain-footer">
          <div className="chain-mini"><span className="dot online"></span>Đang online <b>26</b> / {seedingList.length} tài khoản</div>
          <div className="chain-mini"><span className="dot alert"></span>Cần chú ý <b>03</b> tài nguyên (checkpoint, sắp hết hạn, tải cao)</div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="tab-bar">
        <div className={`tab ${activeTab === 'domain' ? 'active' : ''}`} onClick={() => setActiveTab('domain')}>
          <svg><use href="#ic-globe"/></svg>Domain & Website <span className="tab-count">{String(domains.length).padStart(2, '0')}</span>
        </div>
        <div className={`tab ${activeTab === 'vps' ? 'active' : ''}`} onClick={() => setActiveTab('vps')}>
          <svg><use href="#ic-server"/></svg>VPS <span className="tab-count">{String(vpsList.length).padStart(2, '0')}</span>
        </div>
        <div className={`tab ${activeTab === 'seeding' ? 'active' : ''}`} onClick={() => setActiveTab('seeding')}>
          <svg><use href="#ic-seed"/></svg>Tài khoản seeding <span className="tab-count">{String(seedingList.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* ═══ PANEL: DOMAIN ═══ */}
      <div className={`panel ${activeTab === 'domain' ? 'active' : ''}`}>
        <div className="section-header">
          <div>
            <div className="section-title">Domain & Website</div>
            <div className="section-sub">Quản lý các domain khách hàng và của mình để đi backlink SEO</div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <svg><use href="#ic-search"/></svg>
              <input type="text" placeholder="Tìm domain..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => setActiveDrawer('add-domain')}><svg><use href="#ic-plus"/></svg>Thêm domain</button>
          </div>
        </div>

        <div className="pill-tabs">
          <div className={`pill ${domainFilter === 'all' ? 'active' : ''}`} onClick={() => setDomainFilter('all')}>TẤT CẢ ({domains.length})</div>
          <div className={`pill ${domainFilter === 'own' ? 'active' : ''}`} onClick={() => setDomainFilter('own')}>CỦA MÌNH ({domains.filter(d => d.type === 'own').length})</div>
          <div className={`pill ${domainFilter === 'client' ? 'active' : ''}`} onClick={() => setDomainFilter('client')}>KHÁCH HÀNG ({domains.filter(d => d.type === 'client').length})</div>
        </div>

        <div className="data-table" style={{ '--cols': '2fr 1.1fr .6fr 1.2fr 1fr .9fr' } as React.CSSProperties}>
          <div className="dt-head"><span>Domain</span><span>Loại</span><span>DA</span><span>Trạng thái</span><span>Hết hạn</span><span></span></div>
          <div>
            {filteredDomains.map((item) => (
              <div key={item.id} className="dt-row">
                <span className="dt-domain"><svg><use href="#ic-globe"/></svg>{item.name}</span>
                <span>
                  {item.type === 'own' ? <span className="tag blue">Của mình</span> : <span className="tag purple">Khách hàng</span>}
                </span>
                <span className="dt-mono">{item.da}</span>
                <span>
                  {item.status === 'active' && <span className="tag green">● Hoạt động</span>}
                  {item.status === 'expiring' && <span className="tag yellow">▲ Sắp hết hạn</span>}
                  {item.status === 'expired' && <span className="tag red">● Hết hạn</span>}
                </span>
                <span className="dt-mono">{item.expireDate}</span>
                <span>
                  <button className="btn-sm outline" onClick={() => openDetail(item.name, [
                    ['Loại', item.type === 'own' ? 'Của mình' : 'Khách hàng'],
                    ['Chỉ số DA', String(item.da)],
                    ['Trạng thái', item.status],
                    ['Hết hạn', item.expireDate],
                    ['Backlink', `${item.backlinks || 0} liên kết`],
                    ['Nhà đăng ký', item.registrar || 'N/A']
                  ])}>Chi tiết</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PANEL: VPS ═══ */}
      <div className={`panel ${activeTab === 'vps' ? 'active' : ''}`}>
        <div className="section-header">
          <div>
            <div className="section-title">VPS & Server</div>
            <div className="section-sub">Quản lý VPS dùng cho seeding và chạy SEO tự động</div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <svg><use href="#ic-search"/></svg>
              <input type="text" placeholder="Tìm VPS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => setActiveDrawer('add-vps')}><svg><use href="#ic-plus"/></svg>Thêm VPS</button>
          </div>
        </div>

        <div className="card-grid">
          {filteredVps.map((vps) => {
            const initials = vps.name.split('-').slice(-2).join('').slice(0, 2).toUpperCase() || 'VP';
            const cpuDash = (vps.cpu / 100) * 75.4;
            const ramDash = (vps.ram / 100) * 75.4;

            return (
              <div key={vps.id} className="res-card">
                <div className="card-top">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="card-avatar vps">{initials}</div>
                    <div>
                      <div className="card-name">{vps.name}</div>
                      <div className="card-meta">{vps.provider} · {vps.region} · {vps.spec}</div>
                    </div>
                  </div>
                  <div className={`status-dot ${vps.status}`}></div>
                </div>
                <div className="card-tags">
                  {vps.status === 'online' && <span className="tag green">● Online</span>}
                  {vps.status === 'warning' && <span className="tag yellow">▲ Tải cao</span>}
                  <span className="tag blue">{vps.purpose}</span>
                </div>
                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-label">CPU</span>
                    <div className="gauge">
                      <div className="gauge-ring">
                        <svg width="30" height="30" viewBox="0 0 30 30">
                          <circle className="bg" cx="15" cy="15" r="12"/>
                          <circle className="fg" cx="15" cy="15" r="12" stroke={vps.cpu > 80 ? 'var(--rose)' : 'var(--sky)'} strokeDasharray={`${cpuDash} ${75.4 - cpuDash}`}/>
                        </svg>
                        <span className="gauge-num">{vps.cpu}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">RAM</span>
                    <div className="gauge">
                      <div className="gauge-ring">
                        <svg width="30" height="30" viewBox="0 0 30 30">
                          <circle className="bg" cx="15" cy="15" r="12"/>
                          <circle className="fg" cx="15" cy="15" r="12" stroke={vps.ram > 80 ? 'var(--rose)' : 'var(--indigo)'} strokeDasharray={`${ramDash} ${75.4 - ramDash}`}/>
                        </svg>
                        <span className="gauge-num">{vps.ram}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Uptime</span>
                    <span className="stat-value">{vps.uptime}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm outline" onClick={() => openDetail(vps.name, [
                    ['Cấu hình', `${vps.provider} · ${vps.region} · ${vps.spec}`],
                    ['Mục đích', vps.purpose],
                    ['IP', vps.ip || 'N/A'],
                    ['OS', vps.os || 'N/A']
                  ])}>Quản lý</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ PANEL: SEEDING ═══ */}
      <div className={`panel ${activeTab === 'seeding' ? 'active' : ''}`}>
        <div className="section-header">
          <div>
            <div className="section-title">Tài khoản seeding</div>
            <div className="section-sub">Quản lý tài khoản Facebook, LinkedIn, Gmail — thời gian online & trạng thái</div>
          </div>
          <div className="header-right">
            <div className="search-box">
              <svg><use href="#ic-search"/></svg>
              <input type="text" placeholder="Tìm tài khoản..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => setActiveDrawer('add-seeding')}><svg><use href="#ic-plus"/></svg>Thêm tài khoản</button>
          </div>
        </div>

        <div className="pill-tabs">
          <div className={`pill ${seedingFilter === 'all' ? 'active' : ''}`} onClick={() => setSeedingFilter('all')}>TẤT CẢ ({seedingList.length})</div>
          <div className={`pill ${seedingFilter === 'facebook' ? 'active' : ''}`} onClick={() => setSeedingFilter('facebook')}>FACEBOOK ({seedingList.filter(s => s.platform === 'facebook').length})</div>
          <div className={`pill ${seedingFilter === 'linkedin' ? 'active' : ''}`} onClick={() => setSeedingFilter('linkedin')}>LINKEDIN ({seedingList.filter(s => s.platform === 'linkedin').length})</div>
          <div className={`pill ${seedingFilter === 'gmail' ? 'active' : ''}`} onClick={() => setSeedingFilter('gmail')}>GMAIL ({seedingList.filter(s => s.platform === 'gmail').length})</div>
          <div className={`pill ${seedingFilter === 'unassigned' ? 'active' : ''}`} onClick={() => setSeedingFilter('unassigned')}>CHƯA GÁN ({seedingList.filter(s => !s.vps || s.vps === 'Chưa gán').length})</div>
        </div>

        <div className="card-grid">
          {filteredSeeding.map((item) => {
            const avatarCls = item.platform === 'facebook' ? 'fb' : item.platform === 'linkedin' ? 'li' : 'gm';
            const initials = item.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'NA';
            const platformTag = item.platform === 'facebook' ? 'Facebook' : item.platform === 'linkedin' ? 'LinkedIn' : 'Gmail';

            return (
              <div key={item.id} className="res-card">
                <div className="card-top">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={`card-avatar ${avatarCls}`}>{initials}</div>
                    <div>
                      <div className="card-name">{item.name}</div>
                      <div className="card-meta">{item.username} · {item.vps}</div>
                    </div>
                  </div>
                  <div className={`status-dot ${item.status}`}></div>
                </div>
                <div className="card-tags">
                  {item.status === 'online' && <span className="tag green">● Online</span>}
                  {item.status === 'offline' && <span className="tag red">● Offline</span>}
                  {item.status === 'warning' && <span className="tag yellow">▲ Cần xử lý</span>}
                  <span className="tag blue">{platformTag}</span>
                  {item.tagExtra && <span className="tag">{item.tagExtra}</span>}
                </div>
                <div className="card-stats">
                  <div className="stat-item"><span className="stat-label">Online</span><span className="stat-value">{item.onlineTime}</span></div>
                  <div className="stat-item"><span className="stat-label">{item.statLabel}</span><span className="stat-value">{item.statValue}</span></div>
                  <div className="stat-item"><span className="stat-label">Tuổi acc</span><span className="stat-value">{item.age}</span></div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm outline" onClick={() => openDetail(item.name, [
                    ['Username', item.username],
                    ['Nền tảng', platformTag],
                    ['VPS Gán', item.vps],
                    ['Online', item.onlineTime],
                    [item.statLabel, item.statValue],
                    ['Tuổi tài khoản', item.age]
                  ])}>Chi tiết</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OVERLAY */}
      <div className={`overlay ${activeDrawer ? 'show' : ''}`} onClick={() => setActiveDrawer(null)}></div>

      {/* DRAWERS */}
      <div className={`drawer ${activeDrawer === 'add-domain' ? 'show' : ''}`}>
        <div className="drawer-head"><h3>Thêm domain mới</h3><button className="drawer-close" onClick={() => setActiveDrawer(null)}>✕</button></div>
        <form id="form-domain" className="drawer-body" onSubmit={handleAddDomain}>
          <div className="field"><label>Tên domain</label><input type="text" name="name" placeholder="vd: newsite.vn" required /></div>
          <div className="field-row">
            <div className="field"><label>Loại</label>
              <select name="type"><option value="own">Của mình</option><option value="client">Khách hàng</option></select>
            </div>
            <div className="field"><label>Chỉ số DA</label><input type="number" name="da" defaultValue="30" /></div>
          </div>
          <div className="field"><label>Ngày hết hạn</label><input type="month" name="exp" defaultValue="2027-01" /></div>
        </form>
        <div className="drawer-foot">
          <button type="button" className="btn-outline-full" onClick={() => setActiveDrawer(null)}>Hủy</button>
          <button type="submit" form="form-domain" className="btn-primary-full">Lưu domain</button>
        </div>
      </div>

      <div className={`drawer ${activeDrawer === 'add-vps' ? 'show' : ''}`}>
        <div className="drawer-head"><h3>Thêm VPS mới</h3><button className="drawer-close" onClick={() => setActiveDrawer(null)}>✕</button></div>
        <form id="form-vps" className="drawer-body" onSubmit={handleAddVps}>
          <div className="field"><label>Tên VPS</label><input type="text" name="name" placeholder="vd: VPS-SEO-04" required /></div>
          <div className="field-row">
            <div className="field"><label>Nhà cung cấp</label><input type="text" name="provider" defaultValue="Vultr" /></div>
            <div className="field"><label>Khu vực</label><input type="text" name="region" defaultValue="Singapore" /></div>
          </div>
          <div className="field"><label>Mục đích</label>
            <select name="purpose"><option>Seeding FB</option><option>Seeding LinkedIn</option><option>Seeding Gmail</option></select>
          </div>
        </form>
        <div className="drawer-foot">
          <button type="button" className="btn-outline-full" onClick={() => setActiveDrawer(null)}>Hủy</button>
          <button type="submit" form="form-vps" className="btn-primary-full">Lưu VPS</button>
        </div>
      </div>

      <div className={`drawer ${activeDrawer === 'add-seeding' ? 'show' : ''}`}>
        <div className="drawer-head"><h3>Thêm tài khoản seeding</h3><button className="drawer-close" onClick={() => setActiveDrawer(null)}>✕</button></div>
        <form id="form-seeding" className="drawer-body" onSubmit={handleAddSeeding}>
          <div className="field"><label>Tên tài khoản</label><input type="text" name="name" placeholder="vd: Nguyễn Văn E" required /></div>
          <div className="field-row">
            <div className="field"><label>Nền tảng</label>
              <select name="platform"><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="gmail">Gmail</option></select>
            </div>
            <div className="field"><label>Username</label><input type="text" name="username" /></div>
          </div>
        </form>
        <div className="drawer-foot">
          <button type="button" className="btn-outline-full" onClick={() => setActiveDrawer(null)}>Hủy</button>
          <button type="submit" form="form-seeding" className="btn-primary-full">Lưu tài khoản</button>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <div className={`drawer ${activeDrawer === 'detail' ? 'show' : ''}`}>
        <div className="drawer-head"><h3>{detailModal?.title || 'Chi tiết'}</h3><button className="drawer-close" onClick={() => setActiveDrawer(null)}>✕</button></div>
        <div className="drawer-body">
          {detailModal?.rows.map(([key, val], idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-600)' }}>{key}</span>
              <span style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>
        <div className="drawer-foot">
          <button type="button" className="btn-outline-full" onClick={() => setActiveDrawer(null)}>Đóng</button>
        </div>
      </div>

      {/* TOASTS */}
      <div className="toast-wrap">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <svg><use href="#ic-check"/></svg>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}