"use client";

import { useEffect, useState } from "react";

import { MaterialIcon } from "@/components/ui";
import { isZaloExtensionAvailable } from "@/services/zaloExtension";

export function ZaloExtensionLauncher() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const available = await isZaloExtensionAvailable();
      if (!cancelled) setIsReady(available);
    };

    void check();
    const interval = setInterval(() => void check(), 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mx-4 mt-3 mb-1 shrink-0 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 bg-slate-50/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
            <MaterialIcon name="login" className="text-blue-600 text-[22px]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm leading-tight">
              Markee Zalo Login Extension
            </h3>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              Cần extension để đăng nhập Zalo và đồng bộ tin nhắn. Giải nén file zip rồi Load unpacked tại chrome://extensions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/extension-login-zalo.zip"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
          >
            <MaterialIcon name="download" className="text-[16px]" />
            Tải Extension
          </a>
        </div>
      </div>

      <div
        className={`px-4 py-2.5 border-t text-xs flex items-center gap-2 ${
          isReady
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}
      >
        <MaterialIcon name={isReady ? "check_circle" : "warning"} className="text-[16px]" />
        {isReady
          ? "Extension đã kết nối — sẵn sàng đăng nhập và đồng bộ tin nhắn Zalo."
          : "Chưa kết nối Extension. Tải, cài đặt và F5 lại trang."}
      </div>
    </div>
  );
}
