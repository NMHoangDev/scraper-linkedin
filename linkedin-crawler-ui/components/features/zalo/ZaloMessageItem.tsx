"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/ui";
import { zaloImageUrl } from "@/services/zaloCrawlerService";
import type { ZaloMessage } from "@/types/zalo";

interface ZaloMessageItemProps {
  message: ZaloMessage;
  index: number;
  selected: boolean;
  groupId: string;
  userId: string;
  onSelect: (index: number) => void;
}

const IMG_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export function ZaloMessageItem({
  message,
  index,
  selected,
  groupId,
  userId,
  onSelect,
}: ZaloMessageItemProps) {
  const [showRaw, setShowRaw] = useState(false);
  const isSent = message.is_sent;
  const viewableImages = message.image_urls.filter((u) => !u.startsWith("blob:"));
  const imageFiles = (message.image_files ?? []).filter((f) =>
    IMG_EXTS.has(f.split(".").pop()?.toLowerCase() ?? ""),
  );
  const allThumbs = [
    ...viewableImages,
    ...imageFiles.map((f) => zaloImageUrl(userId, groupId, f)),
  ];
  const blobCount = message.image_urls.length - viewableImages.length - imageFiles.length;

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "group relative max-w-[75%] rounded-xl px-md py-sm",
          isSent
            ? "bg-primary text-on-primary rounded-br-sm"
            : "border-outline-variant bg-surface-container-low text-on-surface rounded-bl-sm border",
          selected ? "ring-2 ring-blue-500 ring-offset-1" : "",
        ].join(" ")}
      >
        {/* clickable overlay — no nested interactive elements inside */}
        <button
          type="button"
          className="absolute inset-0 rounded-xl"
          onClick={() => onSelect(index)}
          aria-pressed={selected}
          aria-label={`Tin nhắn từ ${message.sender ?? "Ẩn danh"}`}
        />

        {/* content sits above the overlay via relative positioning */}
        <div className="relative pointer-events-none">
          {!isSent && message.sender && (
            <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${isSent ? "text-on-primary/70" : "text-primary"}`}>
              {message.sender}
            </p>
          )}

          <p className="whitespace-pre-wrap break-words text-sm">
            {showRaw ? message.raw : message.content}
          </p>

          {allThumbs.length > 0 && (
            <div className="mt-sm flex flex-wrap gap-1">
              {allThumbs.slice(0, 4).map((url, i) => (
                <div key={i} className="border-outline-variant h-16 w-16 overflow-hidden rounded-lg border">
                  <img
                    src={url}
                    alt={`Ảnh ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ))}
              {allThumbs.length > 4 && (
                <span className="text-on-surface-variant flex h-16 w-16 items-center justify-center rounded-lg border text-xs">
                  +{allThumbs.length - 4}
                </span>
              )}
            </div>
          )}

          {blobCount > 0 && (
            <p className={`mt-1 text-[11px] ${isSent ? "text-on-primary/60" : "text-on-surface-variant"}`}>
              {blobCount} ảnh (blob)
            </p>
          )}

          <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${isSent ? "text-on-primary/60" : "text-on-surface-variant"}`}>
            <span>{message.time_text ?? ""}</span>
          </div>
        </div>

        {/* raw toggle — outside the overlay, pointer-events re-enabled */}
        <button
          type="button"
          className={[
            "absolute right-1 bottom-1 z-10 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
            isSent ? "text-on-primary/70 hover:text-on-primary" : "text-on-surface-variant hover:text-on-surface",
          ].join(" ")}
          onClick={() => setShowRaw((v) => !v)}
          aria-label={showRaw ? "Ẩn raw text" : "Xem raw text"}
        >
          <MaterialIcon name={showRaw ? "visibility_off" : "code"} className="text-sm" />
        </button>
      </div>
    </div>
  );
}
