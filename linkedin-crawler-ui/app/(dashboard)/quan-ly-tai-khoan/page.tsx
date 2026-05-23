"use client";

import { useState, useEffect } from "react";
import { FaFacebook, FaLinkedin, FaEye, FaEyeSlash, FaSignOutAlt } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import { useDashboard } from "@/components/features/dashboard/dashboard-context";
import { useAuthContext } from "@/components/nguyen/shared/components/contexts/AuthContext";
import {
  loginLinkedIn,
  verifyLinkedInOtp,
  ensureProfileSlugIfMissing,
} from "@/services/linkedinCrawlerService";
import { AuthService } from "@/components/nguyen/modules/crawldFB/services/login";

export default function AccountManagementPage() {
  const d = useDashboard();
  const fbAuth = useAuthContext();

  // ----------------------------------------------------
  // STATE CHO LINKEDIN
  // ----------------------------------------------------
  const [liEmail, setLiEmail] = useState("");
  const [liPassword, setLiPassword] = useState("");
  const [liShowPassword, setLiShowPassword] = useState(false);
  const [liRole, setLiRole] = useState<"leader" | "member">("member");
  const [liLeaderCode, setLiLeaderCode] = useState("");
  const [liBusy, setLiBusy] = useState(false);
  const [liError, setLiError] = useState<string | null>(null);
  const [liSuccess, setLiSuccess] = useState<string | null>(null);
  const [liStatusMsg, setLiStatusMsg] = useState<string | null>(null);

  // OTP LinkedIn
  const [liPendingOtp, setLiPendingOtp] = useState(false);
  const [liOtpSessionId, setLiOtpSessionId] = useState<string | null>(null);
  const [liCheckpointUrl, setLiCheckpointUrl] = useState<string | null>(null);
  const [liOtpCode, setLiOtpCode] = useState("");

  // ----------------------------------------------------
  // STATE CHO FACEBOOK
  // ----------------------------------------------------
  const [fbEmail, setFbEmail] = useState("");
  const [fbPassword, setFbPassword] = useState("");
  const [fbShowPassword, setFbShowPassword] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbSuccess, setFbSuccess] = useState<string | null>(null);
  const [fbStatusMsg, setFbStatusMsg] = useState<string | null>(null);

  // OTP / Phê duyệt Facebook
  const [fbPendingOtp, setFbPendingOtp] = useState(false);
  const [fbSessionId, setFbSessionId] = useState<string | null>(null);
  const [fbOtpCode, setFbOtpCode] = useState("");

  // Khôi phục thông tin tài khoản hiện tại từ context/local khi mount
  useEffect(() => {
    if (d.email) {
      setLiEmail(d.email);
      setLiPassword(d.password);
      setLiRole(d.role || "member");
    }
    if (fbAuth.user?.email) {
      setFbEmail(fbAuth.user.email);
      setFbPassword(fbAuth.user.password || "");
    }
  }, [d.email, d.password, d.role, fbAuth.user]);

  // ----------------------------------------------------
  // XỬ LÝ XÁC THỰC LINKEDIN
  // ----------------------------------------------------
  const handleVerifyLinkedIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = liEmail.trim();
    const password = liPassword;

    if (!email || !password.trim()) {
      setLiError("Vui lòng nhập đầy đủ email và mật khẩu LinkedIn.");
      return;
    }

    setLiBusy(true);
    setLiError(null);
    setLiSuccess(null);
    setLiStatusMsg("Đang khởi tạo phiên đăng nhập LinkedIn...");

    try {
      const res = await loginLinkedIn({
        email,
        password,
        forceRelogin: true,
      });

      if (!res.success) {
        throw new Error(res.message || "Đăng nhập LinkedIn thất bại.");
      }

      const requiresOtp =
        res.need_otp === true ||
        res.login_step === "need_otp" ||
        ((res.checkpoint_url ?? "").trim().length > 0 &&
          (res.session_id ?? "").trim().length > 0);

      if (requiresOtp) {
        if (!res.session_id) {
          throw new Error("Không nhận được Session ID xác thực từ API.");
        }
        setLiOtpSessionId(res.session_id);
        setLiCheckpointUrl(res.checkpoint_url || null);
        setLiPendingOtp(true);
        setLiStatusMsg("LinkedIn yêu cầu mã OTP / xác minh 2 lớp.");
      } else {
        setLiStatusMsg("Đang đồng bộ hồ sơ cá nhân với Google Sheets...");
        try {
          await ensureProfileSlugIfMissing({
            email,
            sessionId: res.session_id,
          });
        } catch (slugErr) {
          console.warn("Lỗi khi kiểm tra profile slug:", slugErr);
        }

        await d.handleSwitchAccount(email, password, liRole, liLeaderCode);
        setLiSuccess("Tài khoản LinkedIn đã được xác thực và đồng bộ thành công!");
        setLiStatusMsg(null);
        setLiPassword("");
        setLiLeaderCode("");
      }
    } catch (err: any) {
      setLiError(err.message || "Lỗi không xác định khi đăng nhập LinkedIn.");
      setLiStatusMsg(null);
    } finally {
      setLiBusy(false);
    }
  };

  const handleVerifyLinkedInOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liOtpCode.trim() || !liOtpSessionId) {
      setLiError("Vui lòng điền đầy đủ mã OTP.");
      return;
    }

    setLiBusy(true);
    setLiError(null);
    setLiSuccess(null);
    setLiStatusMsg("Đang gửi mã xác thực OTP LinkedIn...");

    try {
      const verifyRes = await verifyLinkedInOtp({
        sessionId: liOtpSessionId,
        otp: liOtpCode.trim(),
        checkpointUrl: liCheckpointUrl || undefined,
      });

      if (!verifyRes.success) {
        throw new Error(verifyRes.message || "Mã OTP không chính xác.");
      }

      setLiStatusMsg("Đang đồng bộ hồ sơ cá nhân LinkedIn...");
      try {
        await ensureProfileSlugIfMissing({
          email: liEmail.trim(),
          sessionId: verifyRes.session_id || liOtpSessionId,
        });
      } catch (slugErr) {
        console.warn("Lỗi khi kiểm tra profile slug sau OTP:", slugErr);
      }

      await d.handleSwitchAccount(liEmail.trim(), liPassword, liRole, liLeaderCode);
      setLiSuccess("Xác thực OTP LinkedIn và đồng bộ tài khoản thành công!");
      setLiPendingOtp(false);
      setLiOtpCode("");
      setLiOtpSessionId(null);
      setLiCheckpointUrl(null);
      setLiStatusMsg(null);
      setLiPassword("");
      setLiLeaderCode("");
    } catch (err: any) {
      setLiError(err.message || "Xác thực mã OTP LinkedIn thất bại.");
      setLiStatusMsg(null);
    } finally {
      setLiBusy(false);
    }
  };

  const handleLogoutLinkedIn = () => {
    localStorage.removeItem("linkedin_crawler_role");
    localStorage.removeItem("linkedin_crawler_email");
    localStorage.removeItem("linkedin_crawler_password");
    d.setEmail("");
    d.setPassword("");
    d.setRole("member");
    setLiEmail("");
    setLiPassword("");
    setLiSuccess("Đã đăng xuất tài khoản LinkedIn.");
  };

  // ----------------------------------------------------
  // XỬ LÝ XÁC THỰC FACEBOOK
  // ----------------------------------------------------
  const handleVerifyFacebook = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = fbEmail.trim();
    const password = fbPassword;

    if (!email || !password.trim()) {
      setFbError("Vui lòng nhập đầy đủ email và mật khẩu Facebook.");
      return;
    }

    setFbBusy(true);
    setFbError(null);
    setFbSuccess(null);
    setFbStatusMsg("Đang khởi tạo phiên đăng nhập Facebook...");

    try {
      const res = await AuthService.login({ email, password });

      if (res.status === "success") {
        fbAuth.saveUserSession(email, password);
        setFbSuccess("Tài khoản Facebook đã được xác thực và lưu thành công!");
        setFbStatusMsg(null);
        setFbPassword("");
      } 
      else if (res.status === "need_otp" && res.session_id) {
        setFbSessionId(res.session_id);
        setFbPendingOtp(true);
        setFbStatusMsg("Facebook yêu cầu mã OTP xác thực 2FA.");
        setFbBusy(false);
      } 
      else if ((res.status === "need_phone_approval" || res.status === "processing") && res.session_id) {
        const sessionId = res.session_id;
        setFbSessionId(sessionId);

        if (res.status === "need_phone_approval") {
          setFbStatusMsg("Vui lòng MỞ ĐIỆN THOẠI bấm xác nhận 'Đây là tôi'. Đang chờ phê duyệt (tối đa 60s)...");
        } else {
          setFbStatusMsg("Facebook đang tải tiến trình đăng nhập ngầm, vui lòng đợi...");
        }

        // Bắt đầu Polling kiểm tra trạng thái phê duyệt trên điện thoại (mỗi 4 giây)
        let secondsPassed = 0;
        const interval = setInterval(async () => {
          secondsPassed += 4;
          if (secondsPassed >= 60) {
            clearInterval(interval);
            setFbError("Đã hết thời gian chờ phê duyệt trên điện thoại. Vui lòng thử lại.");
            setFbStatusMsg(null);
            setFbBusy(false);
            return;
          }

          try {
            const approvalRes = await AuthService.checkPhoneApproval(sessionId);

            if (approvalRes.status === "success") {
              clearInterval(interval);
              fbAuth.saveUserSession(email, password);
              setFbSuccess("Phê duyệt thành công! Tài khoản Facebook đã được liên kết.");
              setFbStatusMsg(null);
              setFbPassword("");
              setFbBusy(false);
            } 
            else if (approvalRes.status === "need_otp") {
              clearInterval(interval);
              setFbPendingOtp(true);
              setFbStatusMsg("Cần cung cấp mã OTP 2FA cho Facebook.");
              setFbBusy(false);
            } 
            else if (approvalRes.status === "error_bot_blocked") {
              clearInterval(interval);
              setFbError("Đăng nhập thất bại: Facebook chặn xác minh Bot/CAPTCHA.");
              setFbStatusMsg(null);
              setFbBusy(false);
            } 
            else if (approvalRes.status === "error") {
              clearInterval(interval);
              setFbError(approvalRes.message || "Xác thực phê duyệt thất bại.");
              setFbStatusMsg(null);
              setFbBusy(false);
            }
          } catch (err) {
            clearInterval(interval);
            setFbError("Lỗi kết nối trong quá trình kiểm tra phê duyệt điện thoại.");
            setFbStatusMsg(null);
            setFbBusy(false);
          }
        }, 4000);
      } 
      else if (res.status === "error_bot_blocked") {
        throw new Error("Đăng nhập thất bại: Tài khoản bị Facebook chặn xác minh Bot/CAPTCHA.");
      } 
      else {
        throw new Error(res.message || "Sai email hoặc mật khẩu Facebook.");
      }
    } catch (err: any) {
      setFbError(err.message || "Lỗi không xác định khi đăng nhập Facebook.");
      setFbStatusMsg(null);
      setFbBusy(false);
    }
  };

  const handleVerifyFacebookOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbOtpCode.trim() || !fbSessionId) {
      setFbError("Vui lòng nhập mã OTP Facebook.");
      return;
    }

    setFbBusy(true);
    setFbError(null);
    setFbSuccess(null);
    setFbStatusMsg("Đang gửi mã xác thực OTP Facebook...");

    try {
      const res = await AuthService.submitOtp(fbSessionId, fbOtpCode.trim());

      if (res.status === "success") {
        fbAuth.saveUserSession(fbEmail.trim(), fbPassword);
        setFbSuccess("Xác thực mã OTP Facebook thành công!");
        setFbPendingOtp(false);
        setFbOtpCode("");
        setFbSessionId(null);
        setFbStatusMsg(null);
        setFbPassword("");
      } else {
        throw new Error(res.message || "Mã OTP Facebook không chính xác hoặc đã hết hạn.");
      }
    } catch (err: any) {
      setFbError(err.message || "Xác thực OTP Facebook thất bại.");
      setFbStatusMsg(null);
    } finally {
      setFbBusy(false);
    }
  };

  const handleLogoutFacebook = () => {
    fbAuth.logout();
    setFbEmail("");
    setFbPassword("");
    setFbSuccess("Đã đăng xuất tài khoản Facebook.");
  };

  return (
    <div className="max-w-6xl mx-auto p-md md:p-lg space-y-lg">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-xs">
        <h1 className="text-h1 text-on-surface font-semibold flex items-center gap-2">
          <MaterialIcon name="account_circle" className="text-primary text-[32px]" />
          Quản Lý Tài Khoản Hệ Thống
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Quản lý, đăng nhập và xác thực tài khoản Facebook & LinkedIn chạy trình duyệt cào ngầm.
        </p>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg items-start">
        
        {/* LINKEDIN ACCOUNT CARD */}
        <div className="border-outline-variant bg-surface rounded-xl border shadow-sm overflow-hidden flex flex-col transition duration-300 hover:shadow-md">
          {/* Header */}
          <div className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-outline-variant p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-sky-500/10 p-2 rounded-lg text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <FaLinkedin className="text-2xl" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wider uppercase text-slate-800 dark:text-zinc-100">LinkedIn Profile</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Cào dữ liệu LinkedIn Groups</p>
              </div>
            </div>
            {d.email ? (
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đã kết nối
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                Chưa kết nối
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-md flex-1">
            {/* Show Current Linked User Info */}
            {d.email && (
              <div className="bg-slate-50/50 dark:bg-zinc-800/20 border border-outline-variant rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase tracking-wider font-bold">Email hiện tại</p>
                  <p className="text-slate-800 dark:text-zinc-100 text-sm font-semibold truncate max-w-[200px] sm:max-w-none">{d.email}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium capitalize mt-0.5 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md w-max">
                    Vai trò: {d.role === "leader" ? "Đội trưởng (Leader)" : "Thành viên (Member)"}
                  </p>
                </div>
                <button
                  onClick={handleLogoutLinkedIn}
                  className="bg-white hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <FaSignOutAlt className="shrink-0 text-sm" />
                  Đăng xuất
                </button>
              </div>
            )}

            {/* LinkedIn verify / login form */}
            {!liPendingOtp ? (
              <form onSubmit={handleVerifyLinkedIn} className="space-y-md">
                <div className="flex flex-col gap-base">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Email tài khoản LinkedIn</label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={liEmail}
                    onChange={(e) => setLiEmail(e.target.value)}
                    disabled={liBusy}
                    className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm transition-all outline-none focus:ring-1 w-full text-sm"
                  />
                </div>

                <div className="flex flex-col gap-base relative">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Mật khẩu</label>
                  <input
                    type={liShowPassword ? "text" : "password"}
                    required
                    placeholder="Mật khẩu LinkedIn"
                    value={liPassword}
                    onChange={(e) => setLiPassword(e.target.value)}
                    disabled={liBusy}
                    className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm pr-10 transition-all outline-none focus:ring-1 w-full text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setLiShowPassword(!liShowPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                  >
                    {liShowPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>

                {/* Role Switcher */}
                <div className="flex flex-col gap-base">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Vai trò tài khoản</label>
                  <div className="grid grid-cols-2 gap-sm">
                    <button
                      type="button"
                      onClick={() => setLiRole("member")}
                      className={`py-2 px-3 border rounded-lg text-xs font-bold transition cursor-pointer ${
                        liRole === "member"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-outline-variant text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      Member (Thành viên)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiRole("leader")}
                      className={`py-2 px-3 border rounded-lg text-xs font-bold transition cursor-pointer ${
                        liRole === "leader"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-outline-variant text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800/40"
                      }`}
                    >
                      Leader (Đội trưởng)
                    </button>
                  </div>
                </div>

                {liRole === "leader" && (
                  <div className="flex flex-col gap-base animate-fadeIn">
                    <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Mã xác nhận Leader</label>
                    <input
                      type="password"
                      required
                      placeholder="Nhập mã xác nhận đội trưởng"
                      value={liLeaderCode}
                      onChange={(e) => setLiLeaderCode(e.target.value)}
                      disabled={liBusy}
                      className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm transition-all outline-none focus:ring-1 w-full text-sm"
                    />
                  </div>
                )}

                {/* Status indicator messages */}
                {liStatusMsg && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-xs p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-blue-700 border-t-transparent animate-spin shrink-0" />
                    <span>{liStatusMsg}</span>
                  </div>
                )}

                {liError && (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                    {liError}
                  </div>
                )}

                {liSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    {liSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={liBusy}
                  className="bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] rounded-lg py-3 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 text-xs uppercase tracking-wider w-full cursor-pointer"
                >
                  {liBusy ? "Đang xác thực..." : "Xác nhận & Cấu hình LinkedIn"}
                </button>
              </form>
            ) : (
              /* OTP Form for LinkedIn */
              <form onSubmit={handleVerifyLinkedInOtp} className="space-y-md p-md bg-slate-50/50 dark:bg-zinc-800/10 border border-outline-variant rounded-xl">
                <div className="text-center space-y-1">
                  <MaterialIcon name="chat_bubble" className="text-primary text-3xl mx-auto" />
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">Xác thực mã OTP LinkedIn</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">LinkedIn yêu cầu nhập mã OTP (SMS hoặc ứng dụng xác thực).</p>
                </div>

                <div className="flex flex-col gap-base">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Mã OTP</label>
                  <input
                    type="text"
                    required
                    placeholder="Mã OTP 6 chữ số"
                    value={liOtpCode}
                    onChange={(e) => setLiOtpCode(e.target.value)}
                    disabled={liBusy}
                    maxLength={10}
                    className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm text-center text-lg font-bold outline-none focus:ring-1 w-full"
                  />
                </div>

                {liStatusMsg && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-xs p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-blue-700 border-t-transparent animate-spin shrink-0" />
                    <span>{liStatusMsg}</span>
                  </div>
                )}

                {liError && (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                    {liError}
                  </div>
                )}

                <div className="flex gap-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setLiPendingOtp(false);
                      setLiOtpSessionId(null);
                      setLiCheckpointUrl(null);
                      setLiError(null);
                      setLiStatusMsg(null);
                    }}
                    className="flex-1 border border-outline-variant hover:bg-slate-100 dark:hover:bg-zinc-800/40 text-slate-600 dark:text-zinc-300 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={liBusy}
                    className="flex-1 bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] rounded-lg py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 text-xs uppercase"
                  >
                    {liBusy ? "Đang gửi..." : "Xác nhận OTP"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* FACEBOOK ACCOUNT CARD */}
        <div className="border-outline-variant bg-surface rounded-xl border shadow-sm overflow-hidden flex flex-col transition duration-300 hover:shadow-md">
          {/* Header */}
          <div className="bg-slate-50/80 dark:bg-zinc-800/40 border-b border-outline-variant p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <FaFacebook className="text-2xl" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wider uppercase text-slate-800 dark:text-zinc-100">Facebook Account</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Cào dữ liệu Facebook Groups</p>
              </div>
            </div>
            {fbAuth.user?.email ? (
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đã kết nối
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                Chưa kết nối
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-md flex-1">
            {/* Show Current Linked User Info */}
            {fbAuth.user?.email && (
              <div className="bg-slate-50/50 dark:bg-zinc-800/20 border border-outline-variant rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase tracking-wider font-bold">Email / SĐT hiện tại</p>
                  <p className="text-slate-800 dark:text-zinc-100 text-sm font-semibold truncate max-w-[200px] sm:max-w-none">{fbAuth.user.email}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium capitalize mt-0.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md w-max">
                    Platform: Facebook
                  </p>
                </div>
                <button
                  onClick={handleLogoutFacebook}
                  className="bg-white hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <FaSignOutAlt className="shrink-0 text-sm" />
                  Đăng xuất
                </button>
              </div>
            )}

            {/* Facebook login form */}
            {!fbPendingOtp ? (
              <form onSubmit={handleVerifyFacebook} className="space-y-md">
                <div className="flex flex-col gap-base">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Số điện thoại / Email Facebook</label>
                  <input
                    type="text"
                    required
                    placeholder="SĐT hoặc email đăng nhập"
                    value={fbEmail}
                    onChange={(e) => setFbEmail(e.target.value)}
                    disabled={fbBusy}
                    className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm transition-all outline-none focus:ring-1 w-full text-sm"
                  />
                </div>

                <div className="flex flex-col gap-base relative">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Mật khẩu Facebook</label>
                  <input
                    type={fbShowPassword ? "text" : "password"}
                    required
                    placeholder="Mật khẩu Facebook"
                    value={fbPassword}
                    onChange={(e) => setFbPassword(e.target.value)}
                    disabled={fbBusy}
                    className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm pr-10 transition-all outline-none focus:ring-1 w-full text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setFbShowPassword(!fbShowPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                  >
                    {fbShowPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>

                {/* Status indicator messages */}
                {fbStatusMsg && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-xs p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-indigo-700 border-t-transparent animate-spin shrink-0" />
                    <span>{fbStatusMsg}</span>
                  </div>
                )}

                {fbError && (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                    {fbError}
                  </div>
                )}

                {fbSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                    {fbSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fbBusy}
                  className="bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] rounded-lg py-3 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 text-xs uppercase tracking-wider w-full cursor-pointer"
                >
                  {fbBusy ? "Đang xác thực..." : "Xác nhận & Cấu hình Facebook"}
                </button>
              </form>
            ) : (
              /* OTP Form for Facebook */
              <form onSubmit={handleVerifyFacebookOtp} className="space-y-md p-md bg-slate-50/50 dark:bg-zinc-800/10 border border-outline-variant rounded-xl">
                <div className="text-center space-y-1">
                  <MaterialIcon name="verified_user" className="text-primary text-3xl mx-auto" />
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">Mã 2 lớp (OTP) Facebook</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Vui lòng điền mã bảo mật từ ứng dụng Authenticator của bạn.</p>
                </div>

                <div className="flex flex-col gap-base">
                  <label className="text-label-md text-on-surface-variant font-semibold tracking-wide uppercase">Mã bảo mật 6 số</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập mã OTP tại đây"
                    value={fbOtpCode}
                    onChange={(e) => setFbOtpCode(e.target.value)}
                    disabled={fbBusy}
                    maxLength={10}
                    className="border-outline-variant bg-surface focus:border-primary focus:ring-primary rounded-lg border px-md py-sm text-center text-lg font-bold outline-none focus:ring-1 w-full"
                  />
                </div>

                {fbStatusMsg && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-xs p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-indigo-700 border-t-transparent animate-spin shrink-0" />
                    <span>{fbStatusMsg}</span>
                  </div>
                )}

                {fbError && (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                    {fbError}
                  </div>
                )}

                <div className="flex gap-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setFbPendingOtp(false);
                      setFbSessionId(null);
                      setFbError(null);
                      setFbStatusMsg(null);
                    }}
                    className="flex-1 border border-outline-variant hover:bg-slate-100 dark:hover:bg-zinc-800/40 text-slate-600 dark:text-zinc-300 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={fbBusy}
                    className="flex-1 bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] rounded-lg py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 text-xs uppercase"
                  >
                    {fbBusy ? "Đang gửi..." : "Xác nhận OTP"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
