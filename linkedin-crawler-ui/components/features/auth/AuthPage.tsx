"use client";

import { useState, type FormEvent, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/contexts/AppAuthContext";

/* -------------------------------------------------------------------------- */
/*  Material Symbols — class already defined in globals.css                    */
/* -------------------------------------------------------------------------- */
const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */
type AuthMode = "login" | "register";

/* -------------------------------------------------------------------------- */
/*  AuthPage                                                                   */
/* -------------------------------------------------------------------------- */
export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success">("idle");

  const { login, register, setLwuuSession } = useAppAuth();
  const router = useRouter();

  const switchMode = useCallback((m: AuthMode) => {
    setMode(m);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setSubmitStatus("loading");

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim() || undefined);
      }
      localStorage.setItem("linkedin_crawler_email", email.trim());
      if (remember) {
        setLwuuSession(email.trim(), true);
      }
      router.push("/all-platform/post-feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setSubmitStatus("idle");
    } finally {
      setSubmitting(false);
    }
  }, [mode, email, password, name, login, register, setLwuuSession, router]);

  const isLoading = submitStatus === "loading";
  const isSuccess = submitStatus === "success";

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 0% 0%, #C40009 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, #E3000F 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, #FF3344 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, #E3000F 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, #C40009 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #D4001A 0%, transparent 70%), #C40009" }}
    >



      {/* Animated orbs */}
      <div
        className="absolute rounded-full pointer-events-none z-0"
          style={{
          width: 500, height: 500,
          background: "#E3000F",
          filter: "blur(100px)",
          opacity: 0.5,
          top: -100, left: -100,
          animation: "orb-float 25s infinite alternate ease-in-out",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none z-0"
        style={{
          width: 600, height: 600,
          background: "#FF3344",
          filter: "blur(100px)",
          opacity: 0.4,
          bottom: -200, right: -150,
          animation: "orb-float2 25s infinite alternate ease-in-out",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none z-0"
        style={{
          width: 400, height: 400,
          background: "#C40009",
          filter: "blur(100px)",
          opacity: 0.35,
          top: "30%", left: "55%",
          animation: "orb-float3 25s infinite alternate ease-in-out",
        }}
      />

      {/* Noise overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]" />

      <style>{`
        @keyframes orb-float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
          100% { transform: translate(-30px, 80px) scale(0.95); }
        }
        @keyframes orb-float2 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(-40px, -30px) rotate(10deg) scale(1.05); }
          100% { transform: translate(30px, 60px) rotate(-5deg) scale(1); }
        }
        @keyframes orb-float3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -20px) scale(1.08); }
          100% { transform: translate(-20px, 40px) scale(0.92); }
        }
        .card-glow {
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3), 0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1);
        }
        .input-glow:focus {
          border-color: #E3000F;
          box-shadow: 0 0 0 3px rgba(227,0,15,0.12);
          outline: none;
        }
        .tab-login.active {
          color: #E3000F;
          background: #fff0f0;
          border-bottom: 3px solid #C40009;
        }
        .tab-register.active {
          color: #E3000F;
          background: #fff0f0;
          border-bottom: 3px solid #C40009;
        }
      `}</style>

      {/* Main Card */}
      <main className="relative z-10 w-full max-w-[448px] mx-4">
        <div
          className="bg-white rounded-[24px] card-glow overflow-hidden flex flex-col"
          style={{ border: "1px solid rgba(255,255,255,0.4)" }}
        >
          {/* ── Header ── */}
          <div
            className="flex flex-col items-center justify-center gap-4 px-6 py-8"
            style={{ background: "linear-gradient(135deg, #C40009 0%, #E3000F 100%)" }}
          >
            <div
              className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden"
              style={{ transform: "rotate(3deg)", transition: "transform 0.3s" }}
            >
              <Image
                src="https://markeeai.com/logo.svg"
                alt="MarkeeAI"
                fill
                sizes="64px"
                className="object-contain p-2"
                priority
              />
            </div>
            <h1 className="text-white font-semibold text-xl leading-tight tracking-tight">
              {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
            </h1>
          </div>

          {/* ── Tabs ── */}
          <div className="flex" style={{ borderBottom: "1px solid #e1e3e4" }}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-4 text-sm font-medium transition-all cursor-pointer border-0 ${
                mode === "login"
                  ? "tab-login active"
                  : "text-[#494551] hover:bg-[#f3f4f5]"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-4 text-sm font-medium transition-all cursor-pointer border-0 ${
                mode === "register"
                  ? "tab-register active"
                  : "text-[#494551] hover:bg-[#f3f4f5]"
              }`}
            >
              Đăng ký
            </button>
          </div>

          {/* ── Form ── */}
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">

              {/* Họ tên — chỉ register */}
              {mode === "register" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#494551]">Họ tên</label>
                  <div className="relative">
                    <Icon
                      name="badge"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7582]"
                    />
                    <input
                      type="text"
                      placeholder="Nhập họ và tên"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#cbc4d2] rounded-xl text-sm input-glow transition-all placeholder:text-[#cbc4d2]"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#494551]">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Icon
                    name="mail"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7582]"
                  />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#cbc4d2] rounded-xl text-sm input-glow transition-all placeholder:text-[#cbc4d2]"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#494551]">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  {mode === "login" && (
                    <a href="#" className="text-xs text-[#E3000F] hover:underline">
                      Quên mật khẩu?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a7582]"
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#cbc4d2] rounded-xl text-sm input-glow transition-all placeholder:text-[#cbc4d2]"
                  />
                </div>
              </div>

              {/* Ghi nhớ — chỉ login */}
              {mode === "login" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-[#cbc4d2] text-[#E3000F] cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-sm text-[#494551] cursor-pointer select-none">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600 font-medium">
                  <Icon name="error" className="text-red-500 text-base" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 text-white font-semibold text-base rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-0 mt-1"
                style={{
                  background: isLoading
                    ? "#ff9999"
                    : isSuccess
                    ? "#16a34a"
                    : "linear-gradient(135deg, #C40009 0%, #E3000F 100%)",
                  boxShadow: isLoading ? "none" : "0 4px 14px rgba(227,0,15,0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                {isLoading ? (
                  <>
                    <Icon name="progress_activity" className="text-base animate-spin" />
                    <span>{mode === "login" ? "Đang đăng nhập..." : "Đang đăng ký..."}</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <Icon name="check_circle" className="text-base" />
                    <span>Thành công!</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</span>
                    <Icon name="arrow_forward" className="text-base" />
                  </>
                )}
              </button>
            </form>

            {/* ── Social Divider — chỉ login ── */}
            {mode === "login" && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: "#e1e3e4" }} />
                  </div>
                  <div className="relative flex justify-center">
                    <span
                      className="px-4 bg-white text-[#7a7582] text-xs font-medium uppercase tracking-wider"
                      style={{ fontSize: 11 }}
                    >
                      Hoặc tiếp tục với
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-2 px-3 border rounded-xl transition-colors cursor-pointer bg-white border-[#cbc4d2] hover:bg-[#f3f4f5]"
                  >
                    <img
                      src="https://lh3.googleusercontent.com/COUgScCx-pODA3oMozpVFH-m7uOZ-8DlR3V2t6v7I3K_AGt-Q6JYPhbLW0v63hZqYXo=w48-h48-n"
                      alt="Google"
                      className="w-5 h-5"
                    />
                    <span className="text-xs font-medium text-[#494551]">Google</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-2 px-3 border rounded-xl transition-colors cursor-pointer bg-white border-[#cbc4d2] hover:bg-[#f3f4f5]"
                  >
                    <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-xs font-medium text-[#494551]">Facebook</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Footer link ── */}
          <div
            className="px-6 pb-6 pt-0 text-center"
            style={{ background: "#f3f4f5" }}
          >
            <p className="text-sm text-[#494551]">
              {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-[#E3000F] font-bold hover:underline bg-transparent border-none cursor-pointer p-0 text-sm"
              >
                {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </div>

        {/* ── System footer ── */}
        <footer className="mt-6 flex flex-col md:flex-row justify-center items-center gap-3 text-white/60 text-xs">
          <span>© 2024 CrawlerPro. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white transition-colors">Chính sách</a>
            <a href="#" className="hover:text-white transition-colors">Hỗ trợ</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
