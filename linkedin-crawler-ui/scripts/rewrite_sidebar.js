const fs = require('fs');
const path = 'c:/Code/scraper-linkedin/linkedin-crawler-ui/components/all-platform/layout/AllPlatformSidebar.tsx';

const content = `"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { MaterialIcon, type MaterialSymbolName } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";

interface NavLeafItem {
  type: "item";
  href: string;
  icon: MaterialSymbolName;
  label: string;
  matchStartsWith?: string[];
  badge?: number;
}

interface NavGroupItem {
  type: "group";
  id: string;
  icon: MaterialSymbolName;
  label: string;
  items: NavLeafItem[];
}

type SidebarEntry = NavLeafItem | NavGroupItem;

const itemBaseClass =
  "mx-2 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 capitalize";
const itemActiveClass = "bg-[#DC2626] text-white font-medium shadow-sm";
const itemIdleClass = "text-slate-600 hover:bg-slate-50 font-medium";
const iconBaseClass = "shrink-0 text-[18px] font-light"; // Thin stroke

const profileItem: NavLeafItem = {
  type: "item",
  href: "/all-platform/profile",
  icon: "person",
  label: "Trang cá nhân",
};

const systemEntries: SidebarEntry[] = [
  {
    type: "item",
    href: "/all-platform/admin/dashboard",
    icon: "dashboard",
    label: "Dashboard",
  },
  {
    type: "item",
    href: "/all-platform/admin/teams-management",
    icon: "groups",
    label: "Quản lý teams",
  },
  {
    type: "group",
    id: "resources",
    icon: "database",
    label: "Quản lý tài nguyên",
    items: [
      {
        type: "item",
        href: "/all-platform/quan-ly-vps",
        icon: "database",
        label: "Quản lý VPS",
      },
      {
        type: "item",
        href: "/all-platform/vps-vnc-ssh-rdp",
        icon: "monitoring",
        label: "Giám sát VPS",
      },
      {
        type: "item",
        href: "/all-platform/quan-ly-danh-muc",
        icon: "category",
        label: "Quản lý danh mục",
      },
    ],
  },
  {
    type: "group",
    id: "seeding",
    icon: "radar",
    label: "Hệ thống seeding",
    items: [
      {
        type: "item",
        href: "/all-platform/quan-ly-nhom",
        icon: "group",
        label: "Quản lý groups",
      },
      {
        type: "item",
        href: "/all-platform/post-feed",
        icon: "radar",
        label: "Post feed",
      },
      {
        type: "item",
        href: "/all-platform/dang-bai",
        icon: "send",
        label: "Đăng bài FB",
      },
    ],
  },
  {
    type: "group",
    id: "chat-and-accounts",
    icon: "inbox",
    label: "Hội thoại & tài khoản",
    items: [
      {
        type: "item",
        href: "/all-platform/inbox",
        icon: "inbox",
        label: "Inbox FB",
      },
      {
        type: "item",
        href: "/all-platform/quan-ly-tai-khoan",
        icon: "account_circle",
        label: "Tài khoản",
      },
      {
        type: "item",
        href: "/all-platform/tai-khoan",
        icon: "manage_accounts",
        label: "Quản lý TK Zalo",
      },
    ],
  },
];

const personalEntries: SidebarEntry[] = [
  {
    type: "item",
    href: "/all-platform/member/my-tasks",
    icon: "adjust", 
    label: "My Tasks",
    badge: 5,
  },
  {
    type: "item",
    href: "/all-platform/inbox",
    icon: "inbox",
    label: "Inbox",
    badge: 3,
  },
  {
    type: "item",
    href: "/all-platform/member/nop-lead",
    icon: "outbox",
    label: "Nộp Lead",
  },
  {
    type: "item",
    href: "/all-platform/member/activity",
    icon: "hourglass_empty",
    label: "Activity",
  },
  {
    type: "item",
    href: "/all-platform/post-feed",
    icon: "link", 
    label: "Post Feed",
    badge: 87,
  },
  {
    type: "item",
    href: "/all-platform/member/utm",
    icon: "build",
    label: "Tạo UTM Link",
  },
  {
    type: "item",
    href: "/all-platform/member/progress",
    icon: "trending_up",
    label: "My Progress",
  },
];

const leaderEntries: SidebarEntry[] = [
  {
    type: "item",
    href: "/all-platform/leader/team",
    icon: "groups",
    label: "Team của tôi",
  },
  ...systemEntries.filter(e => e.type === "group")
];

const memberEntries: SidebarEntry[] = personalEntries;

function isLeafActive(pathname: string, item: NavLeafItem) {
  if (pathname === item.href) return true;
  if (item.matchStartsWith) {
    return item.matchStartsWith.some((prefix) => pathname.startsWith(prefix));
  }
  if (pathname.startsWith(item.href) && item.href !== "/all-platform/admin/dashboard") {
    return true;
  }
  return false;
}

function SidebarLink({
  item,
  active,
  indented,
  onNavigate,
}: {
  item: NavLeafItem;
  active?: boolean;
  indented?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        itemBaseClass,
        active ? itemActiveClass : itemIdleClass,
        indented && "ml-2"
      )}
      onClick={onNavigate}
    >
      <MaterialIcon
        name={item.icon}
        className={cn(
          iconBaseClass,
          active ? "text-white" : "text-slate-400"
        )}
      />
      <span className="min-w-0 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className="bg-[#DC2626] text-white text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center ml-auto">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarGroup({
  pathname,
  entry,
  onNavigate,
}: {
  pathname: string;
  entry: NavGroupItem;
  onNavigate?: () => void;
}) {
  const hasActiveChild = entry.items.some((item) => isLeafActive(pathname, item));
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) {
      setIsOpen(true);
    }
  }, [hasActiveChild]);

  const highlighted = isOpen || hasActiveChild;

  return (
    <div className="mb-1.5">
      <button
        type="button"
        className={cn(
          itemBaseClass,
          "w-[calc(100%-1rem)] justify-between",
          highlighted ? itemActiveClass : itemIdleClass,
        )}
        onClick={() => setIsOpen((current) => !current)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <MaterialIcon
            name={entry.icon}
            className={cn(
              iconBaseClass,
              highlighted ? "text-white" : "text-slate-400",
            )}
          />
          <span className="truncate">{entry.label}</span>
        </div>

        <MaterialIcon
          name="expand_more"
          className={cn(
            "shrink-0 text-[20px] transition-transform duration-300 font-light",
            highlighted ? "text-white" : "text-slate-400",
            isOpen && "-rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="mt-1">
            <div className="space-y-1 py-1">
              {entry.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={isLeafActive(pathname, item)}
                  indented
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AllPlatformSidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useAppAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<'system' | 'personal'>('system');

  const isAdmin = user?.role === "admin";
  const isLeader = user?.role === "leader";

  const entries = useMemo(() => {
    if (isAdmin) return viewMode === 'system' ? systemEntries : personalEntries;
    if (isLeader) return leaderEntries;
    return memberEntries;
  }, [isAdmin, isLeader, viewMode]);

  const workspaceLabel = isAdmin
    ? "Admin workspace"
    : isLeader
      ? "Leader workspace"
      : "Member workspace";

  const getInitials = (name?: string) => {
    if (!name) return "U";

    const parts = name.trim().split(/\\s+/);
    if (parts.length >= 2) {
      return parts
        .slice(-2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }

    return parts[0] ? parts[0][0].toUpperCase() : "U";
  };

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-white border-r border-slate-100 transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {isOpen ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 lg:hidden"
          >
            <MaterialIcon name="close" />
          </button>
        ) : null}

        <div className="px-4 py-5 mb-2">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white">
              <Image
                src="https://markeeai.com/logo.svg"
                alt="MarkeeAI"
                fill
                sizes="44px"
                className="object-contain p-1.5"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-slate-900">
                MarkeeAi
              </p>
              <p className="mt-0.5 text-[11px] font-semibold tracking-[0.24em] text-slate-400 uppercase">
                {workspaceLabel}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mx-4 mb-4 shrink-0">
            <button
              onClick={() => setViewMode('system')}
              className={cn(
                "flex-1 text-center py-1.5 text-xs transition-all duration-200",
                viewMode === 'system'
                  ? "bg-[#DC2626] text-white shadow-sm rounded-lg font-semibold"
                  : "text-slate-500 font-medium hover:text-slate-700 hover:bg-slate-200/50 rounded-lg"
              )}
            >
              Hệ thống
            </button>
            <button
              onClick={() => setViewMode('personal')}
              className={cn(
                "flex-1 text-center py-1.5 text-xs transition-all duration-200",
                viewMode === 'personal'
                  ? "bg-[#DC2626] text-white shadow-sm rounded-lg font-semibold"
                  : "text-slate-500 font-medium hover:text-slate-700 hover:bg-slate-200/50 rounded-lg"
              )}
            >
              Cá nhân
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1 space-y-1">
          {entries.map((entry) =>
            entry.type === "group" ? (
              <SidebarGroup
                key={entry.id}
                pathname={pathname}
                entry={entry}
                onNavigate={onClose}
              />
            ) : (
              <div key={entry.href} className="mb-1.5">
                <SidebarLink
                  item={entry}
                  active={isLeafActive(pathname, entry)}
                  onNavigate={onClose}
                />
              </div>
            ),
          )}
        </div>

        <div className="mt-auto border-t border-slate-100 px-2 pt-3 pb-4 shrink-0">
          <div className="mb-2">
            <SidebarLink
              item={profileItem}
              active={isLeafActive(pathname, profileItem)}
              onNavigate={onClose}
            />
          </div>

          <div className="mx-2 flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {getInitials(user?.name)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user?.name || "Người dùng"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user?.email || "Chưa đăng nhập"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-[#DC2626]"
              title="Đăng xuất"
            >
              <MaterialIcon name="logout" className="text-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
`;

fs.writeFileSync(path, content, 'utf8');
console.log('Sidebar generated.');
