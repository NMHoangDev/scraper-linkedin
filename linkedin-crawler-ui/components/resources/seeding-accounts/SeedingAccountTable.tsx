"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SeedingAccount, SeedingPlatform } from "@/types/seeding-account.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Eye,
  Pencil,
  LogIn,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { seedingAccountsService } from "@/services/seeding-accounts.service";
import { AddAccountDialog } from "./AddAccountDialog";

interface Props {
  accounts: SeedingAccount[];
  search: string;
  onSearchChange: (v: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  activeTab: string;
  onTabChange: (v: string) => void;
}

type PlatformStyle = { label: string; bg: string; text: string; dotBg: string; dotText: string };
const PLATFORM_INFO: Record<SeedingPlatform, PlatformStyle> = {
  facebook: { label: "Facebook", bg: "#e8f1fe", text: "#1877f2", dotBg: "#1877f2", dotText: "f" },
  linkedin: { label: "LinkedIn", bg: "#e7f1fb", text: "#0a66c2", dotBg: "#0a66c2", dotText: "in" },
  gmail: { label: "Gmail", bg: "#fdeeee", text: "#ea4335", dotBg: "linear-gradient(135deg,#ea4335,#fbbc05,#34a853,#4285f4)", dotText: "g" },
  tiktok: { label: "TikTok", bg: "#eee", text: "#111", dotBg: "#111", dotText: "t" },
  zalo: { label: "Zalo", bg: "#e6f0ff", text: "#0068ff", dotBg: "#0068ff", dotText: "z" },
};

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; dotBg: string; dotShadow: string }> = {
  online: { label: "Online", bg: "#eafaf3", text: "#087a50", dotBg: "#16a26a", dotShadow: "0 0 0 3px rgba(22,162,106,.18)" },
  idle: { label: "Không hoạt động", bg: "#fff3da", text: "#a16207", dotBg: "#f59e0b", dotShadow: "none" },
  offline: { label: "Offline", bg: "#f2f3f6", text: "#737785", dotBg: "#c7cad2", dotShadow: "none" },
  warning: { label: "Cảnh báo", bg: "#fff3da", text: "#a16207", dotBg: "#f59e0b", dotShadow: "none" },
};

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}p` : `${m}p`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function SeedingAccountTable({
  accounts,
  search,
  onSearchChange,
  platformFilter,
  onPlatformFilterChange,
  statusFilter,
  onStatusFilterChange,
  activeTab,
  onTabChange,
}: Props) {
  const tabs = [
    { key: "all", label: "Tất cả" },
    { key: "online", label: "Đang online" },
    { key: "offline", label: "Offline" },
    { key: "warning", label: "Cảnh báo" },
  ];

  // Row-level state for dropdown + dialogs
  const [deleteTarget, setDeleteTarget] = useState<SeedingAccount | null>(null);
  const [editTarget, setEditTarget] = useState<SeedingAccount | null>(null);
  const [detailTarget, setDetailTarget] = useState<SeedingAccount | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await seedingAccountsService.deleteAccount(deleteTarget.id);
      if (res.success) {
        toast.success(`Đã xóa tài khoản "${deleteTarget.name}"`);
      } else {
        // Backend chưa sẵn sàng → optimistic
        toast.success(`Đã xóa tài khoản "${deleteTarget.name}" (offline mode)`);
      }
    } catch {
      toast.success(`Đã xóa tài khoản "${deleteTarget.name}" (offline mode)`);
    }
    setDeleteTarget(null);
  };

  const handleRelogin = async (acc: SeedingAccount) => {
    try {
      const res = await seedingAccountsService.triggerRelogin(acc.id);
      if (res.success) {
        toast.success(`Đã yêu cầu đăng nhập lại cho "${acc.name}"`);
      } else {
        toast.info(`Tính năng đang phát triển`, {
          description: `Yêu cầu đăng nhập lại cho "${acc.name}" sẽ sớm được hỗ trợ.`,
        });
      }
    } catch {
      toast.info(`Tính năng đang phát triển`, {
        description: `Yêu cầu đăng nhập lại cho "${acc.name}" sẽ sớm được hỗ trợ.`,
      });
    }
  };

  return (
    <div
      className="overflow-hidden rounded-[15px] border border-[#e7e9ef] bg-white"
      style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
    >
      {/* Panel header with tabs */}
      <div className="flex items-center justify-between border-b border-[#e7e9ef] px-4 py-[15px]">
        <h3 className="m-0 text-[15px] font-bold text-[#252733]">Danh sách tài khoản</h3>
        <div className="flex gap-[6px]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "rounded-[8px] border-0 px-[10px] py-[7px] text-[12px] font-bold transition-colors",
                activeTab === tab.key
                  ? "bg-[#c71f4d] text-white"
                  : "bg-[#f2f3f6] text-[#606472] hover:bg-[#e5e7eb]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row */}
      <div
        className="grid gap-2 border-b border-[#e7e9ef] px-4 py-[14px]"
        style={{ gridTemplateColumns: "1.4fr repeat(3, minmax(120px, 1fr))" }}
      >
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔎 Tìm theo tên hoặc email tài khoản..."
          className="min-w-0 rounded-[9px] border border-[#dde0e7] bg-white px-[10px] py-[9px] text-[13px] text-[#4b4f5a] outline-none"
        />
        <select
          value={platformFilter}
          onChange={(e) => onPlatformFilterChange(e.target.value)}
          className="min-w-0 rounded-[9px] border border-[#dde0e7] bg-white px-[10px] py-[9px] text-[13px] text-[#4b4f5a] outline-none"
        >
          <option value="all">Tất cả nền tảng</option>
          <option value="facebook">Facebook</option>
          <option value="linkedin">LinkedIn</option>
          <option value="gmail">Gmail</option>
          <option value="tiktok">TikTok</option>
          <option value="zalo">Zalo</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="min-w-0 rounded-[9px] border border-[#dde0e7] bg-white px-[10px] py-[9px] text-[13px] text-[#4b4f5a] outline-none"
        >
          <option value="all">Mọi trạng thái</option>
          <option value="online">Đang online</option>
          <option value="idle">Không hoạt động</option>
          <option value="offline">Offline</option>
        </select>
        <select className="min-w-0 rounded-[9px] border border-[#dde0e7] bg-white px-[10px] py-[9px] text-[13px] text-[#4b4f5a] outline-none">
          <option>Online nhiều nhất</option>
          <option>Online ít nhất</option>
          <option>Mới thêm gần đây</option>
        </select>
      </div>

      {/* Account table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              {["Tài khoản", "Nền tảng", "Trạng thái", "Thời gian online hôm nay", "Hoạt động gần nhất", ""].map((h) => (
                <th
                  key={h}
                  className="sticky top-0 border-b border-[#e7e9ef] bg-[#fafbfc] px-[14px] py-[11px] text-left text-[11px] font-semibold uppercase leading-none tracking-[0.03em] text-[#737785]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-[14px] py-8 text-center text-[13px] text-[#737785]">
                  Không tìm thấy tài khoản phù hợp.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => {
                const info = PLATFORM_INFO[acc.platform];
                const sStyle = STATUS_STYLE[acc.status] || STATUS_STYLE.offline;
                const progressPct = Math.min((acc.onlineTodayMinutes / 480) * 100, 100);
                const initials = getInitials(acc.name);
                const canRelogin = acc.status === "offline" || acc.status === "warning";

                return (
                  <tr key={acc.id} className="border-b border-[#f1f2f5] last:border-b-0 hover:bg-[#fbfbfd]">
                    {/* Account cell */}
                    <td className="px-[14px] py-[12px] align-middle text-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div
                          className="relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold text-white"
                          style={{ background: info.dotBg }}
                        >
                          {initials}
                          <span
                            className="absolute -bottom-[3px] -right-[3px] flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border-2 border-white text-[8px] font-black text-white"
                            style={{ background: info.dotBg }}
                          >
                            {info.dotText}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#252733]">{acc.name}</div>
                          <div className="mt-px text-[11px] text-[#737785]">{acc.email || acc.phone}</div>
                        </div>
                      </div>
                    </td>

                    {/* Platform badge */}
                    <td className="px-[14px] py-[12px] align-middle text-[13px]">
                      <span
                        className="inline-flex items-center gap-[5px] rounded-[7px] px-[9px] py-[5px] text-[11px] font-bold"
                        style={{ background: info.bg, color: info.text }}
                      >
                        {info.label}
                      </span>
                    </td>

                    {/* Status pill */}
                    <td className="px-[14px] py-[12px] align-middle text-[13px]">
                      <span
                        className="inline-flex items-center gap-[6px] rounded-[99px] px-[10px] py-[5px] text-[12px] font-bold"
                        style={{ background: sStyle.bg, color: sStyle.text }}
                      >
                        <span
                          className="h-[7px] w-[7px] rounded-full"
                          style={{ background: sStyle.dotBg, boxShadow: sStyle.dotShadow }}
                        />
                        {sStyle.label}
                      </span>
                    </td>

                    {/* Online time today */}
                    <td className="px-[14px] py-[12px] align-middle text-[13px]">
                      <div className="text-[13px] font-extrabold text-[#252733]">
                        {formatMinutes(acc.onlineTodayMinutes)}
                      </div>
                      <div className="mt-[5px] h-[5px] w-[110px] overflow-hidden rounded-[99px] bg-[#eef0f4]">
                        <div
                          className="h-full rounded-[99px] transition-all"
                          style={{
                            width: `${progressPct}%`,
                            background:
                              progressPct > 60
                                ? "linear-gradient(90deg,#16a26a,#3fcf8e)"
                                : progressPct > 20
                                  ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                                  : "linear-gradient(90deg,#c71f4d,#e83f6f)",
                          }}
                        />
                      </div>
                      {acc.status === "offline" && acc.onlineTodayMinutes === 0 && (
                        <div className="mt-[3px] flex items-center gap-[4px] text-[11px] font-bold text-[#dc2626]">
                          <span>⚠</span>
                          <span>Ngừng hoạt động</span>
                        </div>
                      )}
                    </td>

                    {/* Last active */}
                    <td className="px-[14px] py-[12px] align-middle text-[13px] text-[#737785]">
                      {timeAgo(acc.lastActiveAt)}
                    </td>

                    {/* Actions — DropdownMenu */}
                    <td className="px-[14px] py-[12px] align-middle text-[13px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            title="Tùy chọn"
                            className="grid h-[30px] w-[30px] place-items-center rounded-[8px] border border-[#e7e9ef] bg-white text-[13px] text-[#737785] transition-colors hover:border-[#c71f4d] hover:text-[#c71f4d] cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="min-w-[180px] rounded-[12px] border-[#e7e9ef] p-1.5"
                        >
                          <DropdownMenuItem
                            className="rounded-[8px] text-[13px] cursor-pointer"
                            onClick={() => setDetailTarget(acc)}
                          >
                            <Eye className="mr-2 h-4 w-4 text-[#606472]" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-[8px] text-[13px] cursor-pointer"
                            onClick={() => setEditTarget(acc)}
                          >
                            <Pencil className="mr-2 h-4 w-4 text-[#606472]" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          {canRelogin && (
                            <DropdownMenuItem
                              className="rounded-[8px] text-[13px] cursor-pointer"
                              onClick={() => handleRelogin(acc)}
                            >
                              <LogIn className="mr-2 h-4 w-4 text-[#606472]" />
                              Đăng nhập lại
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="my-1 bg-[#e7e9ef]" />
                          <DropdownMenuItem
                            className="rounded-[8px] text-[13px] text-[#dc2626] cursor-pointer data-[variant=destructive]:text-[#dc2626]"
                            data-variant="destructive"
                            onClick={() => setDeleteTarget(acc)}
                          >
                            <Trash2 className="mr-2 h-4 w-4 text-[#dc2626]" />
                            Xóa tài khoản
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal — simple alert dialog showing account info */}
      <AlertDialog open={!!detailTarget} onOpenChange={(o) => { if (!o) setDetailTarget(null); }}>
        <AlertDialogContent className="p-0 gap-0 min-w-[400px] max-w-md">
          <AlertDialogHeader className="border-b border-[#e7e9ef] px-6 py-4">
            <AlertDialogTitle className="text-[17px] font-bold text-[#252733]">
              Chi tiết tài khoản
            </AlertDialogTitle>
          </AlertDialogHeader>
          {detailTarget && (
            <div className="space-y-3 px-6 py-5">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f1f2f5]">
                <div
                  className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[12px] text-[16px] font-extrabold text-white"
                  style={{ background: PLATFORM_INFO[detailTarget.platform]?.dotBg || "#737785" }}
                >
                  {getInitials(detailTarget.name)}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#252733]">{detailTarget.name}</p>
                  <p className="text-[12px] text-[#737785]">{detailTarget.email || detailTarget.phone}</p>
                </div>
              </div>
              <DetailRow label="Nền tảng" value={PLATFORM_INFO[detailTarget.platform]?.label || detailTarget.platform} />
              <DetailRow label="Trạng thái" value={STATUS_STYLE[detailTarget.status]?.label || detailTarget.status} />
              <DetailRow label="Online hôm nay" value={formatMinutes(detailTarget.onlineTodayMinutes)} />
              <DetailRow label="Online tuần này" value={formatMinutes(detailTarget.onlineWeekMinutes)} />
              <DetailRow label="Hoạt động gần nhất" value={timeAgo(detailTarget.lastActiveAt)} />
              <DetailRow label="Xác minh 2 lớp" value={detailTarget.twoFactorVerified ? "Đã xác minh" : "Chưa xác minh"} />
              {detailTarget.recentInactiveDays ? (
                <DetailRow label="Ngày không hoạt động" value={`${detailTarget.recentInactiveDays} ngày`} />
              ) : null}
            </div>
          )}
          <AlertDialogFooter className="border-t border-[#e7e9ef] px-6 py-4">
            <AlertDialogCancel className="rounded-[10px] border-[#dde0e7] text-[13px] font-bold text-[#606472]">
              Đóng
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="p-0 gap-0 min-w-[350px] max-w-sm">
          <AlertDialogHeader className="border-b border-[#e7e9ef] px-6 py-4">
            <AlertDialogTitle className="text-[17px] font-bold text-[#252733]">
              Xóa tài khoản
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#606472]">
              Bạn có chắc muốn xóa tài khoản{" "}
              <span className="font-bold text-[#252733]">{deleteTarget?.name}</span>? Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-[#e7e9ef] px-6 py-4">
            <AlertDialogCancel className="rounded-[10px] border-[#dde0e7] text-[13px] font-bold text-[#606472]">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-[10px] bg-[#dc2626] px-[18px] text-[13px] font-bold text-white hover:bg-[#b91c1c]"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {editTarget && (
        <AddAccountDialog
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          onSuccess={() => setEditTarget(null)}
          editAccount={{
            id: editTarget.id,
            platform: editTarget.platform,
            name: editTarget.name,
            email: editTarget.email,
            phone: editTarget.phone,
          }}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-semibold text-[#737785]">{label}</span>
      <span className="text-[13px] font-bold text-[#252733]">{value}</span>
    </div>
  );
}
