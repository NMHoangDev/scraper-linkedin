"use client";

import { useZaloCrawler } from "@/hooks/useZaloCrawler";
import { MaterialIcon } from "@/components/ui";
import { ZaloLocalUpload } from "@/components/features/zalo";

export default function ZaloSettingsPage() {
  const {
    groupMetas,
    uploadError,
    uploadBusy,
    loadGroupFromFile,
    removeGroup,
  } = useZaloCrawler();

  const clearAll = () => {
    groupMetas.forEach((g) => removeGroup(g.name));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-lg">
      <div>
        <h1 className="text-on-surface text-2xl font-black">Cài đặt Zalo</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Quản lý dữ liệu nhóm và tuỳ chọn xuất.
        </p>
      </div>

      <section className="border-outline-variant bg-surface rounded-xl border p-lg space-y-md" aria-label="Quản lý nhóm">
        <h2 className="text-on-surface font-semibold flex items-center gap-2">
          <MaterialIcon name="group" className="text-primary" />
          Nhóm đã tải ({groupMetas.length})
        </h2>

        {groupMetas.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Chưa có nhóm nào.</p>
        ) : (
          <ul className="divide-outline-variant divide-y">
            {groupMetas.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-sm">
                <div>
                  <p className="text-on-surface text-sm font-medium">{g.name}</p>
                  <p className="text-on-surface-variant text-xs">
                    {g.messageCount.toLocaleString()} tin · {g.senderCount} người · {g.mediaCount} media
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeGroup(g.name)}
                  className="text-on-surface-variant hover:text-error rounded p-1 transition-colors"
                  aria-label={`Xoá nhóm ${g.name}`}
                >
                  <MaterialIcon name="delete" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {groupMetas.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="border-error text-error hover:bg-error/5 flex items-center gap-2 rounded-lg border px-md py-sm text-sm font-semibold transition-colors"
          >
            <MaterialIcon name="delete_sweep" className="text-base" />
            Xoá tất cả dữ liệu
          </button>
        )}
      </section>

      <section aria-label="Tải dữ liệu mới">
        <h2 className="text-on-surface mb-md font-semibold flex items-center gap-2">
          <MaterialIcon name="upload" className="text-primary" />
          Tải nhóm mới
        </h2>
        <ZaloLocalUpload
          onFile={loadGroupFromFile}
          busy={uploadBusy}
          error={uploadError}
        />
      </section>

      <section className="border-outline-variant bg-surface-container-low rounded-xl border p-lg" aria-label="Thông tin kỹ thuật">
        <h2 className="text-on-surface mb-md font-semibold flex items-center gap-2">
          <MaterialIcon name="info" className="text-primary" />
          Thông tin
        </h2>
        <dl className="space-y-sm text-sm">
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Lưu trữ</dt>
            <dd className="text-on-surface font-medium">Session Storage (trình duyệt)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Định dạng hỗ trợ</dt>
            <dd className="text-on-surface font-medium">messages.json (Zalo Crawler)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Xuất</dt>
            <dd className="text-on-surface font-medium">CSV (UTF-8 BOM)</dd>
          </div>
        </dl>
        <p className="text-on-surface-variant mt-md text-xs">
          Dữ liệu được lưu trong session — sẽ mất khi đóng tab. Không có dữ liệu nào được gửi lên máy chủ.
        </p>
      </section>
    </div>
  );
}
