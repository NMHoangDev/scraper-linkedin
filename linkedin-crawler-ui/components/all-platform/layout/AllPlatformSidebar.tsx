"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { MaterialIcon, type MaterialSymbolName } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";

export interface NavLeafItem {
  type: "item";
  id: string;
  href: string;
  icon: MaterialSymbolName;
  label: string;
  matchStartsWith?: string[];
  badge?: number;
}

export interface NavGroupItem {
  type: "group";
  id: string;
  icon: MaterialSymbolName;
  label: string;
  items: NavLeafItem[];
}

export type SidebarEntry = NavLeafItem | NavGroupItem;

const navBaseClass =
  "group relative flex min-h-[36px] items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-1.5 text-sm font-medium leading-relaxed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-markee-primary)]/40";
const navActiveClass = "rounded-md bg-[var(--color-markee-primary)]/10 text-[var(--color-markee-primary)] font-semibold";
const navActiveIndentedClass = "-ml-3 rounded-none border-l-2 border-[var(--color-markee-primary)] pl-5 text-[var(--color-markee-primary)] font-semibold";
const navIdleClass = "text-on-surface hover:bg-surface-container-low";
const iconClass = "shrink-0 text-[18px] transition-transform duration-200 group-hover:scale-105";

// So khop theo TUNG DOAN duong dan (path segment), khong phai chuoi con tho -
// tranh truong hop "/all-platform/tai-khoan" (Zalo) tinh nham la tien to cua
// "/all-platform/tai-khoan-fb" (Facebook) roi ca 2 cung sang active.
function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true;
  return pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);
}

export function isLeafActive(pathname: string, item: NavLeafItem) {
  if (pathname === item.href) return true;
  if (item.matchStartsWith?.some((prefix) => pathMatchesPrefix(pathname, prefix))) return true;
  return pathMatchesPrefix(pathname, item.href) && item.href !== "/all-platform/post-feed";
}

export function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() || "U";
}

