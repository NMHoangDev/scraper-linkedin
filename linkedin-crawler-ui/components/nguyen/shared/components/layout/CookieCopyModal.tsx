import React, { useState } from 'react';

interface CookieModalProps {
  title?: string;
  // Nhận dữ liệu cookie (có thể là chuỗi string hoặc object mảng từ Playwright)
  cookieData: string | object; 
  onClose?: () => void; // Nút đóng modal sau khi đã copy xong
}

export default function CookieCopyModal({
  title = "Đăng nhập thành công!",
  cookieData,
  onClose,
}: CookieModalProps) {
  const [copied, setCopied] = useState(false);

  // Ép kiểu dữ liệu cookie về dạng chuỗi định dạng đẹp (nếu là object/array)
  const cookieString = 
    typeof cookieData === 'string' 
      ? cookieData 
      : JSON.stringify(cookieData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(cookieString);
    setCopied(true);
    // Trả lại trạng thái nút sau 2 giây
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-[500px] max-w-[90vw] shrink-0 overflow-hidden rounded-3xl border border-white/50 bg-white/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        {/* Decorative background glow (Đổi sang màu xanh lá báo hiệu thành công) */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-1/2 w-full -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />

        {/* Success Icon */}
        <div className="relative mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <h1 className="relative mb-2 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">{title}</h1>
        
        <p className="mb-6 text-sm text-slate-600">
          Hệ thống đã trích xuất Cookie của bạn thành công.
        </p>

        {/* Khu vực hiển thị Cookie (Có thanh cuộn) */}
        <div className="relative mb-8 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-left shadow-inner">
          <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-slate-700">
            {cookieString}
          </pre>
        </div>

        {/* Các nút hành động */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleCopy}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold shadow-sm transition-all duration-200 active:scale-95 ${
              copied
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-violet-600 text-white hover:bg-violet-700 hover:shadow-md border border-transparent"
            }`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Đã Copy!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Cookie
              </>
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-8 py-2.5 font-bold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-800 active:scale-95"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}