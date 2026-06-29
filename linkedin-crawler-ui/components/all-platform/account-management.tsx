"use client";

import { useEffect, useState } from "react";
import { FaLinkedin, FaPlus, FaLock } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { SocialAccountsManager } from "@/components/all-platform/social-accounts-manager";
import { FbInboxAccountsTab } from "@/components/all-platform/accounts/FbInboxAccountsTab";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/contexts/AppAuthContext";
import {
  linkedInAccountService,
  linkedInAuthService,
  type LinkedInAccount,
} from "@/services/all-platform.service";

type Tab = "crawl" | "social" | "fb_inbox";

export function AccountManagementContent() {
  const { user } = useAppAuth();
  const [activeTab, setActiveTab] = useState<Tab>("crawl");

  // â”€â”€ Crawl accounts state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);

  // â”€â”€ Add/Edit modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showCrawlForm, setShowCrawlForm] = useState(false);
  const [viewCrawlAccount, setViewCrawlAccount] = useState<LinkedInAccount | null>(null);
  const [formId, setFormId] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showCrawlPassword, setShowCrawlPassword] = useState(false);

  // â”€â”€ Verify modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Add/Edit handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (!formEmail.trim()) { setFormError("Vui lÃ²ng nháº­p Email LinkedIn"); return; }
    if (!formId && !formPassword.trim()) { setFormError("Vui lÃ²ng nháº­p Máº­t kháº©u cho tÃ i khoáº£n má»›i"); return; }

    setFormSaving(true); setFormError("");
    try {
      if (formId) {
        const payload: any = { email_linkedin: formEmail.trim() };
        if (formPassword) payload.password = formPassword;
        const res = await linkedInAccountService.update(formId, payload);
        if (res.success) { await fetchAccounts(); setShowCrawlForm(false); }
        else { setFormError(res.message || "Cáº­p nháº­t tháº¥t báº¡i"); }
      } else {
        const res = await linkedInAccountService.create({
          email_member: user?.email || "unknown",
          email_linkedin: formEmail.trim(),
          password: formPassword,
        });
        if (res.success) { await fetchAccounts(); setShowCrawlForm(false); }
        else { setFormError(res.message || "ThÃªm tháº¥t báº¡i"); }
      }
    } catch (err: any) { setFormError(err.message || "Lá»—i máº¡ng"); }
    finally { setFormSaving(false); }
  };

  const handleDeleteCrawl = async (id: string) => {
    if (!confirm("Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a tÃ i khoáº£n cÃ o LinkedIn nÃ y?")) return;
    try {
      const res = await linkedInAccountService.delete(id);
      if (res.success) { await fetchAccounts(); }
      else { alert(res.message || "XÃ³a tháº¥t báº¡i"); }
    } catch { alert("Lá»—i máº¡ng"); }
  };

  // â”€â”€ Verify handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      setVerifyError("Vui lÃ²ng nháº­p mÃ£ OTP.");
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
        setVerifySuccess("XÃ¡c minh OTP thÃ nh cÃ´ng! TÃ i khoáº£n Ä‘Ã£ sáºµn sÃ ng Ä‘á»ƒ cÃ o dá»¯ liá»‡u.");
        setStepVerify("done");
      } else {
        setVerifyError(res.message || "XÃ¡c minh OTP tháº¥t báº¡i");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Lá»—i xÃ¡c minh");
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
          setVerifySuccess("ÄÄƒng nháº­p thÃ nh cÃ´ng! TÃ i khoáº£n Ä‘Ã£ sáºµn sÃ ng.");
          setStepVerify("done");
        }
      } else {
        setVerifyError(res.message || "ÄÄƒng nháº­p tháº¥t báº¡i");
        setStepVerify("initiate");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Lá»—i Ä‘Äƒng nháº­p");
      setStepVerify("initiate");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] min-w-0 space-y-6 bg-white font-sans">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E3000F]/10">
          <MaterialIcon name="manage_accounts" className="text-[#E3000F] text-3xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Quản lý tài khoản</h1>
          <p className="text-sm text-slate-500">
            Cấu hình danh sách tài khoản mạng xã hội và thông tin cào dữ liệu tự động
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-100 bg-white p-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(["crawl", "social", "fb_inbox"] as Tab[]).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={cn("min-h-[44px] rounded-xl px-3 py-2 text-center text-[11px] font-semibold leading-tight transition-all cursor-pointer sm:text-xs",
                activeTab === tab
                  ? "bg-[#DC2626] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
              {tab === "crawl" ? "Tài khoản cào dữ liệu" : tab === "social" ? "Tài khoản mạng xã hội" : "Tài khoản FB & KPI"}
            </button>))}
        </div>
      </div>

      {/* TAB Content */}
      <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-none sm:p-6">
        {activeTab === "crawl" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">Danh sách tài khoản cào LinkedIn</h2>
                <p className="text-xs text-[#666666]">Các tài khoản dùng cho tính năng cào dữ liệu lưu trên hệ thống Supabase</p>
              </div>
              <button type="button" onClick={handleOpenAddCrawl}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#B91C1C] cursor-pointer">
                <FaPlus size={10} /> Thêm tài khoản
              </button>
            </div>

            {accountsLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-[#E5E5E5] border-t-[#E3000F] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[#666666] text-xs">Äang táº£i dá»¯ liá»‡u...</p>
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
              <>
                <div className="space-y-3 md:hidden">
                {accounts.map((acc) => (
                  <div key={acc.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0077B5]/10 text-[#0077B5]">
                            <FaLinkedin size={12} />
                          </span>
                          <span>LinkedIn</span>
                        </div>
                        <p className="mt-2 truncate font-mono text-[11px] font-semibold text-slate-700">
                          {acc.email_linkedin}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">{acc.email_member}</p>
                      </div>
                      <button
                        onClick={() => void handleOpenVerify(acc)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#DC2626]"
                      >
                        <FaLock size={10} />
                        Xác minh
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => setViewCrawlAccount(acc)}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Chi tiáº¿t
                      </button>
                      <button
                        onClick={() => handleOpenEditCrawl(acc)}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Sá»­a
                      </button>
                      <button
                        onClick={() => void handleDeleteCrawl(acc.id)}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-[#DC2626]"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white md:block">
                  <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[10px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Ná»n táº£ng</th>
                      <th className="py-3 px-4">Tài khoản cào</th>
                      <th className="py-3 px-4">NgÆ°á»i sá»Ÿ há»¯u</th>
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
                            {/* XÃ¡c minh */}
                            <button onClick={() => void handleOpenVerify(acc)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[#E3000F] bg-[#E3000F]/10 hover:bg-[#E3000F]/20 rounded-lg transition text-[10px] font-bold cursor-pointer border border-[#E3000F]/20"
                              title="XÃ¡c minh tÃ i khoáº£n (OTP)">
                              <FaLock size={11} />
                              XÃ¡c minh
                            </button>
                            {/* Xem chi tiáº¿t */}
                            <button onClick={() => setViewCrawlAccount(acc)}
                              className="p-1.5 text-[#666666] hover:bg-[#F5F5F5] rounded-lg transition cursor-pointer"
                              title="Xem chi tiáº¿t">
                              <MaterialIcon name="visibility" className="text-base" />
                            </button>
                            {/* Sá»­a */}
                            <button onClick={() => handleOpenEditCrawl(acc)}
                              className="p-1.5 text-[#E3000F] hover:bg-[#F5F5F5] rounded-lg transition cursor-pointer"
                              title="Sá»­a">
                              <MaterialIcon name="edit" className="text-base" />
                            </button>
                            {/* XÃ³a */}
                            <button onClick={() => void handleDeleteCrawl(acc.id)}
                              className="p-1.5 text-[#FF3344] hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="XÃ³a">
                              <MaterialIcon name="delete" className="text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>))}
                  </tbody>
                  </table>
                </div>
              </>)}
          </div>
        ) : activeTab === "social" ? (
          <SocialAccountsManager />
        ) : (
          <FbInboxAccountsTab />
        )}
      </div>

      {/* â”€â”€ View Details Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                Chá»‰nh sá»­a
              </button>
            </div>
          </div>
        </div>)}

      {/* â”€â”€ Add/Edit Form Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  aria-label={showCrawlPassword ? "áº¨n máº­t kháº©u" : "Hiá»‡n máº­t kháº©u"}>
                  {showCrawlPassword ? <span className="text-[11px]">ðŸ™ˆ</span> : <span className="text-[11px]">ðŸ‘ï¸</span>}
                </button>
              </div>
              <div className="flex gap-3 pt-3 border-t border-[#E5E5E5]">
                <button type="button" disabled={formSaving} onClick={() => setShowCrawlForm(false)}
                  className="flex-1 border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#666666] hover:text-[#1A1A1A] font-bold py-2 rounded-xl text-xs transition cursor-pointer">
                  Há»§y
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

      {/* â”€â”€ Verify / OTP Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    <p className="text-sm font-bold text-[#1A1A1A]">Há»‡ thá»‘ng Ä‘ang cháº¡y Playwright ngáº§m...</p>
                    <p className="text-[11px] text-[#666666]">
                      QuÃ¡ trÃ¬nh Ä‘Äƒng nháº­p vÃ  vÆ°á»£t rÃ o cáº£n cÃ³ thá»ƒ máº¥t tá»« 30s Ä‘áº¿n 1 phÃºt.<br/>
                      Vui lÃ²ng giá»¯ nguyÃªn trang vÃ  khÃ´ng Ä‘Ã³ng há»™p thoáº¡i nÃ y.
                    </p>
                  </div>
                ) : stepVerify === "otp" ? (
                  /* Step 2: OTP input */
                  <form onSubmit={handleSubmitOtp} className="space-y-3">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-[#1A1A1A]">Nháº­p mÃ£ xÃ¡c minh OTP</p>
                      <p className="text-[10px] text-[#666666]">
                        MÃ£ xÃ¡c minh Ä‘Ã£ Ä‘Æ°á»£c gá»­i Ä‘áº¿n {verifyAccount.email_linkedin} hoáº·c Ä‘iá»‡n thoáº¡i Ä‘Ã£ Ä‘Äƒng kÃ½
                      </p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      placeholder="â€¢ â€¢ â€¢ â€¢ â€¢ â€¢"
                      maxLength={6}
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-center text-2xl tracking-[0.5em] font-mono font-bold text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition letter-spacing-wider"
                      autoFocus />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStepVerify("initiate")}
                        className="flex-1 border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#666666] font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">
                        â† Quay láº¡i
                      </button>
                      <button type="submit" disabled={verifyLoading || verifyOtp.trim().length < 6}
                        className="flex-[2] bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                        {verifyLoading
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><FaLock size={12} /> XÃ¡c minh</>}
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

// â”€â”€ Login Step Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        <p className="text-xs font-bold text-[#1A1A1A]">ÄÄƒng nháº­p Ä‘á»ƒ xÃ¡c minh</p>
        <p className="text-[10px] text-[#666666]">
          Nháº­p máº­t kháº©u LinkedIn Ä‘á»ƒ báº¯t Ä‘áº§u quy trÃ¬nh xÃ¡c minh OTP (náº¿u cÃ³)
        </p>
      </div>
      <div className="relative">
        <input type="password" placeholder="Máº­t kháº©u LinkedIn"
          value={password}
          onChange={(e) => { setPassword(e.target.value); onError(""); }}
          className="w-full px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl text-xs text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition" />
      </div>
      <button type="submit" disabled={loading || !password.trim()}
        className="w-full bg-[#E3000F] hover:bg-[#C40009] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
        {loading
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><FaLock size={12} /> ÄÄƒng nháº­p &amp; xÃ¡c minh</>}
      </button>
    </form>
  );
}

