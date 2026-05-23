"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaRobot } from "react-icons/fa";
import { AiOutlineInteraction } from "react-icons/ai";
import { MaterialIcon } from "@/components/ui";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import { cn } from "@/lib/utils";

import { DashboardPlatformSwitcher } from "./DashboardPlatformSwitcher";
import { useDashboard } from "./dashboard-context";

const sideActive =
  "flex items-center gap-3 border-r-4 border-sky-700 bg-slate-50 px-4 py-3 font-sans text-xs font-bold tracking-wider text-sky-700 uppercase transition-all duration-150 active:scale-95 dark:border-sky-400 dark:bg-zinc-800/50 dark:text-sky-400";
const sideIdle =
  "flex items-center gap-3 px-4 py-3 font-sans text-xs font-bold tracking-wider text-slate-500 uppercase transition-all duration-150 hover:bg-slate-50 hover:text-sky-600 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-sky-300";

export function DashboardSidebar() {
  const d = useDashboard();
  const { platform } = useAppPlatform();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const isGroupMgmt = pathname === "/quan-ly-nhom";
  const isTeamAdmin = pathname === "/admin/team";
  const isCrawlFb = pathname === "/crawl-data";
  const isInteraction = pathname === "/Interaction";
  const isAccountMgmt = pathname === "/quan-ly-tai-khoan";
  
  /** Leader LinkedIn: chỉ dùng màn quản lý đội, không dùng Post Feed / Groups. */
  const isLeaderLinkedInWorkspace = platform === "linkedin" && d.role === "leader";

  return (
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white pt-20 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-8 flex items-center gap-3 px-6">
        <div className="bg-primary-container flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white">
          <MaterialIcon name="radar" />
        </div>
        <div>
          <h2 className="text-lg leading-tight font-black text-slate-900 dark:text-zinc-100">
            CrawlerPro
          </h2>
          <p className="text-on-surface-variant mt-0.5 font-sans text-[10px] font-bold tracking-wider uppercase">
            {platform === "linkedin" ? "LinkedIn" : platform === "facebook" ? "Facebook" : "General"} workspace
          </p>
        </div>
      </div>
      <DashboardPlatformSwitcher />
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {isLeaderLinkedInWorkspace ? (
          <Link
            href="/admin/team"
            className={cn(isTeamAdmin ? sideActive : sideIdle)}
          >
            <MaterialIcon name="group_add" className="shrink-0" />
            <span className="min-w-0 leading-snug">Quản lý đội ngũ</span>
          </Link>
        ) : (
          <>
            <Link href="/" className={cn(isHome ? sideActive : sideIdle)}>
              <MaterialIcon name="radar" className="shrink-0" />
              <span className="min-w-0 leading-snug">Post Feed</span>
            </Link>
            <Link
              href="/quan-ly-nhom"
              className={cn(isGroupMgmt ? sideActive : sideIdle)}
            >
              <MaterialIcon name="group" className="shrink-0" />
              <span className="min-w-0 leading-snug">Groups</span>
            </Link>

            {/* Menu Quản lý tài khoản */}
            <Link
              href="/quan-ly-tai-khoan"
              className={cn(isAccountMgmt ? sideActive : sideIdle)}
            >
              <MaterialIcon name="account_circle" className="shrink-0" />
              <span className="min-w-0 leading-snug">Tài khoản</span>
            </Link>

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

            {d.role === "leader" && platform === "linkedin" && (
              <Link
                href="/admin/team"
                className={cn(isTeamAdmin ? sideActive : sideIdle)}
              >
                <MaterialIcon name="group_add" className="shrink-0" />
                <span className="min-w-0 leading-snug">Quản lý đội ngũ</span>
              </Link>
            )}
          </>
        )}
      </nav>
      
      {/* <div className="space-y-1 p-2">
        <Link
          href="/quan-ly-tai-khoan"
          className={cn(
            isAccountMgmt ? "bg-slate-50 text-sky-700 dark:bg-zinc-800/50 dark:text-sky-400 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-sky-600 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-sky-300",
            "flex w-full items-center gap-3 px-4 py-3 font-sans text-xs tracking-wider uppercase transition-all duration-150 active:scale-95 rounded-lg"
          )}
        >
          <MaterialIcon name="account_circle" className="shrink-0" />
          <span className="min-w-0 leading-snug">Quản lý tài khoản</span>
        </Link>
      </div> */}
    </aside>
  );
}
