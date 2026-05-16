"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { MaterialIcon } from "@/components/ui";
import { useZaloCrawler } from "@/hooks/useZaloCrawler";
import {
  ZaloMessageList,
  ZaloMessageViewer,
  ZaloSearchFilterBar,
  ZaloExportControls,
  ZaloLocalUpload,
} from "@/components/features/zalo";
import { fetchZaloMessages } from "@/services/zaloCrawlerService";
import type { ZaloMessage } from "@/types/zalo";

type DataSource = "api" | "local" | "none";

export default function ZaloGroupPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const groupId = params.groupId ?? "";
  const groupName = decodeURIComponent(groupId);

  const {
    groups,
    filters,
    setFilters,
    selectedMsgIndex,
    setSelectedMsgIndex,
    getFilteredMessages,
    uniqueSenders,
    loadGroupFromFile,
    uploadError,
    uploadBusy,
  } = useZaloCrawler();

  const [apiMessages, setApiMessages] = useState<ZaloMessage[] | null>(null);
  const [apiTotal, setApiTotal] = useState(0);
  const [source, setSource] = useState<DataSource>("none");
  const [loadingApi, setLoadingApi] = useState(true);

  const loadFromApi = useCallback(async () => {
    setLoadingApi(true);
    try {
      const page = await fetchZaloMessages(groupId, 0, 2000);
      setApiMessages(page.messages);
      setApiTotal(page.total);
      setSource("api");
    } catch {
      setApiMessages(null);
      setSource(groups[groupName] ? "local" : "none");
    } finally {
      setLoadingApi(false);
    }
  }, [groupId, groupName, groups]);

  useEffect(() => {
    void loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    if (!loadingApi && apiMessages === null && groups[groupName]) {
      setSource("local");
    }
  }, [loadingApi, apiMessages, groups, groupName]);

  const allMessages: ZaloMessage[] =
    source === "api" ? (apiMessages ?? []) : groups[groupName] ?? [];

  const filteredMessages =
    source === "api"
      ? allMessages.filter((m) => {
          if (filters.hasMedia && m.image_urls.length === 0 && (m.image_files ?? []).length === 0) return false;
          if (filters.sender && m.sender !== filters.sender) return false;
          if (filters.query && !m.content.toLowerCase().includes(filters.query.toLowerCase()))
            return false;
          return true;
        })
      : getFilteredMessages(groupName);

  const senders = [...new Set(allMessages.map((m) => m.sender).filter(Boolean))] as string[];
  const selectedMsg =
    selectedMsgIndex !== null ? filteredMessages[selectedMsgIndex] ?? null : null;

  if (loadingApi) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-on-surface-variant flex flex-col items-center gap-3">
          <MaterialIcon name="hourglass_top" className="animate-pulse text-4xl" />
          <p className="text-sm">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (source === "none") {
    return (
      <div className="mx-auto max-w-md space-y-lg py-12">
        <div className="text-center">
          <MaterialIcon name="search_off" className="text-on-surface-variant mx-auto text-6xl opacity-30" />
          <h2 className="text-on-surface mt-4 font-semibold">Không tìm thấy dữ liệu</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            Nhóm &quot;{groupName}&quot; chưa được crawl. Tải file messages.json hoặc crawl từ backend.
          </p>
        </div>
        <ZaloLocalUpload
          onFile={async (f, n) => {
            await loadGroupFromFile(f, n ?? groupName);
            setSource("local");
          }}
          busy={uploadBusy}
          error={uploadError}
        />
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/zalo")}
            className="text-primary text-sm hover:underline"
          >
            ← Về Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-on-surface-variant hover:text-on-surface rounded p-1 transition-colors"
          aria-label="Quay lại"
        >
          <MaterialIcon name="arrow_back" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-on-surface truncate font-black">{groupName}</h1>
          <p className="text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${source === "api" ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
              {source === "api" ? "Backend" : "Local"}
            </span>
            {allMessages.length.toLocaleString()} tin nhắn · {senders.length} người gửi
            {source === "api" && apiTotal > allMessages.length && ` · ${apiTotal.toLocaleString()} tổng`}
          </p>
        </div>

      </div>

      <ZaloSearchFilterBar filters={filters} senders={senders} onChange={setFilters} />

      <ZaloExportControls
        messages={filteredMessages}
        groupName={groupName}
        filteredCount={filteredMessages.length}
        totalCount={allMessages.length}
      />

      <div
        className="grid gap-md lg:grid-cols-[1fr_380px]"
        style={{ height: "calc(100vh - 300px)" }}
      >
        <section
          className="border-outline-variant overflow-hidden rounded-xl border"
          aria-label="Danh sách tin nhắn"
        >
          <ZaloMessageList
            messages={filteredMessages}
            selectedIndex={selectedMsgIndex}
            groupId={groupId}
            onSelect={setSelectedMsgIndex}
          />
        </section>

        <aside aria-label="Chi tiết tin nhắn" className="h-full">
          <ZaloMessageViewer
            message={selectedMsg}
            index={selectedMsgIndex}
            total={filteredMessages.length}
            groupId={groupId}
            onPrev={() => setSelectedMsgIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
            onNext={() =>
              setSelectedMsgIndex((i) =>
                i !== null && i < filteredMessages.length - 1 ? i + 1 : i,
              )
            }
            onClose={() => setSelectedMsgIndex(null)}
          />
        </aside>
      </div>
    </div>
  );
}
