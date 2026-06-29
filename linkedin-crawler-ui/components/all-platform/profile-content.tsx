"use client";

import { useCallback, useState } from "react";
import { MaterialIcon, type MaterialSymbolName } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { cn } from "@/lib/utils";
import { authService } from "@/services/all-platform.service";

type Tab = "personal" | "password";
type Notice = { type: "success" | "error"; text: string };

export function ProfileContent() {
  const { user, refreshUser, logout } = useAppAuth();
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  // Personal state
  const [editName, setEditName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Notice | null>(null);

  // Password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<Notice | null>(null);

  // Deactivate state
  const [deactivatePw, setDeactivatePw] = useState("");
  const [showDeactivatePw, setShowDeactivatePw] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateMsg, setDeactivateMsg] = useState<Notice | null>(null);

  const handleSaveProfile = useCallback(async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await authService.updateProfile({
        name: editName.trim() || undefined,
      });
      if (res.success) {
        setProfileMsg({ type: "success", text: "Đã lưu thông tin cá nhân." });
        await refreshUser();
      } else {
        setProfileMsg({ type: "error", text: res.message || "Lưu thất bại." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Lỗi kết nối server." });
    } finally {
      setSavingProfile(false);
    }
  }, [editName, refreshUser]);

  const handleChangePassword = useCallback(async () => {
    setPwMsg(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: "error", text: "Vui lòng điền đầy đủ các trường." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "Mật khẩu mới và xác nhận không khớp." });
      return;
    }
    if (currentPw === newPw) {
      setPwMsg({ type: "error", text: "Mật khẩu mới phải khác mật khẩu hiện tại." });
      return;
    }

    setSavingPw(true);
    try {
      const res = await authService.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      if (res.success) {
        setPwMsg({
          type: "success",
          text: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
        });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
        setTimeout(() => {
          void logout();
        }, 2000);
      } else {
        setPwMsg({
          type: "error",
          text: res.message || "Đổi mật khẩu thất bại.",
        });
      }
    } catch {
      setPwMsg({ type: "error", text: "Lỗi kết nối server." });
    } finally {
      setSavingPw(false);
    }
  }, [currentPw, newPw, confirmPw, logout]);

  const handleDeactivate = useCallback(async () => {
    setDeactivateMsg(null);
    if (!deactivatePw) {
      setDeactivateMsg({
        type: "error",
        text: "Vui lòng nhập mật khẩu để xác nhận.",
      });
      return;
    }
    if (
      !window.confirm(
        "Bạn có chắc muốn vô hiệu hóa tài khoản này? Hành động này không thể hoàn tác.",
      )
    ) {
      return;
    }

    setDeactivating(true);
    try {
      const res = await authService.deactivateAccount({ password: deactivatePw });
      if (res.success) {
        setDeactivateMsg({
          type: "success",
          text: "Tài khoản đã bị vô hiệu hóa. Đang chuyển hướng...",
        });
        setTimeout(() => {
          void logout();
        }, 2000);
      } else {
        setDeactivateMsg({
          type: "error",
          text: res.message || "Vô hiệu hóa thất bại.",
        });
      }
    } catch {
      setDeactivateMsg({ type: "error", text: "Lỗi kết nối server." });
    } finally {
      setDeactivating(false);
    }
  }, [deactivatePw, logout]);

  const TABS: { key: Tab; label: string; icon: MaterialSymbolName }[] = [
    { key: "personal", label: "Thông tin cá nhân", icon: "person" },
    { key: "password", label: "Đổi mật khẩu", icon: "lock" },
  ];

  const createdAtLabel = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  return (
    <div className="mx-auto w-full max-w-[1100px] min-w-0 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-[#E3000F]/10 p-3">
          <MaterialIcon name="person" className="text-[#E3000F] text-3xl" />
        </div>
        <div>
          <h1 className="text-h1 text-[#1A1A1A] font-semibold">Trang cá nhân</h1>
          <p className="text-body-md text-[#666666]">
            Quản lý thông tin cá nhân và cài đặt bảo mật tài khoản
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] overflow-x-auto whitespace-nowrap">
        <div className="flex gap-8 px-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider cursor-pointer",
                  active
                    ? "border-[#E3000F] text-[#E3000F]"
                    : "border-transparent text-[#A0A0A0] hover:text-[#E3000F]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: Personal */}
      {activeTab === "personal" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 min-w-0 space-y-6">
            {/* Personal info */}
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 space-y-6 shadow-sm">
              <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-[#E5E5E5] pb-3 flex items-center gap-2">
                <MaterialIcon name="person" className="text-[#E3000F]" />
                Chi tiết tài khoản
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Email đăng nhập
                  </label>
                  <input
                    className="w-full px-4 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#A0A0A0] focus:ring-[#E3000F]/20 focus:border-[#E3000F] cursor-not-allowed"
                    readOnly
                    type="text"
                    value={user?.email ?? ""}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Họ tên hiển thị
                  </label>
                  <input
                    className="w-full px-4 py-2 bg-[#F5F5F5]/30 border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition-all"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Vai trò hệ thống
                  </label>
                  <div className="pt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F5F5F5] text-[#666666] text-[9px] uppercase border border-[#E5E5E5] font-bold tracking-wider">
                      {user?.role ?? "member"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    Ngày đăng ký
                  </label>
                  <p className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-2 pt-1.5">
                    <MaterialIcon
                      name="calendar_today"
                      className="text-xs text-[#A0A0A0]"
                    />
                    {createdAtLabel}
                  </p>
                </div>
              </div>

              {profileMsg && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-xs font-medium",
                    profileMsg.type === "success"
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-[#FF3344]/10 text-[#FF3344] border-[#FF3344]/20",
                  )}
                >
                  {profileMsg.text}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-[#E3000F] hover:bg-[#C40009] text-white font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-xl border border-red-100 bg-white p-6 space-y-6 shadow-sm">
              <h2 className="text-sm font-bold text-red-600 border-b border-red-50 pb-3 flex items-center gap-2">
                <MaterialIcon name="warning" className="text-red-500" />
                Vô hiệu hóa tài khoản
              </h2>
              <p className="text-xs text-[#666666] leading-relaxed">
                Việc vô hiệu hóa tài khoản sẽ khiến bạn không thể truy cập vào hệ thống nữa.
                Hành động này không thể hoàn tác, vui lòng cẩn thận.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                  Mật khẩu xác nhận
                </label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-2 bg-[#F5F5F5]/30 border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] focus:ring-error focus:border-error pr-12 transition-all"
                    type={showDeactivatePw ? "text" : "password"}
                    placeholder="••••••••"
                    value={deactivatePw}
                    onChange={(e) => setDeactivatePw(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeactivatePw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <MaterialIcon
                      name={showDeactivatePw ? "visibility_off" : "visibility"}
                      className="text-lg"
                    />
                  </button>
                </div>
              </div>

              {deactivateMsg && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-xs font-medium",
                    deactivateMsg.type === "success"
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-[#FF3344]/10 text-[#FF3344] border-[#FF3344]/20",
                  )}
                >
                  {deactivateMsg.text}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleDeactivate()}
                  disabled={deactivating}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deactivating ? "Đang xử lý..." : "Xác nhận vô hiệu hóa"}
                </button>
              </div>
            </div>
          </div>

          {/* Right notes */}
          <div className="col-span-12 lg:col-span-4 min-w-0">
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 sticky top-24 space-y-6 shadow-sm">
              <h3 className="text-xs font-bold text-[#1A1A1A] border-b border-[#E5E5E5] pb-2 flex items-center gap-2">
                <MaterialIcon name="verified_user" className="text-[#E3000F]" />
                An toàn & Bảo mật
              </h3>
              <ul className="space-y-4">
                {[
                  "Không chia sẻ tài khoản đăng nhập với bất kỳ ai để tránh rủi ro mất mát dữ liệu cào.",
                  "Khuyến nghị định kỳ thay đổi mật khẩu sau mỗi 30-60 ngày để đảm bảo an toàn.",
                  "Nếu nghi ngờ có hành vi truy cập bất thường, vui lòng thay đổi mật khẩu ngay lập tức.",
                ].map((t) => (
                  <li key={t} className="flex gap-2 min-w-0">
                    <MaterialIcon
                      name="check_circle"
                      className="text-green-500 shrink-0 text-sm mt-0.5"
                    />
                    <span className="text-xs text-[#666666] leading-normal">
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Password */}
      {activeTab === "password" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 min-w-0">
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 space-y-6 shadow-sm">
              <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-[#E5E5E5] pb-3 flex items-center gap-2">
                <MaterialIcon name="lock_reset" className="text-[#E3000F]" />
                Thay đổi mật khẩu đăng nhập
              </h2>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-4 py-2 bg-[#F5F5F5]/30 border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] pr-12 transition-all outline-none"
                        placeholder="••••••••"
                        type={showCurrent ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        <MaterialIcon
                          name={showCurrent ? "visibility_off" : "visibility"}
                          className="text-lg"
                        />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          className="w-full px-4 py-2 bg-[#F5F5F5]/30 border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] pr-12 transition-all outline-none"
                          placeholder="••••••••"
                          type={showNew ? "text" : "password"}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                        >
                          <MaterialIcon
                            name={showNew ? "visibility_off" : "visibility"}
                            className="text-lg"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        className="w-full px-4 py-2 bg-[#F5F5F5]/30 border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition-all outline-none"
                        placeholder="••••••••"
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {pwMsg && (
                  <div
                    className={cn(
                      "rounded-xl border px-4 py-3 text-xs font-medium",
                      pwMsg.type === "success"
                        ? "bg-green-50 text-green-800 border-green-200"
                        : "bg-[#FF3344]/10 text-[#FF3344] border-[#FF3344]/20",
                    )}
                  >
                    {pwMsg.text}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleChangePassword()}
                    disabled={savingPw}
                    className="px-4 py-2 bg-[#E3000F] hover:bg-[#C40009] text-white font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {savingPw ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 min-w-0">
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-[#1A1A1A] border-b border-[#E5E5E5] pb-2">
                Quy định mật khẩu
              </h3>
              <ul className="space-y-3">
                {[
                  "Phải chứa ít nhất 6 ký tự",
                  "Khuyến khích sử dụng chữ hoa, chữ thường và chữ số",
                  "Không trùng lặp với mật khẩu hiện tại",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 text-xs text-[#666666] font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E3000F] shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
