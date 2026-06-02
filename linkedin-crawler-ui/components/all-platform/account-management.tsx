"use client";

import { useEffect, useState } from "react";
import { FaLinkedin, FaPlus, FaLock } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { SocialAccountsManager } from "@/components/all-platform/social-accounts-manager";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/contexts/AppAuthContext";
import {
  linkedInAccountService,
  linkedInAuthService,
  type LinkedInAccount,
} from "@/services/all-platform.service";

type Tab = "crawl" | "social";

export function AccountManagementContent() {
  const { user } = useAppAuth();
  const [activeTab, setActiveTab] = useState<Tab>("crawl");

  // ── Crawl accounts state ────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);

  // ── Add/Edit modal ─────────────────────────────────────────────────────
  const [showCrawlForm, setShowCrawlForm] = useState(false);
  const [viewCrawlAccount, setViewCrawlAccount] = useState<LinkedInAccount | null>(null);
  const [formId, setFormId] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showCrawlPassword, setShowCrawlPassword] = useState(false);

  // ── Verify modal ───────────────────────────────────────────────────────
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyAccount, setVerifyAccount] = useState<LinkedInAccount | null>(null);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");
  const [pendingSessionId, setPendingSessionId] = useState("");
  const [checkpointUrl, setCheckpointUrl] = useState("");
  const [stepVerify, setStepVerify] = useState<"initiate" | "loading" | "otp" | "done">("initiate");

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const res = await linkedInAccountService.getAll();
      if (res.success && res.data) {
        setAccounts(res.data);
        setHasCreds(res.data.length > 0);
      }
    } catch (error) {
      console.error("Failed to load accounts", error);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => { void fetchAccounts(); }, []);

  // ── Add/Edit handlers ────────────────────────────────────────────────────
  const handleOpenAddCrawl = () => {
    setFormId(""); setFormEmail(""); setFormPassword(""); setFormError("");
    setShowCrawlPassword(false); setShowCrawlForm(true);
  };

  const handleOpenEditCrawl = (acc: LinkedInAccount) => {
    setFormId(acc.id); setFormEmail(acc.email_linkedin); setFormPassword("");
    setFormError(""); setShowCrawlPassword(false); setShowCrawlForm(true);
    setViewCrawlAccount(null);
  };

  const handleSaveCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) { setFormError("Vui lòng nhập Email LinkedIn"); return; }
    if (!formId && !formPassword.trim()) { setFormError("Vui lòng nhập Mật khẩu cho tài khoản mới"); return; }

    setFormSaving(true); setFormError("");
    try {
      if (formId) {
        const payload: any = { email_linkedin: formEmail.trim() };
        if (formPassword) payload.password = formPassword;
        const res = await linkedInAccountService.update(formId, payload);
        if (res.success) { await fetchAccounts(); setShowCrawlForm(false); }
        else { setFormError(res.message || "Cập nhật thất bại"); }
      } else {
        const res = await linkedInAccountService.create({
          email_member: user?.email || "unknown",
          email_linkedin: formEmail.trim(),
          password: formPassword,
        });
        if (res.success) { await fetchAccounts(); setShowCrawlForm(false); }
        else { setFormError(res.message || "Thêm thất bại"); }
      }
    } catch (err: any) { setFormError(err.message || "Lỗi mạng"); }
    finally { setFormSaving(false); }
  };

  const handleDeleteCrawl = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản cào LinkedIn này?")) return;
    try {
      const res = await linkedInAccountService.delete(id);
      if (res.success) { await fetchAccounts(); }
      else { alert(res.message || "Xóa thất bại"); }
    } catch { alert("Lỗi mạng"); }
  };

  // ── Verify handlers ─────────────────────────────────────────────────────
  const handleOpenVerify = async (acc: LinkedInAccount) => {
    setVerifyAccount(acc);
    setVerifyError(""); setVerifySuccess(""); setVerifyOtp("");
    setPendingSessionId(""); setCheckpointUrl("");
    setStepVerify("initiate");
    setVerifyModalOpen(true);
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSessionId || !verifyOtp.trim()) {
      setVerifyError("Vui lòng nhập mã OTP.");
      return;
    }
    setVerifyLoading(true); setVerifyError("");
    try {
      const res = await linkedInAuthService.verifyOtp({
        pending_session_id: pendingSessionId,
        otp_code: verifyOtp.trim(),
        checkpoint_url: checkpointUrl || undefined,
      });
      if (res.success) {
        setVerifySuccess("Xác minh OTP thành công! Tài khoản đã sẵn sàng để cào dữ liệu.");
        setStepVerify("done");
      } else {
        setVerifyError(res.message || "Xác minh OTP thất bại");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Lỗi xác minh");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLoginAndGetCheckpoint = async (password: string) => {
    if (!verifyAccount) return;
    setVerifyLoading(true); setVerifyError("");
    setStepVerify("loading");
    try {
      const res = await linkedInAuthService.login({
        email: verifyAccount.email_linkedin,
        password: password,
      });
      if (res.success && res.data) {
        if (res.data.status === "need_otp") {
          setPendingSessionId(res.data.session_id || "");
          setCheckpointUrl(res.data.checkpoint_url || "");
          setStepVerify("otp");
        } else if (res.data.status === "success") {
          setVerifySuccess("Đăng nhập thành công! Tài khoản đã sẵn sàng.");
          setStepVerify("done");
        }
      } else {
        setVerifyError(res.message || "Đăng nhập thất bại");
        setStepVerify("initiate");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Lỗi đăng nhập");
      setStepVerify("initiate");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] min-w-0 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-[#E3000F]/10 p-3">
          <MaterialIcon name="manage_accounts" className="text-[#E3000F] text-3xl" />
        </div>
        <div>
          <h1 className="text-h1 text-[#1A1A1A] font-semibold">Quản lý tài khoản</h1>
          <p className="text-body-md text-[#A0A0A0]">
            Cấu hình danh sách tài khoản mạng xã hội và thông tin cào dữ liệu tự động
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E5E5] overflow-x-auto whitespace-nowrap">
        <div className="flex gap-8 px-2">
          {(["crawl", "social"] as Tab[]).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={cn("py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider cursor-pointer",
                activeTab === tab
                  ? "border-[#E3000F] text-[#E3000F]"
                  : "border-transparent text-[#666666] hover:text-[#E3000F]")}>
              {tab === "crawl" ? "Tài khoản cào dữ liệu" : "Tài khoản mạng xã hội"}
            </button>))}
        </div>
      </div>

      {/* TAB Content */}
      <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-sm space-y-6">
        {activeTab === "crawl" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">Danh sách tài khoản cào LinkedIn</h2>
                <p className="text-xs text-[#666666]">Các tài khoản dùng cho tính năng cào dữ liệu lưu trên hệ thống Supabase</p>
              </div>
              <button type="button" onClick={handleOpenAddCrawl}
                className="flex items-center gap-1.5 bg-[#E3000F] hover:bg-[#C40009] text-white px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer">
                <FaPlus size={10} /> Thêm tài khoản
              </button>
            </div>

            {accountsLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#E3000F] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[#666666] text-xs">Đang tải dữ liệu...</p>
              </div>
            ) : !hasCreds ? (
              <div className="text-center py-12 bg-[#F5F5F5]/50 rounded-xl border border-dashed border-[#E5E5E5]">
                <MaterialIcon name="group_add" className="text-4xl text-[#A0A0A0] mx-auto mb-2" />
                <p className="text-[#666666] text-xs">Chưa có tài khoản LinkedIn nào được cấu hình</p>
                <button onClick={handleOpenAddCrawl} className="mt-3 text-[#E3000F] text-xs font-bold hover:underline cursor-pointer">
                  + Thêm tài khoản ngay
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nền tảng</th>
                      <th className="py-3 px-4">Tài khoản cào</th>
                      <th className="py-3 px-4">Người sở hữu</th>
                      <th className="py-3 px-4 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] text-[#666666]">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-[#F5F5F5]/30 transition">
                        <td className="py-3.5 px-4 font-bold text-[#1A1A1A] flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0077B5]/10 text-[#0077B5] flex items-center justify-center text-[10px]">
                            <FaLinkedin size={12} />
                          </span>
                          <span>LinkedIn</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#666666] font-mono text-[11px] font-bold">
                          {acc.email_linkedin}
                        </td>
                        <td className="py-3.5 px-4 text-[#A0A0A0] text-[11px]">
                          {acc.email_member}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Xác minh */}
                            <button onClick={() => void handleOpenVerify(acc)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[#E3000F] bg-[#E3000F]/10 hover:bg-[#E3000F]/20 rounded-lg transition text-[10px] font-bold cursor-pointer border border-[#E3000F]/20"
                              title="Xác minh tài khoản (OTP)">
                              <FaLock size={11} />
                              Xác minh
                            </button>
                            {/* Xem chi tiết */}
                            <button onClick={() => setViewCrawlAccount(acc)}
                              className="p-1.5 text-[#666666] hover:bg-[#F5F5F5] rounded-lg transition cursor-pointer"
                              title="Xem chi tiết">
                              <MaterialIcon name="visibility" className="text-base" />
                            </button>
                            {/* Sửa */}
                            <button onClick={() => handleOpenEditCrawl(acc)}
                              className="p-1.5 text-[#E3000F] hover:bg-[#F5F5F5] rounded-lg transition cursor-pointer"
                              title="Sửa">
                              <MaterialIcon name="edit" className="text-base" />
                            </button>
                            {/* Xóa */}
                            <button onClick={() => void handleDeleteCrawl(acc.id)}
                              className="p-1.5 text-[#FF3344] hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Xóa">
                              <MaterialIcon name="delete" className="text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>)}
          </div>
        ) : (
          <SocialAccountsManager />
        )}
      </div>

      {/* ── View Details Modal ─────────────────────────────────────── */}
      {viewCrawlAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200">
          <div style={{ width: "100%", maxWidth: "448px" }}
            className="bg-white rounded-2xl border border-[#E5E5E5] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F5F5]/50">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="text-lg">ℹ️</span> Chi tiết tài khoản cào
              </h3>
              <button onClick={() => setViewCrawlAccount(null)}
                className="text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-lg p-1.5 transition cursor-pointer">
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              {[
                ["Nền tảng", <span key="p" className="font-bold text-[#1A1A1A]">LinkedIn</span>],
                ["Email đăng nhập", <span key="e" className="font-mono font-bold text-[#1A1A1A]">{viewCrawlAccount.email_linkedin}</span>],
                ["Mật khẩu cào", <span key="pw" className="italic text-[#A0A0A0]">(Đã mã hóa trong database)</span>],
                ["Người sở hữu", <span key="o" className="text-[#666666]">{viewCrawlAccount.email_member}</span>],
                ["Ngày tạo", <span key="d" className="font-mono">{new Date(viewCrawlAccount.created_at).toLocaleString("vi-VN")}</span>],
              ].map(([label, value], i) => (
                <div key={i} className={cn("flex items-start gap-3 py-2", i < 4 && "border-b border-[#F5F5F5]")}>
                  <span className="text-[#A0A0A0] font-medium shrink-0 w-32">{label}</span>
                  <div className="flex-1 min-w-0">{value}</div>
                </div>))}
            </div>
            <div className="px-6 py-4 bg-[#F5F5F5]/50 flex justify-end gap-2 border-t border-[#E5E5E5]">
              <button onClick={() => setViewCrawlAccount(null)}
                className="px-4 py-2 bg-[#FFFFFF] border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#666666] hover:text-[#1A1A1A] rounded-xl text-xs font-semibold transition cursor-pointer">
                Đóng
              </button>
              <button onClick={() => handleOpenEditCrawl(viewCrawlAccount)}
                className="px-4 py-2 bg-[#E3000F] hover:bg-[#C40009] text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer">
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>)}

      {/* ── Add/Edit Form Modal ────────────────────────────────────── */}
      {showCrawlForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200">
          <div style={{ width: "100%", maxWidth: "448px" }}
            className="bg-white rounded-2xl border border-[#E5E5E5] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F5F5]/50">
              <h3 className="font-bold text-[#1A1A1A]">
                {formId ? "Cập nhật tài khoản cào" : "Thêm tài khoản cào LinkedIn"}
              </h3>
              <button onClick={() => setShowCrawlForm(false)}
                className="text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-lg p-1.5 transition cursor-pointer">
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleSaveCrawl} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <MaterialIcon name="error" className="text-sm" /> {formError}
                </div>)}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                  Email LinkedIn <span className="text-[#E3000F]">*</span>
                </label>
                <input type="email" required placeholder="name@example.com" value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition" />
              </div>
              <div className="space-y-1 relative">
                <label className="block text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                  Mật khẩu cào {formId ? "" : <span className="text-[#E3000F]">*</span>}
                </label>
                <input type={showCrawlPassword ? "text" : "password"} required={!formId}
                  placeholder={formId ? "Để trống nếu không đổi mật khẩu" : "Mật khẩu tài khoản LinkedIn"}
                  value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition pr-10" />
                <button type="button" onClick={() => setShowCrawlPassword(!showCrawlPassword)}
                  className="absolute right-3 top-7 text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                  aria-label={showCrawlPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {showCrawlPassword ? <span className="text-[11px]">🙈</span> : <span className="text-[11px]">👁️</span>}
                </button>
              </div>
              <div className="flex gap-3 pt-3 border-t border-[#E5E5E5]">
                <button type="button" disabled={formSaving} onClick={() => setShowCrawlForm(false)}
                  className="flex-1 border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#666666] hover:text-[#1A1A1A] font-bold py-2 rounded-xl text-xs transition cursor-pointer">
                  Hủy
                </button>
                <button type="submit" disabled={formSaving}
                  className="flex-1 bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center">
                  {formSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : formId ? "Cập nhật" : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* ── Verify / OTP Modal ─────────────────────────────────────── */}
      {verifyModalOpen && verifyAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-200">
          <div style={{ width: "100%", maxWidth: "440px" }}
            className="bg-white rounded-2xl border border-[#E5E5E5] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F5F5]/50">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                <FaLock className="text-[#E3000F]" size={18} />
                Xác minh tài khoản cào
              </h3>
              <button onClick={() => { setVerifyModalOpen(false); setVerifyError(""); setVerifySuccess(""); }}
                className="text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded-lg p-1.5 transition cursor-pointer">
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>

            {stepVerify === "done" ? (
              /* Success state */
              <div className="p-6 space-y-4 text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <MaterialIcon name="check_circle" className="text-green-500 text-4xl" />
                </div>
                <p className="text-sm font-bold text-[#1A1A1A]">{verifySuccess}</p>
                <button onClick={() => { setVerifyModalOpen(false); setStepVerify("loading"); setVerifyError(""); setVerifySuccess(""); }}
                  className="px-6 py-2.5 bg-[#E3000F] hover:bg-[#C40009] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
                  Đóng
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Account info */}
                <div className="bg-[#F5F5F5] rounded-xl p-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#0077B5]/10 text-[#0077B5] flex items-center justify-center shrink-0">
                    <FaLinkedin size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{verifyAccount.email_linkedin}</p>
                    <p className="text-[10px] text-[#A0A0A0]">{verifyAccount.email_member}</p>
                  </div>
                </div>

                {/* Error */}
                {verifyError && (
                  <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <MaterialIcon name="error" className="text-sm shrink-0" /> {verifyError}
                  </div>)}

                {stepVerify === "loading" ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-14 h-14 border-4 border-[#F5F5F5] border-t-[#E3000F] rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-bold text-[#1A1A1A]">Hệ thống đang chạy Playwright ngầm...</p>
                    <p className="text-[11px] text-[#666666]">
                      Quá trình đăng nhập và vượt rào cản có thể mất từ 30s đến 1 phút.<br/>
                      Vui lòng giữ nguyên trang và không đóng hộp thoại này.
                    </p>
                  </div>
                ) : stepVerify === "otp" ? (
                  /* Step 2: OTP input */
                  <form onSubmit={handleSubmitOtp} className="space-y-3">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-[#1A1A1A]">Nhập mã xác minh OTP</p>
                      <p className="text-[10px] text-[#666666]">
                        Mã xác minh đã được gửi đến {verifyAccount.email_linkedin} hoặc điện thoại đã đăng ký
                      </p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-center text-2xl tracking-[0.5em] font-mono font-bold text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition letter-spacing-wider"
                      autoFocus />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStepVerify("initiate")}
                        className="flex-1 border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#666666] font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">
                        ← Quay lại
                      </button>
                      <button type="submit" disabled={verifyLoading || verifyOtp.trim().length < 6}
                        className="flex-[2] bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                        {verifyLoading
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><FaLock size={12} /> Xác minh</>}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Step 1: Password input to initiate login */
                  <LoginStep
                    onSubmit={handleLoginAndGetCheckpoint}
                    loading={verifyLoading}
                    error={verifyError}
                    onError={(msg) => setVerifyError(msg)} />
                )}
              </div>
            )}
          </div>
        </div>)}

    </div>
  );
}

// ── Login Step Component ───────────────────────────────────────────────────────

function LoginStep({
  onSubmit,
  loading,
  onError,
}: {
  onSubmit: (password: string) => Promise<void>;
  loading: boolean;
  error: string;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onError(""); void onSubmit(password); }}
      className="space-y-3">
      <div className="text-center space-y-1">
        <p className="text-xs font-bold text-[#1A1A1A]">Đăng nhập để xác minh</p>
        <p className="text-[10px] text-[#666666]">
          Nhập mật khẩu LinkedIn để bắt đầu quy trình xác minh OTP (nếu có)
        </p>
      </div>
      <div className="relative">
        <input type="password" placeholder="Mật khẩu LinkedIn"
          value={password}
          onChange={(e) => { setPassword(e.target.value); onError(""); }}
          className="w-full px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition" />
      </div>
      <button type="submit" disabled={loading || !password.trim()}
        className="w-full bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
        {loading
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><FaLock size={12} /> Đăng nhập &amp; xác minh</>}
      </button>
    </form>
  );
}
