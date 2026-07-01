"use client";

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
  "mx-2 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all";
const itemActiveClass = "bg-[#DC2626] text-white";
const itemIdleClass = "text-slate-700 hover:bg-slate-50 hover:text-slate-900";
const iconBaseClass = "shrink-0 text-[18px]";

function buildWorkspaceEntries(dashboardHref: string, teamHref: string): SidebarEntry[] {
  return [
    {
      type: "item",
      href: dashboardHref,
      icon: "dashboard",
      label: "Dashboard",
      matchStartsWith: [dashboardHref],
    },
    {
      type: "item",
      href: teamHref,
      icon: "groups",
      label: "Quản lý teams",
      matchStartsWith: [teamHref],
    },
    {
      type: "item",
      href: "/all-platform/post-feed",
      icon: "radar",
      label: "Post feed",
      matchStartsWith: ["/all-platform/post-feed"],
    },
    {
      type: "group",
      id: "seeding",
      icon: "article",
      label: "Hệ thống seeding",
      items: [
        {
          type: "item",
          href: "/all-platform/quan-ly-nhom",
          icon: "folder",
          label: "Quản lý groups",
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
      id: "chat-accounts",
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
          href: "/all-platform/zalo-inbox",
          icon: "chat",
          label: "Zalo Inbox Admin",
          matchStartsWith: ["/all-platform/zalo-inbox"],
        },
        {
          type: "item",
          href: "/all-platform/customers",
          icon: "group",
          label: "Khách hàng",
        },
        {
          type: "item",
          href: "/all-platform/quan-ly-tai-khoan",
          icon: "manage_accounts",
          label: "Quản lý tài khoản",
        },
      ],
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
  ];
}

const adminEntries = buildWorkspaceEntries(
  "/all-platform/admin/dashboard",
  "/all-platform/admin/teams-management",
);
const leaderEntries = buildWorkspaceEntries(
  "/all-platform/leader/dashboard",
  "/all-platform/leader/team",
);

const personalEntries: SidebarEntry[] = [
  {
    type: "item",
    href: "/all-platform/member/my-tasks",
    icon: "assignment",
    label: "Công việc của tôi",
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
    href: "/all-platform/tai-khoan",
    icon: "chat",
    label: "Inbox Zalo",
  },
  {
    type: "item",
    href: "/all-platform/customers",
    icon: "group",
    label: "Khách hàng",
  },
  {
    type: "item",
    href: "/all-platform/member/nop-lead",
    icon: "send",
    label: "Nộp lead",
  },
  {
    type: "item",
    href: "/all-platform/member/activity",
    icon: "history",
    label: "Hoạt động",
  },
  {
    type: "item",
    href: "/all-platform/post-feed",
    icon: "radar",
    label: "Post feed",
  },
  {
    type: "item",
    href: "/all-platform/member/utm",
    icon: "link",
    label: "Tạo UTM link",
  },
  {
    type: "item",
    href: "/all-platform/member/progress",
    icon: "trending_up",
    label: "Tiến độ của tôi",
  },
];

const memberEntries: SidebarEntry[] = [
  {
    type: "item",
    href: "/all-platform/post-feed",
    icon: "radar",
    label: "Post feed",
  },
  {
    type: "item",
    href: "/all-platform/quan-ly-nhom",
    icon: "folder",
    label: "Quản lý groups",
  },
  {
    type: "item",
    href: "/all-platform/dang-bai",
    icon: "send",
    label: "Đăng bài FB",
  },
  {
    type: "item",
    href: "/all-platform/inbox",
    icon: "inbox",
    label: "Inbox FB",
  },
  {
    type: "item",
    href: "/all-platform/tai-khoan",
    icon: "chat",
    label: "Inbox Zalo",
  },
  {
    type: "item",
    href: "/all-platform/customers",
    icon: "group",
    label: "Khách hàng",
  },
  {
    type: "item",
    href: "/all-platform/quan-ly-tai-khoan",
    icon: "manage_accounts",
    label: "Quản lý tài khoản",
  },
  {
    type: "item",
    href: "/all-platform/quan-ly-danh-muc",
    icon: "category",
    label: "Quản lý danh mục",
  },
];

function isLeafActive(pathname: string, item: NavLeafItem) {
  if (pathname === item.href) return true;
  if (item.matchStartsWith?.some((prefix) => pathname.startsWith(prefix))) return true;
  return pathname.startsWith(item.href) && item.href !== "/all-platform/post-feed";
}

function SidebarLink({
  item,
  active,
  indented = false,
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
      className={cn(itemBaseClass, active ? itemActiveClass : itemIdleClass, indented && "pl-10")}
      onClick={onNavigate}
    >
      <MaterialIcon
        name={item.icon}
        className={cn(iconBaseClass, active ? "text-white" : "text-slate-500")}
      />
      <span className="min-w-0 truncate leading-5">{item.label}</span>
      {item.badge !== undefined ? (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-white/20 text-white" : "bg-[#DC2626] text-white",
          )}
        >
          {item.badge}
        </span>
      ) : null}
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
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          itemBaseClass,
          "w-[calc(100%-1rem)] justify-between",
          hasActiveChild ? "text-[#DC2626]" : itemIdleClass,
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <MaterialIcon
            name={entry.icon}
            className={cn(iconBaseClass, hasActiveChild ? "text-[#DC2626]" : "text-slate-500")}
          />
          <span className="truncate leading-5">{entry.label}</span>
        </span>
        <MaterialIcon
          name="arrow_drop_down"
          className={cn(
            "shrink-0 text-[18px] transition-transform duration-200",
            hasActiveChild ? "text-[#DC2626]" : "text-slate-400",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="ml-6 border-l border-slate-200/80 pl-1">
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
  const [viewMode, setViewMode] = useState<"system" | "personal">("system");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const isAdmin = user?.role === "admin";
  const isLeader = user?.role === "leader";
  const showWorkspaceTabs = isAdmin || isLeader;
  const isMember = !showWorkspaceTabs;

  const entries = useMemo(() => {
    if (isAdmin) return viewMode === "system" ? adminEntries : personalEntries;
    if (isLeader) return viewMode === "system" ? leaderEntries : personalEntries;
    return memberEntries;
  }, [isAdmin, isLeader, viewMode]);

  const workspaceLabel = isAdmin
    ? "Admin workspace"
    : isLeader
      ? "Leader workspace"
      : "Member workspace";

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts
        .slice(-2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }
    return parts[0]?.[0]?.toUpperCase() || "U";
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
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-100 bg-white transition-transform duration-300 lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {isOpen ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 lg:hidden"
          >
            <MaterialIcon name="close" />
          </button>
        ) : null}

        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white">
              <Image
                src="https://markeeai.com/logo.svg"
                alt="MarkeeAI"
                fill
                sizes="48px"
                className="object-contain p-1.5"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[19px] font-black leading-none text-slate-900">
                MarkeeAI
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                {workspaceLabel}
              </p>
            </div>
          </div>
        </div>

        {showWorkspaceTabs ? (
          <div className="mx-4 mb-4 mt-3 shrink-0 rounded-2xl bg-slate-100/80 p-0.5">
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("system")}
                className={cn(
                  "flex-1 rounded-xl py-1.5 text-sm transition-all",
                  viewMode === "system"
                    ? "bg-[#DC2626] font-semibold text-white"
                    : "font-semibold text-slate-500 hover:text-slate-800",
                )}
              >
                Hệ thống
              </button>
              <button
                type="button"
                onClick={() => setViewMode("personal")}
                className={cn(
                  "flex-1 rounded-xl py-1.5 text-sm transition-all",
                  viewMode === "personal"
                    ? "bg-[#DC2626] font-semibold text-white"
                    : "font-semibold text-slate-500 hover:text-slate-800",
                )}
              >
                Cá nhân
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-2 pt-1">
          <p className="mb-4 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            {isMember ? "Điều hướng" : "Workspace"}
          </p>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pb-4">
          {entries.map((entry) =>
            entry.type === "group" ? (
              <SidebarGroup
                key={entry.id}
                pathname={pathname}
                entry={entry}
                onNavigate={onClose}
              />
            ) : (
              <SidebarLink
                key={entry.href}
                item={entry}
                active={isLeafActive(pathname, entry)}
                onNavigate={onClose}
              />
            ),
          )}
        </div>

        <div className="relative mt-auto border-t border-slate-100 px-4 py-4">
          {showProfileDropdown ? (
            <div className="absolute bottom-[78px] left-4 right-4 rounded-xl border border-slate-100 bg-white p-2 shadow-lg">
              <Link
                href="/all-platform/profile"
                onClick={() => {
                  setShowProfileDropdown(false);
                  onClose?.();
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#DC2626]"
              >
                <MaterialIcon name="person" className="text-[18px]" />
                Trang cá nhân
              </Link>
            </div>
          ) : null}

          <div
            className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 transition hover:bg-slate-50"
            onClick={() => setShowProfileDropdown((current) => !current)}
          >
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
              onClick={(event) => {
                event.stopPropagation();
                void handleLogout();
              }}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#DC2626]"
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