export function buildEntries(isAdmin: boolean, isLeader: boolean, workspaceTab: "personal" | "team"): SidebarEntry[] {
  const dashboardHref = isAdmin
    ? "/all-platform/admin/dashboard"
    : isLeader
      ? "/all-platform/leader/dashboard"
      : "/all-platform/post-feed";
  const teamHref = isAdmin
    ? "/all-platform/admin/teams-management"
    : "/all-platform/leader/team";

  const managementItems: NavLeafItem[] = [
    {
      type: "item",
      id: "teams",
      href: teamHref,
      icon: "groups",
      label: "Teams",
      matchStartsWith: [teamHref],
    },
    {
      type: "item",
      id: "accounts",
      href: "/all-platform/quan-ly-tai-khoan",
      icon: "manage_accounts",
      label: "Tài khoản seeding",
      matchStartsWith: ["/all-platform/quan-ly-tai-khoan"],
    },
    {
      type: "item",
      id: "groups",
      href: "/all-platform/quan-ly-nhom",
      icon: "folder",
      label: "Kho nhóm",
      matchStartsWith: ["/all-platform/quan-ly-nhom"],
    },
    {
      type: "item",
      id: "categories",
      href: "/all-platform/quan-ly-danh-muc",
      icon: "category",
      label: "Danh mục",
      matchStartsWith: ["/all-platform/quan-ly-danh-muc"],
    },
  ];

  const contentItems: NavLeafItem[] = [
    {
      type: "item",
      id: "post-feed",
      href: "/all-platform/post-feed",
      icon: "radar",
      label: "Post feed",
      matchStartsWith: ["/all-platform/post-feed"],
    },
  ];

  const channelItems: NavLeafItem[] = [
    {
      type: "item",
      id: "inbox",
      href: "/all-platform/inbox",
      icon: "inbox",
      label: "Inbox FB",
      matchStartsWith: ["/all-platform/inbox"],
      badge: 5,
    },
    {
      type: "item",
      id: "zalo-crawl",
      href: "/all-platform/zalo-crawl",
      icon: "chat",
      label: "Chat Zalo",
      matchStartsWith: ["/all-platform/zalo-crawl"],
    },
    {
      type: "item",
      id: "zalo-accounts",
      href: "/all-platform/tai-khoan",
      icon: "manage_accounts",
      label: "Tài khoản Zalo",
      matchStartsWith: ["/all-platform/tai-khoan"],
    },
    {
      type: "item",
      id: "crm",
      href: "/all-platform/crm",
      icon: "group",
      label: "CRM",
      matchStartsWith: ["/all-platform/crm"],
    },
    {
      type: "item",
      id: "quotes",
      href: "/all-platform/quotes",
      icon: "request_quote",
      label: "Mẫu báo giá",
      matchStartsWith: ["/all-platform/quotes"],
    },
  ];

  // Inbox Zalo Admin (/all-platform/zalo-inbox): xem hoi thoai Zalo cua TOAN
  // BO nhan su + duyet KPI - dung phong voi "Teams"/"quan ly" nen chi hien o
  // tab Nhom, khong hien o tab Ca nhan (giong dung tinh than comment o duoi:
  // "Nhom: full bo cong cu quan ly"). Truoc day file nay khong co entry nao
  // tro toi trang do ca - nguoi dung chi vao duoc qua link truc tiep.
  const channelItemsTeam: NavLeafItem[] = [
    ...channelItems,
    {
      type: "item",
      id: "zalo-inbox-admin",
      href: "/all-platform/zalo-inbox",
      icon: "verified_user",
      label: "Inbox Zalo Admin",
      matchStartsWith: ["/all-platform/zalo-inbox"],
    },
  ];

  const resourceItems: NavLeafItem[] = [
    {
      type: "item",
      id: "vps",
      href: "/all-platform/quan-ly-vps",
      icon: "database",
      label: "Quản lý VPS",
      matchStartsWith: ["/all-platform/quan-ly-vps"],
    },
    {
      type: "item",
      id: "vps-monitor",
      href: "/all-platform/vps-vnc-ssh-rdp",
      icon: "monitoring",
      label: "Giám sát VPS",
      matchStartsWith: ["/all-platform/vps-vnc-ssh-rdp"],
    },
  ];

  const homeEntry: SidebarEntry = {
    type: "item",
    id: "home",
    href: dashboardHref,
    icon: "dashboard",
    label: "Trang chủ",
    matchStartsWith: [dashboardHref],
  };
  const contentGroup: SidebarEntry = {
    type: "group",
    id: "content",
    icon: "article",
    label: "Sản xuất nội dung",
    items: contentItems,
  };
  const channelGroup: SidebarEntry = {
    type: "group",
    id: "channel",
    icon: "support_agent",
    label: "Quản lý kênh & CSKH",
    items: channelItems,
  };
  const channelGroupTeam: SidebarEntry = {
    type: "group",
    id: "channel",
    icon: "support_agent",
    label: "Quản lý kênh & CSKH",
    items: channelItemsTeam,
  };

  // Ca nhan: chi viec hang ngay cua tung nguoi (dang bai, inbox, acc FB cua minh).
  // Nhom: full bo cong cu quan ly - Teams, thu vien nhom, KPI acc seeding, ha tang VPS.
  if (workspaceTab === "personal") {
    return [
      homeEntry,
      contentGroup,
      channelGroup,
      {
        type: "item",
        id: "fb-accounts-personal",
        href: "/all-platform/quan-ly-tai-khoan",
        icon: "account_circle",
        label: "Tài khoản FB",
        matchStartsWith: ["/all-platform/quan-ly-tai-khoan"],
      },
      {
        type: "item",
        id: "settings",
        href: "/all-platform/profile",
        icon: "settings",
        label: "Cài đặt kết nối",
        matchStartsWith: ["/all-platform/profile"],
      },
    ];
  }

  return [
    homeEntry,
    {
      type: "group",
      id: "management",
      icon: "groups",
      label: "Quản lý",
      items: managementItems,
    },
    contentGroup,
    channelGroupTeam,
    {
      type: "group",
      id: "resources",
      icon: "database",
      label: "Quản lý tài nguyên",
      items: resourceItems,
    },
    {
      type: "item",
      id: "settings",
      href: "/all-platform/profile",
      icon: "settings",
      label: "Cài đặt kết nối",
      matchStartsWith: ["/all-platform/profile"],
    },
  ];
}

