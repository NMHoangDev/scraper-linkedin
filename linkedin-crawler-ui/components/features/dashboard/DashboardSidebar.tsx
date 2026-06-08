"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { FaRobot } from "react-icons/fa";
import { AiOutlineInteraction } from "react-icons/ai";
import { MaterialIcon } from "@/components/ui";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import { cn } from "@/lib/utils";

import { useAppAuth } from "@/contexts/AppAuthContext";
import { DashboardPlatformSwitcher } from "./DashboardPlatformSwitcher";
import { useDashboard } from "./dashboard-context";

/** Modal chuyển đổi role */
function RoleSwitchModal({
  isOpen,
  onClose,
  currentRole,
  onSwitchToLeader,
  onSwitchToMember,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentRole: "leader" | "member";
  onSwitchToLeader: (email: string, code: string) => Promise<void>;
  onSwitchToMember: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const isToLeader = currentRole === "member";

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (isToLeader && !code.trim()) {
      setError("Vui lòng nhập mã code Leader.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (isToLeader) {
        await onSwitchToLeader(email.trim(), code.trim());
      } else {
        await onSwitchToMember(email.trim());
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-md bg-black/50 backdrop-blur-sm">
      <div className="w-[min(92vw,400px)] bg-surface rounded-2xl border border-outline-variant p-xl shadow-2xl space-y-lg animate-in fade-in zoom-in duration-200">
        <div className="text-center space-y-xs">
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full mb-md ${
            isToLeader ? "bg-amber-100 text-amber-700" : "bg-[#E3000F]/10 text-[#E3000F]"
          }`}>
            <MaterialIcon name={isToLeader ? "shield_person" : "person"} className="text-3xl" />
          </div>
          <h3 className="text-h3 font-bold text-on-surface">
            {isToLeader ? "Chuyển sang Leader" : "Chuyển sang Member"}
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            {isToLeader
              ? "Nhập email và mã code để xác thực Leader."
              : "Nhập email member để chuyển vai trò."}
          </p>
        </div>

        <div className="space-y-md">
          <div className="space-y-xs">
            <label className="text-label-md font-bold text-on-surface-variant">Email {isToLeader ? "Leader" : "của bạn"} <span className="text-error">*</span></label>
            <input
              type="email"
              placeholder={isToLeader ? "email@example.com" : "email@example.com"}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm outline-none focus:ring-2 focus:ring-primary text-body-md"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              disabled={busy}
            />
          </div>

          {isToLeader && (
            <div className="space-y-xs">
              <label className="text-label-md font-bold text-on-surface-variant">Mã code xác nhận</label>
              <input
                type="password"
                placeholder="••••"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-center text-xl tracking-[1em] outline-none focus:ring-2 focus:ring-primary"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(null); }}
                disabled={busy}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-xs text-error bg-error-container/20 p-sm rounded border border-error-container text-body-sm">
            <MaterialIcon name="error" className="text-lg" />
            {error}
          </div>
        )}

        <div className="flex gap-md">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-outline-variant hover:bg-surface-container-high py-sm rounded-lg font-bold text-body-md transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 bg-primary text-on-primary py-sm rounded-lg font-bold text-body-md hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
          >
            {busy ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

const sideActive =
  "flex items-center gap-3 border-r-4 border-[#E3000F] bg-[#F5F5F5] px-4 py-3 font-sans text-xs font-bold tracking-wider text-[#E3000F] uppercase transition-all duration-150 active:scale-95 dark:border-[#E3000F] dark:bg-zinc-800/50 dark:text-[#E3000F]";
const sideIdle =
  "flex items-center gap-3 px-4 py-3 font-sans text-xs font-bold tracking-wider text-[#666666] uppercase transition-all duration-150 hover:bg-[#F5F5F5] hover:text-[#1A1A1A] active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-[#E3000F]";

export function DashboardSidebar() {
  const d = useDashboard();
  const { platform } = useAppPlatform();
  const { user, logout } = useAppAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const isHome = pathname === "/" || pathname === "/post-feed" || pathname === "/all-platform/post-feed";

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts.slice(-2).map(p => p[0]).join('').toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : "U";
  };
  const isGroupMgmt = pathname === "/quan-ly-nhom" || pathname === "/all-platform/quan-ly-nhom";
  const isTeamAdmin = pathname === "/admin/team";
  const isCrawlFb = pathname === "/crawl-data";
  const isInteraction = pathname === "/Interaction";
  const isAccountMgmt = pathname === "/quan-ly-tai-khoan" || pathname === "/all-platform/quan-ly-tai-khoan";
  const isCategoryMgmt = pathname === "/quan-ly-danh-muc" || pathname === "/all-platform/quan-ly-danh-muc";
  const isProfile = pathname === "/profile" || pathname === "/all-platform/profile";
  
  /** Leader role: chỉ dùng màn quản lý đội và KPI. */
  const isLeader = d.role === "leader";

  const handleSwitchToLeader = async (email: string, code: string) => {
    await d.confirmLeaderRoleWithSheet(email, code);
    router.push("/admin/team");
  };

  const handleSwitchToMember = async (email: string) => {
    await d.demoteLeaderToMemberWithSheet(email);
    router.push("/");
  };

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white pt-20 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
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
            {isLeader
              ? "Leader workspace"
              : (platform === "linkedin" ? "LinkedIn" : platform === "facebook" ? "Facebook" : "General") + " workspace"}
          </p>
        </div>
      </div>
      {!isLeader && <DashboardPlatformSwitcher />}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {isLeader ? (
          <Link
            href="/admin/team"
            className={cn(isTeamAdmin ? sideActive : sideIdle)}
          >
            <MaterialIcon name="group_add" className="shrink-0" />
            <span className="min-w-0 leading-snug">Quản lý KPI & Đội ngũ</span>
          </Link>
        ) : (
          <>
            <Link
              href={platform === "general" ? "/all-platform/post-feed" : "/post-feed"}
              className={cn(isHome ? sideActive : sideIdle)}
            >
              <MaterialIcon name="radar" className="shrink-0" />
              <span className="min-w-0 leading-snug">Post Feed</span>
            </Link>
            <Link
              href={platform === "general" ? "/all-platform/quan-ly-nhom" : "/quan-ly-nhom"}
              className={cn(isGroupMgmt ? sideActive : sideIdle)}
            >
              <MaterialIcon name="group" className="shrink-0" />
              <span className="min-w-0 leading-snug">Groups</span>
            </Link>

             {/* Menu Quản lý tài khoản */}
            <Link
              href={platform === "general" ? "/all-platform/quan-ly-tai-khoan" : "/quan-ly-tai-khoan"}
              className={cn(isAccountMgmt ? sideActive : sideIdle)}
            >
              <MaterialIcon name="account_circle" className="shrink-0" />
              <span className="min-w-0 leading-snug">Tài khoản</span>
            </Link>

            {/* Menu Profile */}
            <Link
              href={platform === "general" ? "/all-platform/profile" : "/profile"}
              className={cn(isProfile ? sideActive : sideIdle)}
            >
              <MaterialIcon name="person" className="shrink-0" />
              <span className="min-w-0 leading-snug">Trang cá nhân</span>
            </Link>

            {/* Menu Quản lý danh mục - Chỉ hiển thị cho Tổng hợp (general) */}
            {platform === "general" && (
              <Link
                href="/all-platform/quan-ly-danh-muc"
                className={cn(isCategoryMgmt ? sideActive : sideIdle)}
              >
                <MaterialIcon name="category" className="shrink-0" />
                <span className="min-w-0 leading-snug">Quản lý danh mục</span>
              </Link>
            )}

            {/* Các menu bổ sung cho Facebook workspace */}
            {platform === "facebook" && (
              <>
                <Link
                  href="/crawl-data"
                  className={cn(isCrawlFb ? sideActive : sideIdle)}
                >
                  <FaRobot className="shrink-0 text-2xl" />
                  <span className="min-w-0 leading-snug">Crawl data</span>
                </Link>
                <Link
                  href="/Interaction"
                  className={cn(isInteraction ? sideActive : sideIdle)}
                >
                  <AiOutlineInteraction className="shrink-0 text-2xl" />
                  <span className="min-w-0 leading-snug">Interaction</span>
                </Link>
              </>
            )}
          </>
        )}
      </nav>
      <div className="border-t border-slate-100 p-4 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 space-y-3">

        {/* User profile & Logout Box */}
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
            onClick={() => void logout()}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Đăng xuất"
          >
            <MaterialIcon name="logout" className="text-[16px]" />
          </button>
        </div>
      </div>

      <RoleSwitchModal
        isOpen={roleSwitchOpen}
        onClose={() => setRoleSwitchOpen(false)}
        currentRole={d.role ?? "member"}
        onSwitchToLeader={handleSwitchToLeader}
        onSwitchToMember={handleSwitchToMember}
      />
    </aside>
  );
}
