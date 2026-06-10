"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { MaterialIcon, type MaterialSymbolName } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";

/* ── Sidebar link styles (copy y nguyên từ DashboardSidebar) ───────────────── */
const sideActive =
  "flex items-center gap-3 border-r-4 border-[#E3000F] bg-[#F5F5F5] px-4 py-3 font-sans text-xs font-bold tracking-wider text-[#E3000F] uppercase transition-all duration-150 active:scale-95 dark:border-[#E3000F] dark:bg-zinc-800/50 dark:text-[#E3000F]";
const sideIdle =
  "flex items-center gap-3 px-4 py-3 font-sans text-xs font-bold tracking-wider text-[#666666] uppercase transition-all duration-150 hover:bg-[#F5F5F5] hover:text-[#1A1A1A] active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-[#E3000F]";

/* ── Menu items per role ────────────────────────────────────────────────────── */
interface NavItem {
  href: string;
  icon: MaterialSymbolName;
  label: string;
}

/** Admin: Dashboard → Quản lý Teams → Quản lý groups → Post Feed → Tài khoản → Trang cá nhân → Quản lý danh mục */
const ADMIN_NAV: NavItem[] = [
  { href: "/all-platform/admin/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/all-platform/admin/teams-management", icon: "shield_person", label: "Quản lý Teams" },
  { href: "/all-platform/quan-ly-nhom", icon: "group", label: "Quản lý groups" },
  { href: "/all-platform/post-feed", icon: "radar", label: "Post Feed" },
  { href: "/all-platform/quan-ly-tai-khoan", icon: "account_circle", label: "Tài khoản" },
  { href: "/all-platform/profile", icon: "person", label: "Trang cá nhân" },
  { href: "/all-platform/quan-ly-danh-muc", icon: "category", label: "Quản lý danh mục" },
];

/** Leader: Quản lý Team → Quản lý groups → Post Feed → Tài khoản → Trang cá nhân → Quản lý danh mục */
const LEADER_NAV: NavItem[] = [
  { href: "/all-platform/leader/team", icon: "groups", label: "Quản lý Team" },
  { href: "/all-platform/quan-ly-nhom", icon: "group", label: "Quản lý groups" },
  { href: "/all-platform/post-feed", icon: "radar", label: "Post Feed" },
  { href: "/all-platform/quan-ly-tai-khoan", icon: "account_circle", label: "Tài khoản" },
  { href: "/all-platform/profile", icon: "person", label: "Trang cá nhân" },
  { href: "/all-platform/quan-ly-danh-muc", icon: "category", label: "Quản lý danh mục" },
];

/** Member: Post Feed → Quản lý groups → Tài khoản → Trang cá nhân → Quản lý danh mục */
const MEMBER_NAV: NavItem[] = [
  { href: "/all-platform/post-feed", icon: "radar", label: "Post Feed" },
  { href: "/all-platform/quan-ly-nhom", icon: "group", label: "Quản lý groups" },
  { href: "/all-platform/quan-ly-tai-khoan", icon: "account_circle", label: "Tài khoản" },
  { href: "/all-platform/profile", icon: "person", label: "Trang cá nhân" },
  { href: "/all-platform/quan-ly-danh-muc", icon: "category", label: "Quản lý danh mục" },
];

/* ── Component ─────────────────────────────────────────────────────────────── */
export function AllPlatformSidebar() {
  const { user, logout } = useAppAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLeader = user?.role === "leader";
  const isAdmin = user?.role === "admin";

  const navItems = isAdmin ? ADMIN_NAV : isLeader ? LEADER_NAV : MEMBER_NAV;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts.slice(-2).map(p => p[0]).join("").toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : "U";
  };

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white pt-20 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
      {/* ── Logo & Workspace Label ── */}
      <div className="mb-8 flex items-center gap-3 px-6">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
          <Image
            src="https://markeeai.com/logo.svg"
            alt="MarkeeAI"
            fill
            sizes="40px"
            className="object-contain p-1"
            priority
          />
        </div>
        <div>
          <h2 className="text-lg leading-tight font-black text-slate-900 dark:text-zinc-100">
            MarkeeAi Seeding
          </h2>
          <p className="text-on-surface-variant mt-0.5 font-sans text-[10px] font-bold tracking-wider uppercase">
            {isAdmin ? "Admin workspace" : isLeader ? "Leader workspace" : "General workspace"}
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(isActive ? sideActive : sideIdle)}
            >
              <MaterialIcon name={item.icon} className="shrink-0" />
              <span className="min-w-0 leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── User Profile & Logout ── */}
      <div className="border-t border-slate-100 p-4 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-white dark:bg-zinc-900 p-3 border border-slate-100 dark:border-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#E3000F]/10 text-[#E3000F] font-bold flex items-center justify-center text-xs border border-[#E3000F]/20 shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate leading-none">
                {user?.name || "Người dùng"}
              </p>
              <p className="text-[9px] text-slate-400 dark:text-zinc-500 truncate mt-0.5 leading-none">
                {user?.email || "Chưa đăng nhập"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Đăng xuất"
          >
            <MaterialIcon name="logout" className="text-[16px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
