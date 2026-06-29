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
  "mx-2 flex items-center gap-3 rounded-lg px-md py-sm text-body-md font-semibold transition";
const itemActiveClass = "bg-primary text-on-primary shadow-sm";
const itemIdleClass = "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface";
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
          href: "/all-platform/tai-khoan",
          icon: "account_circle",
          label: "Quản lý TK Zalo",
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
        className={cn(iconBaseClass, active ? "text-on-primary" : "text-on-surface-variant")}
      />
      <span className="min-w-0 truncate leading-5">{item.label}</span>
      {item.badge !== undefined ? (
        <span
          className={cn(
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-on-primary/20 text-on-primary" : "bg-primary text-on-primary",
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
          hasActiveChild ? "bg-primary/5 text-primary hover:bg-primary/10" : itemIdleClass,
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <MaterialIcon
            name={entry.icon}
            className={cn(iconBaseClass, hasActiveChild ? "text-primary" : "text-on-surface-variant")}
          />
          <span className="truncate leading-5">{entry.label}</span>
        </span>
        <MaterialIcon
          name="arrow_drop_down"
          className={cn(
            "shrink-0 text-[18px] transition-transform duration-200",
            hasActiveChild ? "text-primary" : "text-on-surface-variant",
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
          <div className="ml-6 border-l border-outline-variant pl-1">
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
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface shadow-xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {isOpen ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary lg:hidden"
          >
            <MaterialIcon name="close" />
          </button>
        ) : null}

        <div className="border-b border-outline-variant px-md py-md">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm">
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
              <p className="truncate text-h3 text-on-surface">
                MarkeeAI
              </p>
              <p className="mt-1 truncate text-body-sm font-semibold text-on-surface-variant">
                {workspaceLabel}
              </p>
            </div>
          </div>
        </div>

        {showWorkspaceTabs ? (
          <div className="mx-md mb-md mt-sm shrink-0 rounded-lg border border-outline-variant bg-surface-container-low p-1">
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("system")}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-body-sm font-semibold transition",
                  viewMode === "system"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface hover:text-on-surface",
                )}
              >
                Hệ thống
              </button>
              <button
                type="button"
                onClick={() => setViewMode("personal")}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-body-sm font-semibold transition",
                  viewMode === "personal"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface hover:text-on-surface",
                )}
              >
                Cá nhân
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-2 pt-1">
          <p className="mb-sm px-md text-body-sm font-semibold text-on-surface-variant">
            {isMember ? "Điều hướng" : "Workspace"}
          </p>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pb-md">
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

        <div className="relative mt-auto border-t border-outline-variant px-md py-md">
          {showProfileDropdown ? (
            <div className="absolute bottom-[78px] left-md right-md rounded-lg border border-outline-variant bg-surface p-xs shadow-lg">
              <Link
                href="/all-platform/profile"
                onClick={() => {
                  setShowProfileDropdown(false);
                  onClose?.();
                }}
                className="flex items-center gap-3 rounded-lg px-sm py-xs text-body-md font-semibold text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
              >
                <MaterialIcon name="person" className="text-[18px]" />
                Trang cá nhân
              </Link>
            </div>
          ) : null}

          <div
            className="flex cursor-pointer items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-sm py-sm transition hover:bg-surface"
            onClick={() => setShowProfileDropdown((current) => !current)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-body-md font-semibold text-primary">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-body-md font-semibold text-on-surface">
                  {user?.name || "Người dùng"}
                </p>
                <p className="truncate text-body-sm text-on-surface-variant">
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
              className="rounded-lg p-2 text-on-surface-variant transition hover:bg-primary/10 hover:text-primary"
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