// Tra ten trang hien tai tu pathname, dung chung 1 nguon du lieu voi menu (entries) -
// tranh phai duy tri rieng 1 bang ten trang khac de rendera thanh tieu de o dau khung noi dung.
export function findCurrentPageLabel(entries: SidebarEntry[], pathname: string): string | undefined {
  for (const entry of entries) {
    if (entry.type === "item") {
      if (isLeafActive(pathname, entry)) return entry.label;
    } else {
      const child = entry.items.find((item) => isLeafActive(pathname, item));
      if (child) return child.label;
    }
  }
  return undefined;
}

function SidebarLink({
  item,
  active,
  collapsed,
  indented,
  onNavigate,
}: {
  item: NavLeafItem;
  active: boolean;
  collapsed?: boolean;
  indented?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        navBaseClass,
        active ? (indented ? navActiveIndentedClass : navActiveClass) : navIdleClass,
        collapsed && "justify-center px-2",
      )}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <MaterialIcon name={item.icon} className={cn(iconClass, active && "text-[var(--color-markee-primary)]")} />
      {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
      {!collapsed && item.badge !== undefined ? (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-[var(--color-markee-primary)]/15 text-[var(--color-markee-primary)]" : "bg-primary/10 text-[var(--color-markee-primary)]",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarGroup({
  entry,
  pathname,
  collapsed,
  onNavigate,
  homeHref,
}: {
  entry: NavGroupItem;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  homeHref?: string;
}) {
  const hasActiveChild = entry.items.some((item) => item.href !== homeHref && isLeafActive(pathname, item));
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  if (collapsed) {
    return (
      <SidebarLink
        item={{
          type: "item",
          id: entry.id,
          href: entry.items[0]?.href || "/all-platform/post-feed",
          icon: entry.icon,
          label: entry.label,
        }}
        active={hasActiveChild}
        collapsed
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          navBaseClass,
          "w-full justify-between",
          hasActiveChild ? "bg-[var(--color-markee-primary)]/10 text-[var(--color-markee-primary)] font-semibold" : navIdleClass,
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <MaterialIcon name={entry.icon} className={iconClass} />
          <span className="truncate">{entry.label}</span>
        </span>
        <MaterialIcon
          name="chevron_right"
          className={cn("shrink-0 text-[18px] transition-transform", isOpen && "rotate-90")}
        />
      </button>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="ml-5 min-h-0 space-y-1 border-l border-outline-variant pl-3">
          {entry.items.map((item) => (
            <SidebarLink
              key={item.id}
              item={item}
              active={isLeafActive(pathname, item)}
              indented
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="flex items-center justify-between px-2 pt-2">
      <h3 className="text-sm font-semibold tracking-wider text-on-surface-variant">{children}</h3>
    </div>
  );
}

export function AllPlatformSidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onCollapsedChange,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (next: boolean) => void;
}) {
  const { user, logout } = useAppAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [workspaceTab, setWorkspaceTab] = useState<"personal" | "team">("personal");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isAdmin = user?.role === "admin";
  const isLeader = user?.role === "leader";
  const entries = useMemo(() => buildEntries(isAdmin, isLeader, workspaceTab), [isAdmin, isLeader, workspaceTab]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden" onClick={onClose} />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-outline-variant bg-[#fafafa] text-on-surface shadow-xl transition-all duration-300 lg:translate-x-0 lg:shadow-none",
          isCollapsed ? "w-[70px]" : "w-[280px]",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {isOpen ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-low hover:text-[var(--color-markee-primary)] lg:hidden"
            aria-label="Đóng menu"
          >
            <MaterialIcon name="close" />
          </button>
        ) : null}

        <div className="border-b border-outline-variant px-2 py-2">
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between gap-2")}>
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => onCollapsedChange?.(!isCollapsed)}
                className="group/logo relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl outline-none md:flex focus-visible:ring-2 focus-visible:ring-[var(--color-markee-primary)]/40"
                aria-label="Mở rộng sidebar"
                title="Mở rộng"
              >
                <Image
                  src="/markeeai_logo.svg"
                  alt="Marketing Agents"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl object-contain transition-opacity duration-200 group-hover/logo:opacity-0"
                  priority
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface-container-low opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100">
                  <MaterialIcon name="chevron_right" className="text-[20px] text-[var(--color-markee-primary)]" />
                </span>
              </button>
            ) : null}
            {isCollapsed ? (
              <Link
                href="/all-platform/post-feed"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:hidden"
              >
                <Image src="/markeeai_logo.svg" alt="Marketing Agents" width={40} height={40} className="h-10 w-10 rounded-xl object-contain" priority />
              </Link>
            ) : (
              <Link
                href="/all-platform/post-feed"
                onClick={onClose}
                className="flex min-w-0 items-center gap-3 rounded-lg p-1 transition hover:bg-surface-container-low active:scale-[0.98]"
              >
                <Image
                  src="/markeeai_logo.svg"
                  alt="Marketing Agents"
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-xl object-contain"
                  priority
                />
                <span className="text-left text-lg font-semibold leading-5 tracking-tight text-[var(--color-markee-primary)]">
                  Marketing
                  <br />
                  Agents
                </span>
              </Link>
            )}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => onCollapsedChange?.(!isCollapsed)}
                className="hidden shrink-0 rounded-lg p-1.5 text-on-surface-variant outline-none transition hover:bg-surface-container-low hover:text-[var(--color-markee-primary)] md:flex focus-visible:ring-2 focus-visible:ring-[var(--color-markee-primary)]/40"
                aria-label="Thu gọn sidebar"
                title="Thu gọn"
              >
                <MaterialIcon name="chevron_left" className="text-[20px]" />
              </button>
            ) : null}
          </div>
        </div>

        {!isCollapsed ? (
          <div className="px-3 py-2">
            <div className="flex items-center gap-1 rounded-full bg-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setWorkspaceTab("personal")}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  workspaceTab === "personal"
                    ? "bg-[var(--color-markee-primary)] text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Cá nhân
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab("team")}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  workspaceTab === "team"
                    ? "bg-[var(--color-markee-primary)] text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Nhóm
              </button>
            </div>
          </div>
        ) : null}

        <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-2 pb-2">
          <SectionLabel collapsed={isCollapsed}>Tác vụ của tôi</SectionLabel>
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li key={entry.id}>
                {entry.type === "group" ? (
                  <SidebarGroup
                    entry={entry}
                    pathname={pathname}
                    collapsed={isCollapsed}
                    onNavigate={onClose}
                    homeHref={entries[0]?.type === "item" ? entries[0].href : undefined}
                  />
                ) : (
                  <SidebarLink
                    item={entry}
                    active={isLeafActive(pathname, entry)}
                    collapsed={isCollapsed}
                    onNavigate={onClose}
                  />
                )}
              </li>
            ))}
          </ul>

        </nav>

        <div className={cn("relative mt-auto px-2 py-3", isCollapsed && "px-1")}>
          {showProfileMenu ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div
                className={cn(
                  "absolute z-50 w-60 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-lg",
                  isCollapsed ? "bottom-0 left-full ml-2" : "bottom-full left-2 right-2 mb-2",
                )}
              >
                <Link
                  href="/all-platform/profile"
                  onClick={() => { setShowProfileMenu(false); onClose?.(); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-on-surface transition hover:bg-surface-container-low"
                >
                  <MaterialIcon name="settings" className="text-[18px]" />
                  Cài đặt tài khoản
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2.5 border-t border-outline-variant px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  <MaterialIcon name="logout" className="text-[18px]" />
                  Đăng xuất
                </button>
              </div>
            </>
          ) : null}

          <div
            className={cn(
              "flex items-center rounded-lg p-2 transition hover:bg-surface-container-low",
              isCollapsed ? "justify-center" : "gap-2.5",
            )}
          >
            <button
              type="button"
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--color-markee-primary)]/40 rounded-lg"
              title={isCollapsed ? user?.name || user?.email || "Người dùng" : undefined}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-[var(--color-markee-primary)]">
                {getInitials(user?.name || user?.email)}
              </span>
              {!isCollapsed ? (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-on-surface">
                    {user?.name || "Người dùng"}
                  </span>
                  <span className="block truncate text-xs text-on-surface-variant">
                    {user?.email || "Chưa đăng nhập"}
                  </span>
                </span>
              ) : null}
            </button>
            {!isCollapsed ? (
              <button
                type="button"
                title="Thông báo (sắp có)"
                className="relative rounded-lg p-1.5 text-on-surface-variant outline-none transition hover:bg-white hover:text-[var(--color-markee-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-markee-primary)]/40"
              >
                <MaterialIcon name="notifications" className="text-[18px]" />
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
