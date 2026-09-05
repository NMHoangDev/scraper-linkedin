"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import {
  importZaloSessionViaExtension,
  isZaloExtensionAvailable,
} from "@/services/zaloExtension";

interface Props {
  accountId: string;
  ownerName: string;
  autoTrigger?: boolean;
  onSuccess: () => void;
}

type LoginMethod = "none" | "extension";

// Bản rút gọn cho zalo-module: chỉ giữ đăng nhập qua Chrome Extension (cookie).
// Bản gốc còn có luồng "Đăng nhập OTP / Trình duyệt VPS" (Playwright chạy
// trong container backend) — không copy sang vì zalo-module không có
// Playwright (xem docs/ZALO_CHAT_FEATURE_EXTRACTION_GUIDE.md).
export default function ZaloAccountAuthView({ accountId, ownerName, autoTrigger, onSuccess }: Props) {
  const [method, setMethod] = useState<LoginMethod>("none");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const hasTriggeredRef = useRef(false);
  const isConnectingRef = useRef(false);

  const startExtensionLogin = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setLoading(true);
    setWarning(null);
    setFeedback("Đang kết nối với Chrome Extension...");
    setMethod("extension");

    try {
      const extAvailable = await isZaloExtensionAvailable();
      if (!extAvailable) {
        throw new Error(
          "Chưa cài đặt Chrome Extension lấy Zalo cookies.\nVui lòng làm theo hướng dẫn:\n" +
          "1. Mở trang Quản lý Tiện ích mở rộng (chrome://extensions)\n" +
          "2. Bật 'Chế độ cho nhà phát triển' (Developer mode)\n" +
          "3. Bấm 'Tải tiện ích đã giải nén' (Load unpacked) -> Chọn thư mục 'extension'\n" +
          "4. F5 tải lại trang web này và chọn lại đăng nhập bằng Extension."
        );
      }

      setFeedback("Đang mở Zalo Web. Vui lòng đăng nhập trên tab mới nếu chưa đăng nhập...");

      const result = await importZaloSessionViaExtension({
        account_id: accountId,
        user_id: accountId,
        owner_id: accountId,
      });

      if (result.backend && (result.backend.status === "confirmed" || result.backend.ok)) {
        setFeedback("✅ Đăng nhập & đồng bộ Zalo thành công!");
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error("Không thể xác thực phiên đăng nhập từ Extension");
      }
    } catch (e) {
      setWarning(e instanceof Error ? e.message : String(e));
      setMethod("none");
    } finally {
      setLoading(false);
      isConnectingRef.current = false;
    }
  }, [accountId, onSuccess]);

  // Auto trigger extension login if requested and available
  useEffect(() => {
    if (autoTrigger && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      void isZaloExtensionAvailable().then(avail => {
        if (avail) {
          void startExtensionLogin();
        } else {
          hasTriggeredRef.current = false;
        }
      });
    }
  }, [autoTrigger, startExtensionLogin]);

  return (
    <div className="w-full flex flex-col items-center p-6 bg-white min-h-[400px]">
        {/* Header icons */}
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <MaterialIcon name="warning" className="text-red-500 text-[28px]" />
        </div>

        <h3 className="text-[16px] font-bold text-slate-800 text-center mb-1">
          Yêu cầu đăng nhập Zalo
        </h3>
        <p className="text-[12px] text-slate-500 text-center mb-6">
          Tài khoản <strong>{accountId}</strong> của nhân sự <strong>{ownerName}</strong> đã hết phiên hoặc chưa đăng nhập.
        </p>

        {warning && (
          <div className="w-full mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[11px] text-red-800 font-medium">
            {warning}
          </div>
        )}

        {feedback && (
          <div className="w-full mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-[11px] text-green-800 font-medium">
            {feedback}
          </div>
        )}

        {method === "none" && (
          <div className="w-full space-y-2.5">
            <button
              onClick={startExtensionLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm transition shadow-sm"
            >
              <MaterialIcon name="sync" className="text-[18px]" />
              Đăng nhập qua Extension
            </button>
            <p className="w-full text-center text-[11px] text-slate-400 leading-relaxed px-2">
              Chưa cài extension? Mở <code className="text-slate-500">chrome://extensions</code>,
              bật "Chế độ cho nhà phát triển", bấm "Tải tiện ích đã giải nén" và
              chọn thư mục <code className="text-slate-500">zalo-module/extension/</code>.
            </p>
          </div>
        )}

        {method === "extension" && (
          <div className="flex flex-col items-center w-full py-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-[280px] mb-6">
              Hệ thống đang gọi Chrome Extension để mở tab Zalo Web. Vui lòng hoàn tất đăng nhập trên tab Zalo Web đó để đồng bộ tự động.
            </p>
            <button
              onClick={() => {
                setMethod("none");
                setFeedback(null);
                setWarning(null);
              }}
              className="w-full rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 text-xs transition"
            >
              Hủy bỏ / Quay lại
            </button>
          </div>
        )}
    </div>
  );
}
