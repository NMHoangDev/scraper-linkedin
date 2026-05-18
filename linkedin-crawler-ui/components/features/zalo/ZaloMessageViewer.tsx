"use client";

import { MaterialIcon } from "@/components/ui";
import { zaloImageUrl } from "@/services/zaloCrawlerService";
import type { ZaloMessage } from "@/types/zalo";

const IMG_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
function isImageFile(f: string): boolean {
  return IMG_EXTS.has(f.split(".").pop()?.toLowerCase() ?? "");
}

interface ZaloMessageViewerProps {
  message: ZaloMessage | null;
  index: number | null;
  total: number;
  groupId: string;
  userId: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function ZaloMessageViewer({
  message,
  index,
  total,
  groupId,
  userId,
  onPrev,
  onNext,
  onClose,
}: ZaloMessageViewerProps) {
  if (!message || index === null) {
    return (
      <div className="border-outline-variant bg-surface-container-low flex h-full flex-col items-center justify-center gap-3 rounded-xl border p-lg text-center">
        <MaterialIcon name="touch_app" className="text-on-surface-variant text-5xl opacity-30" />
        <p className="text-on-surface-variant text-sm">
          Chọn một tin nhắn để xem chi tiết
        </p>
      </div>
    );
  }

  return (
    <div className="border-outline-variant bg-surface flex h-full flex-col rounded-xl border" role="region" aria-label="Chi tiết tin nhắn">
      <div className="border-outline-variant flex items-center justify-between border-b px-md py-sm">
        <div className="flex items-center gap-2">
          <MaterialIcon name="chat" className="text-primary" />
          <span className="text-on-surface font-semibold text-sm">
            {message.sender ?? "Ẩn danh"}
          </span>
          {message.is_sent && (
            <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-bold uppercase">
              Bạn
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant hover:text-error rounded p-1 transition-colors"
          aria-label="Đóng"
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-md">
        {message.time_text && (
          <p className="text-on-surface-variant mb-sm text-xs">
            {message.time_text}
          </p>
        )}

        <p className="text-on-surface mb-md whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </p>

        {message.image_urls.length > 0 && (
          <div className="mt-md">
            <p className="text-on-surface-variant mb-sm text-xs font-semibold uppercase tracking-wide">
              Hình ảnh ({message.image_urls.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {message.image_urls.map((url, i) =>
                url.startsWith("blob:") ? (
                  <div key={i} className="border-outline-variant bg-surface-container flex h-24 items-center justify-center rounded-lg border">
                    <p className="text-on-surface-variant text-center text-xs px-2">
                      Blob URL — chỉ xem được trong Zalo
                    </p>
                  </div>
                ) : (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-outline-variant block overflow-hidden rounded-lg border"
                    aria-label={`Xem ảnh ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Ảnh ${i + 1}`}
                      className="h-32 w-full object-cover transition-opacity hover:opacity-80"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </a>
                ),
              )}
            </div>
          </div>
        )}

        {message.image_files && message.image_files.length > 0 && (
          <div className="mt-md">
            <p className="text-on-surface-variant mb-sm text-xs font-semibold uppercase tracking-wide">
              Ảnh đã tải ({message.image_files.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {message.image_files.map((f, i) =>
                isImageFile(f) ? (
                  <a
                    key={i}
                    href={zaloImageUrl(userId, groupId, f)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-outline-variant block overflow-hidden rounded-lg border"
                    aria-label={`Xem ảnh ${i + 1}`}
                  >
                    <img
                      src={zaloImageUrl(userId, groupId, f)}
                      alt={`Ảnh ${i + 1}`}
                      className="h-32 w-full object-cover transition-opacity hover:opacity-80"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </a>
                ) : (
                  <p key={i} className="text-on-surface-variant text-xs">
                    {f}
                  </p>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-outline-variant flex items-center justify-between border-t px-md py-sm">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 rounded px-sm py-1 text-sm transition-colors disabled:opacity-40"
          aria-label="Tin nhắn trước"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          Trước
        </button>
        <span className="text-on-surface-variant text-xs">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          className="text-on-surface-variant hover:text-on-surface flex items-center gap-1 rounded px-sm py-1 text-sm transition-colors disabled:opacity-40"
          aria-label="Tin nhắn tiếp theo"
        >
          Tiếp
          <MaterialIcon name="arrow_forward" className="text-base" />
        </button>
      </div>
    </div>
  );
}
