"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download } from "lucide-react";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx") {
      toast.error("Vui lòng chọn file .csv hoặc .xlsx");
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Vui lòng chọn file dữ liệu");
      return;
    }

    // Backend chưa sẵn sàng → thông báo tính năng đang phát triển
    toast.info("Tính năng đang phát triển", {
      description: `File "${file.name}" đã được chọn. Tính năng nhập hàng loạt sẽ sớm được hoàn thiện.`,
    });
    onOpenChange(false);
    onSuccess?.();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="p-0 gap-0 min-w-[400px] max-w-md">
        <DialogHeader className="border-b border-[#e7e9ef] px-6 py-4">
          <DialogTitle className="text-[17px] font-bold text-[#252733]">
            Nhập hàng loạt tài khoản
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#737785]">
            Tải lên file CSV hoặc Excel để thêm nhiều tài khoản cùng lúc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {/* Khu vực kéo-thả / chọn file */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? "border-[#c71f4d] bg-[#fff5f7]"
                : file
                  ? "border-[#16a26a] bg-[#f0fdf6]"
                  : "border-[#dde0e7] bg-white hover:border-[#9ca0ab]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <>
                <FileSpreadsheet className="mb-2 h-10 w-10 text-[#16a26a]" />
                <p className="text-[14px] font-bold text-[#252733]">
                  {file.name}
                </p>
                <p className="text-[12px] text-[#737785]">
                  {formatFileSize(file.size)}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2 text-[12px] font-semibold text-[#c71f4d] hover:underline"
                >
                  Xóa và chọn lại
                </button>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-10 w-10 text-[#9ca0ab]" />
                <p className="text-[14px] font-semibold text-[#606472]">
                  Kéo thả file vào đây
                </p>
                <p className="mt-1 text-[12px] text-[#9ca0ab]">
                  hoặc nhấp để chọn file từ máy tính
                </p>
                <p className="mt-2 text-[11px] text-[#9ca0ab]">
                  Hỗ trợ .csv, .xlsx
                </p>
              </>
            )}
          </div>

          {/* Hướng dẫn định dạng */}
          <div className="rounded-[10px] bg-[#fafbfc] border border-[#e7e9ef] px-4 py-3">
            <p className="text-[12px] font-bold text-[#252733] mb-1.5">
              Định dạng file yêu cầu:
            </p>
            <ul className="space-y-0.5 text-[12px] text-[#606472]">
              <li>
                • <span className="font-semibold">platform</span>: Tên nền tảng
                (facebook, linkedin, gmail, tiktok, zalo)
              </li>
              <li>
                • <span className="font-semibold">name</span>: Tên tài khoản
              </li>
              <li>
                • <span className="font-semibold">email/phone</span>: Email
                hoặc số điện thoại
              </li>
              <li>
                • <span className="font-semibold">password</span> (không bắt
                buộc)
              </li>
              <li>
                • <span className="font-semibold">note</span> (không bắt buộc)
              </li>
            </ul>
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Tải file mẫu sẽ sớm được hỗ trợ",
                )
              }
              className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#c71f4d] hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Tải file mẫu
            </button>
          </div>
        </div>

<DialogFooter className="border-t border-[#e7e9ef] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[10px] border-[#dde0e7] text-[13px] font-bold text-[#606472]"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file}
            className="rounded-[10px] bg-[#c71f4d] px-[18px] text-[13px] font-bold text-white hover:bg-[#b01a42] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Nhập tài khoản
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

