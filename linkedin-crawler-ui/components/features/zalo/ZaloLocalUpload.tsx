"use client";

import { useRef, useState } from "react";

import { MaterialIcon } from "@/components/ui";

interface ZaloLocalUploadProps {
  onFile: (file: File, groupName?: string) => Promise<void>;
  busy: boolean;
  error: string | null;
}

export function ZaloLocalUpload({ onFile, busy, error }: ZaloLocalUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [groupName, setGroupName] = useState("");

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void onFile(file, groupName.trim() || undefined);
    setGroupName("");
  };

  return (
    <div className="border-outline-variant bg-surface-container-low rounded-xl border p-lg">
      <div className="mb-md flex items-center gap-2">
        <MaterialIcon name="upload_file" className="text-primary text-2xl" />
        <h3 className="text-on-surface font-semibold">Tải file messages.json</h3>
      </div>

      <div className="mb-md">
        <label className="text-label-md text-on-surface-variant mb-xs block font-semibold uppercase tracking-wide">
          Tên nhóm (tuỳ chọn)
        </label>
        <input
          type="text"
          className="border-outline-variant bg-surface focus:border-primary w-full rounded-lg border px-md py-sm text-sm outline-none transition-all focus:ring-1 focus:ring-blue-500"
          placeholder="Tên hiển thị cho nhóm..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          disabled={busy}
        />
      </div>

      <button
        type="button"
        className={[
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-lg py-8 transition-all",
          dragging
            ? "border-primary bg-primary/5"
            : "border-outline-variant hover:border-primary hover:bg-primary/5",
          busy ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        aria-label="Chọn hoặc kéo thả file messages.json"
      >
        <MaterialIcon
          name={busy ? "hourglass_top" : "cloud_upload"}
          className={`text-4xl ${busy ? "text-on-surface-variant animate-pulse" : "text-primary"}`}
        />
        <span className="text-on-surface-variant text-sm">
          {busy
            ? "Đang xử lý..."
            : "Kéo thả hoặc click để chọn file messages.json"}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={busy}
      />

      {error && (
        <p className="border-error-container bg-error-container/30 text-error mt-md rounded-lg border px-md py-sm text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
