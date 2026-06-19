"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FaFacebook } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  socialAccountsService,
  allPlatformGroupsService,
} from "@/services/all-platform.service";
import type { FacebookGroup, SocialAccount } from "@/types/unified.types";

// Thay đổi URL ws phù hợp với môi trường của bạn
const getFacebookCrawlWsUrl = (email: string) => {
  const wsRoot = ("http://10.30.50.29:8081/facebook")
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
  return `${wsRoot}/api/v1/ws/CrawlFbForFE/${encodeURIComponent(email)}`;
};

export interface VpsInfoType {
  status: "đang cào" | "hoàn thành" | "lỗi";
  count: number;
  group_names: string[];
}

interface CrawlFacebookPopupProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CrawlResult {
  success: boolean;
  message: string;
  data?: any;
}

// ── Step indicator ─────────────────────────────────────────────────────────

function StepDot({ step, active, done }: { step: number; active: boolean; done: boolean }) {
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-300",
        done
          ? "bg-emerald-500 border-emerald-500 text-white"
          : active
            ? "bg-[#E3000F] border-[#E3000F] text-white scale-110 shadow-md"
            : "bg-white border-[#E5E5E5] text-[#A0A0A0]"
      )}
    >
      {done ? <MaterialIcon name="check" className="text-[14px]" /> : step}
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────

function GroupCard({
  group,
  selected,
  onToggle,
}: {
  group: FacebookGroup;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-start gap-3 cursor-pointer",
        selected
          ? "bg-[#E3000F]/10 border-[#E3000F]/20 shadow-sm"
          : "bg-white border-[#E5E5E5] hover:border-[#E3000F]/30 hover:bg-[#F5F5F5]/30"
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
          selected ? "bg-[#E3000F] border-[#E3000F]" : "border-[#E5E5E5]"
        )}
      >
        {selected && <MaterialIcon name="check" className="text-white text-[12px]" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[#1A1A1A] truncate">
          {group.group_name || "—"}
        </p>
        <p className="text-[10px] text-[#A0A0A0] font-mono truncate mt-0.5">
          {group.group_url}
        </p>
        {group.intent_name && (
          <span className="mt-1 inline-block bg-[#E3000F]/10 text-[#E3000F] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#E3000F]/20">
            {group.intent_name}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function CrawlFacebookPopup({
  open,
  onClose,
  onSuccess,
}: CrawlFacebookPopupProps) {
  const [step, setStep] = useState(1); // 1=account, 2=groups, 3=result

  // Accounts
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null);
  const [useDefaultAccount, setUseDefaultAccount] = useState(true);

  // Groups
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState("");

  // Crawl Realtime State (Step 3)
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const [loadingMsg, setLoadingMsg] = useState("Đang khởi tạo kết nối...");
  const [vpsDetails, setVpsDetails] = useState<Record<string, VpsInfoType> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await socialAccountsService.getAll("facebook");
      if (res.success && Array.isArray(res.data)) {
        setAccounts(res.data as SocialAccount[]);
      }
    } catch {
      // ignore
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await allPlatformGroupsService.getAll("facebook");
      if (res.success && Array.isArray(res.data)) {
        setGroups(res.data as FacebookGroup[]);
      }
    } catch {
      // ignore
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedAccount(null);
      setSelectedGroups(new Set());
      setGroupSearch("");
      setCrawlError(null);
      setCrawlResult(null);
      setVpsDetails(null);
      setUseDefaultAccount(true);
      void fetchAccounts();
    } else {
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.CONNECTING) {
          console.warn("Closing connecting WebSocket");
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [open, fetchAccounts]);

  useEffect(() => {
    if (step === 2 && groups.length === 0) {
      void fetchGroups();
    }
  }, [step, groups.length, fetchGroups]);

  const filteredGroups = groups.filter((g) => {
    const q = groupSearch.toLowerCase();
    return (
      (g.group_name || "").toLowerCase().includes(q) ||
      (g.group_url || "").toLowerCase().includes(q)
    );
  });

  const toggleGroup = (url: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.group_url)));
    }
  };

  const handleCancelCrawl = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setCrawling(false);
    setCrawlError("Đã hủy tiến trình thu thập dữ liệu theo yêu cầu.");
  };

  const handleStartCrawl = () => {
    if (selectedGroups.size === 0) {
      setCrawlError("Vui lòng chọn ít nhất một nhóm");
      return;
    }

    // Reset state & chuyển sang Step 3
    setCrawlError(null);
    setCrawlResult(null);
    setVpsDetails(null);
    setCrawling(true);
    setLoadingMsg("Hệ thống đang tải và phân bổ thông tin...");
    setStep(3);

    const selectedGroupObjects = groups
      .filter((g) => selectedGroups.has(g.group_url))
      .map((g) => ({
        name: g.group_name || g.group_url,
        url: g.group_url,
        intent: g.intent_name || undefined,
        id: g.id || "default_id", // Đảm bảo payload hợp lệ
        id_member: "current_user_id",
        group_name: g.group_name || "Unknown Group"
      }));

    const requestPayload: any = {
      groups: selectedGroupObjects,
    };

    if (!useDefaultAccount && selectedAccount) {
      requestPayload.tkFB = {
        useName: selectedAccount.account_email || selectedAccount.account_name,
        password: selectedAccount.account_password || "",
      };
    }

    const emailId = useDefaultAccount
      ? `default_user_${Date.now()}`
      : (selectedAccount?.account_email || "anonymous");

    const wsUrl = getFacebookCrawlWsUrl(emailId);
    let wsOpened = false;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const connectTimeout = window.setTimeout(() => {
        if (!wsOpened && ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setCrawling(false);
          setCrawlError("Không thể kết nối đến máy chủ WebSocket (Timeout sau 8s). Vui lòng kiểm tra lại đường truyền.");
        }
      }, 8000);

      ws.onopen = () => {
        wsOpened = true;
        window.clearTimeout(connectTimeout);
        setLoadingMsg("Đã kết nối, đang phân bổ công việc cho các VPS...");
        ws.send(JSON.stringify(requestPayload));
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);

          // Cập nhật chi tiết VPS (bảng trạng thái Realtime)
          if (response.vps_details) {
            setVpsDetails(response.vps_details);
          }

          if (response.status === "heartbeat") {
            setLoadingMsg("Hệ thống đang thu thập dữ liệu...");
            return;
          }

          // Trạng thái đang diễn ra
          if (["queued", "processing", "info", "partial_success", "warning"].includes(response.status)) {
            setLoadingMsg(response.message || "Đang xử lý...");
          }

          // Hoàn thành xuất sắc
          if (response.status === "success") {
            setCrawling(false);
            setCrawlResult({
              success: true,
              message: "Đã cào dữ liệu thành công!",
              data: response.data,
            });
            ws.close();
          }

          // Lỗi từ server
          if (["error", "fail", "canceled"].includes(response.status)) {
            setCrawling(false);
            setCrawlError(response.message || "Lỗi tiến trình thu thập");
            ws.close();
          }
        } catch (error) {
          console.error("Lỗi parse dữ liệu từ WS:", error);
        }
      };

      ws.onerror = () => {
        window.clearTimeout(connectTimeout);
        if (!wsOpened) {
          setCrawling(false);
          setCrawlError("Lỗi kết nối WebSocket đến máy chủ.");
        }
      };

      ws.onclose = (event) => {
        window.clearTimeout(connectTimeout);
        if (!event.wasClean && event.code !== 1000 && crawling) {
          setCrawling(false);
          setCrawlError(`WebSocket đã đóng bất thường (Mã: ${event.code})`);
        }
      };
    } catch (e) {
      setCrawling(false);
      setCrawlError(e instanceof Error ? e.message : "Lỗi khởi tạo WebSocket");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default bg-transparent outline-none"
        aria-label="Đóng"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl transition-all",
          step === 3
            ? "w-[500px] max-w-[95vw] rounded-3xl bg-white/95 backdrop-blur-xl border border-white/20 p-8" // Giao diện mới cho Step 3
            : "w-[90vw] sm:w-[512px] bg-white rounded-2xl border border-[#E5E5E5]" // Giao diện gốc cho Step 1 & 2
        )}
        style={{ maxHeight: step === 3 ? "none" : "min(92vh, 640px)" }}
        role="dialog"
      >
        {/* CSS Nhúng cho scrollbar mượt mà ẩn đi khi không cuộn */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>

        {/* ── HIỂN THỊ HEADER & STEPS CHỈ KHI Ở BƯỚC 1 HOẶC 2 ── */}
        {step < 3 && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F5F5]/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E3000F]/10 flex items-center justify-center">
                  <FaFacebook className="text-[#E3000F] text-xl" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#1A1A1A]">
                    Cào dữ liệu Facebook
                  </h2>
                  <p className="text-[10px] text-[#A0A0A0] font-medium">
                    Sử dụng hệ thống phân tán VPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-lg p-1.5 transition cursor-pointer"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 py-3 px-6 border-b border-[#E5E5E5] shrink-0">
              <StepDot step={1} active={step === 1} done={step > 1} />
              <div className={cn("flex-1 h-0.5 rounded-full max-w-[48px] transition-all", step > 1 ? "bg-emerald-400" : "bg-[#E5E5E5]")} />
              <StepDot step={2} active={step === 2} done={step > 2} />
              <div className={cn("flex-1 h-0.5 rounded-full max-w-[48px] transition-all", step > 2 ? "bg-emerald-400" : "bg-[#E5E5E5]")} />
              <StepDot step={3} active={step === 3} done={false} />
            </div>
          </>
        )}

        {/* ── CONTENT AREA ── */}
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto custom-scrollbar",
          step === 3 ? "p-0 overflow-visible text-center" : "px-6 py-5"
        )}>

          {/* ── STEP 1: Account ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                Bước 1 — Chọn tài khoản Facebook
              </h3>

              <label className="flex items-center gap-3 px-4 py-3 bg-[#F5F5F5] rounded-xl border border-[#E5E5E5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDefaultAccount}
                  onChange={(e) => {
                    setUseDefaultAccount(e.target.checked);
                    if (e.target.checked) setSelectedAccount(null);
                  }}
                  className="w-4 h-4 accent-[#E3000F]"
                />
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A]">Dùng tài khoản mặc định</p>
                  <p className="text-[10px] text-[#A0A0A0]">Sử dụng thông tin đăng nhập đã lưu trên server</p>
                </div>
              </label>

              {!useDefaultAccount && (
                <>
                  {accountsLoading ? (
                    <div className="flex items-center justify-center py-10 text-[#A0A0A0]">
                      <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#E3000F] rounded-full animate-spin mr-2" />
                      <span className="text-xs">Đang tải tài khoản...</span>
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <MaterialIcon name="warning" className="text-amber-500 text-2xl mx-auto mb-2" />
                      <p className="text-xs font-bold text-amber-800">Chưa có tài khoản Facebook nào</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {accounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedAccount(acc)}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer",
                            selectedAccount?.id === acc.id ? "bg-[#E3000F]/10 border-[#E3000F]/20 shadow-sm" : "bg-white border-[#E5E5E5]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0", selectedAccount?.id === acc.id ? "bg-[#E3000F]" : "bg-[#A0A0A0]")}>
                              {(acc.account_name[0] || "F").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1A1A1A] truncate">{acc.account_name}</p>
                              {acc.account_email && <p className="text-[10px] text-[#A0A0A0] truncate">{acc.account_email}</p>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: Groups ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                Bước 2 — Chọn nhóm cần cào
              </h3>
              <div className="relative">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] text-base" />
                <input
                  type="text"
                  placeholder="Tìm nhóm theo tên hoặc URL..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[10px] font-bold text-[#E3000F] hover:underline cursor-pointer"
                >
                  {selectedGroups.size === filteredGroups.length && filteredGroups.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
                {selectedGroups.size > 0 && (
                  <span className="bg-[#E3000F] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    Đã chọn {selectedGroups.size}
                  </span>
                )}
              </div>
              {groupsLoading ? (
                <div className="flex items-center justify-center py-10 text-[#A0A0A0]">
                  <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#E3000F] rounded-full animate-spin mr-2" />
                  <span className="text-xs">Đang tải nhóm...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-8 text-center">
                  <MaterialIcon name="group_off" className="text-[#A0A0A0] text-3xl mx-auto mb-2" />
                  <p className="text-xs text-[#A0A0A0]">Không tìm thấy nhóm nào</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredGroups.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      selected={selectedGroups.has(g.group_url)}
                      onToggle={() => toggleGroup(g.group_url)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: MÀN HÌNH FULL SCREEN LOADING ── */}
          {step === 3 && (
            <div className="relative">
              {/* Decorative background glow */}
              <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-full -translate-x-1/2 rounded-full bg-violet-400/20 blur-[60px]" />

              {crawling ? (
                <>
                  <div className="relative mb-6 flex justify-center">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 rounded-full border-4 border-violet-100"></div>
                      <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-600"></div>
                      <div className="absolute inset-3 flex animate-pulse items-center justify-center rounded-full bg-violet-100">
                        <div className="absolute h-6 w-6 animate-ping rounded-full bg-violet-400 opacity-60"></div>
                        <div className="absolute h-3 w-3 rounded-full bg-violet-600"></div>
                      </div>
                    </div>
                  </div>

                  <h1 className="relative mb-2 text-xl font-bold tracking-tight text-slate-800">Đang xử lý dữ liệu</h1>

                  {/* NẾU KHÔNG CÓ CHI TIẾT VPS -> HIỆN TEXT BÌNH THƯỜNG */}
                  {(!vpsDetails || Object.keys(vpsDetails).length === 0) && (
                    <p className="relative w-full whitespace-pre-line text-sm leading-relaxed text-slate-600 mb-6">
                      {loadingMsg}
                    </p>
                  )}

                  {/* NẾU CÓ CHI TIẾT VPS -> HIỆN BẢNG THEO DÕI REALTIME LÀM LẠI ĐẸP HƠN */}
                  {vpsDetails && Object.keys(vpsDetails).length > 0 && (
                    <div className="relative w-full mt-6 mb-6">
                      {/* Tiêu đề khu vực VPS */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                          </div>
                          Trạng thái Server ({Object.keys(vpsDetails).length})
                        </h3>
                      </div>

                      {/* Danh sách Card VPS */}
                      <div className="max-h-[250px] overflow-y-auto rounded-2xl border border-slate-200/60 bg-slate-50/50 p-2 shadow-inner custom-scrollbar space-y-2">
                        {Object.entries(vpsDetails).map(([vpsName, info]) => {
                          const isProcessing = info.status === "đang cào";
                          const isSuccess = info.status === "hoàn thành";

                          return (
                            <div
                              key={vpsName}
                              className={cn(
                                "group relative flex flex-col rounded-xl border p-3 shadow-sm transition-all duration-300 hover:shadow-md",
                                isProcessing ? "bg-white border-blue-100/50" :
                                  isSuccess ? "bg-white border-emerald-100/50" :
                                    "bg-white border-rose-100/50"
                              )}
                            >
                              {/* Cạnh trái trang trí (Accent border) */}
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors",
                                isProcessing ? "bg-blue-400" :
                                  isSuccess ? "bg-emerald-400" :
                                    "bg-rose-400"
                              )} />

                              {/* Header Card */}
                              <div className="flex items-start justify-between pl-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {/* Icon theo trạng thái */}
                                  <div className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg border",
                                    isProcessing ? "bg-blue-50 border-blue-100 text-blue-600" :
                                      isSuccess ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                        "bg-rose-50 border-rose-100 text-rose-600"
                                  )}>
                                    {isProcessing ? (
                                      <MaterialIcon name="sync" className="text-[14px] animate-spin" />
                                    ) : isSuccess ? (
                                      <MaterialIcon name="check_circle" className="text-[14px]" />
                                    ) : (
                                      <MaterialIcon name="error" className="text-[14px]" />
                                    )}
                                  </div>

                                  {/* Tên Server & Số nhóm */}
                                  <div>
                                    <h4 className="text-[13px] font-bold text-slate-800 leading-none mb-1 text-left">{vpsName}</h4>
                                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                     <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                          </div>
                                      <span>{info.count} nhóm cần xử lý</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Badge trạng thái */}
                                <span className={cn(
                                  "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border",
                                  isProcessing ? "bg-blue-50 text-blue-600 border-blue-200/60" :
                                    isSuccess ? "bg-emerald-50 text-emerald-600 border-emerald-200/60" :
                                      "bg-rose-50 text-rose-600 border-rose-200/60"
                                )}>
                                  {isProcessing && <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                  {isProcessing ? "Đang chạy" : isSuccess ? "Hoàn thành" : "Lỗi"}
                                </span>
                              </div>

                              {/* Danh sách Groups bên dưới */}
                              <div className="pl-2">
                                <div
                                  className={cn(
                                    "rounded-lg p-2.5 text-left text-[11px] leading-relaxed line-clamp-2 transition-colors",
                                    isProcessing ? "bg-blue-50/50 text-blue-800/70" :
                                      isSuccess ? "bg-emerald-50/50 text-emerald-800/70" :
                                        "bg-rose-50/50 text-rose-800/70"
                                  )}
                                  title={info.group_names.join(", ")}
                                >
                                  {info.group_names.join(" • ")}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCancelCrawl}
                    className="relative w-full rounded-xl border border-rose-100 bg-rose-50/80 px-8 py-3 font-bold text-rose-600 shadow-sm transition-all duration-200 hover:bg-rose-100 hover:text-rose-700 hover:shadow active:scale-[0.98]"
                  >
                    Hủy tiến trình
                  </button>
                </>
              ) : crawlError ? (
                // Trạng thái Lỗi
                <>
                  <div className="relative mb-6 flex justify-center">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 rounded-full border-4 border-rose-100"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-rose-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MaterialIcon name="close" className="text-rose-500 text-3xl font-bold" />
                      </div>
                    </div>
                  </div>
                  <h1 className="relative mb-2 text-xl font-bold tracking-tight text-slate-800">Đã xảy ra lỗi</h1>
                  <p className="relative w-full text-sm leading-relaxed text-slate-600 mb-6">
                    {crawlError}
                  </p>
                  <button
                    onClick={() => setStep(2)}
                    className="relative w-full rounded-xl border border-slate-200 bg-slate-50/80 px-8 py-3 font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-100 hover:shadow active:scale-[0.98]"
                  >
                    Quay lại chọn nhóm
                  </button>
                </>
              ) : crawlResult?.success ? (
                // Trạng thái Thành Công
                <>
                  <div className="relative mb-6 flex justify-center">
                    <div className="relative h-16 w-16">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MaterialIcon name="check" className="text-emerald-500 text-3xl font-bold" />
                      </div>
                    </div>
                  </div>
                  <h1 className="relative mb-2 text-xl font-bold tracking-tight text-slate-800">Hoàn tất thu thập!</h1>
                  <p className="relative w-full text-sm leading-relaxed text-slate-600 mb-6 px-4">
                    Toàn bộ bài viết từ <strong>{selectedGroups.size} nhóm</strong> đã được xử lý và gửi thành công về hệ thống.
                  </p>
                  <button
                    onClick={() => onSuccess ? onSuccess() : onClose()}
                    className="relative w-full rounded-xl border border-emerald-100 bg-emerald-50/80 px-8 py-3 font-bold text-emerald-600 shadow-sm transition-all duration-200 hover:bg-emerald-100 hover:text-emerald-700 hover:shadow active:scale-[0.98]"
                  >
                    Đóng và xem kết quả
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* ── HIỂN THỊ FOOTER CHỈ KHI Ở BƯỚC 1 HOẶC 2 ── */}
        {step < 3 && (
          <div className="px-6 py-4 border-t border-[#E5E5E5] bg-white shrink-0 flex items-center gap-3">
            {step === 1 && (
              <>
                <button type="button" onClick={onClose} className="flex-1 border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] font-bold py-2.5 rounded-xl text-xs hover:bg-[#F5F5F5] transition cursor-pointer">
                  Hủy
                </button>
                <button type="button" onClick={() => setStep(2)} className="flex-1 font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer bg-[#E3000F] hover:bg-[#166FE5] text-white">
                  Tiếp theo <MaterialIcon name="arrow_forward" className="text-sm" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-[#E5E5E5] text-[#666666] hover:text-[#1A1A1A] font-bold py-2.5 rounded-xl text-xs hover:bg-[#F5F5F5] transition cursor-pointer">
                  Quay lại
                </button>
                <button type="button" onClick={handleStartCrawl} disabled={selectedGroups.size === 0} className={cn("flex-[2] font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2", selectedGroups.size === 0 ? "bg-[#F5F5F5] text-[#A0A0A0] cursor-not-allowed" : "bg-[#E3000F] hover:bg-[#166FE5] text-white cursor-pointer")}>
                  <FaFacebook size={12} /> Bắt đầu cào {selectedGroups.size > 0 ? `(${selectedGroups.size} nhóm)` : ""}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}