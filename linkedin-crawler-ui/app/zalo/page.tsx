"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { MaterialIcon } from "@/components/ui";
import { useZaloCrawler } from "@/hooks/useZaloCrawler";
import { ZaloCrawlControls } from "@/components/features/zalo";
import {
  fetchZaloGroups,
  fetchZaloStatus,
  type ZaloApiGroup,
  type ZaloApiStatus,
} from "@/services/zaloCrawlerService";
import type { ZaloGroupMeta } from "@/types/zalo";

function apiGroupToMeta(g: ZaloApiGroup): ZaloGroupMeta {
  return {
    id: g.id,
    name: g.name,
    messageCount: g.messageCount,
    senderCount: 0,
    mediaCount: 0,
  };
}

export default function ZaloDashboardPage() {
  const { groupMetas } = useZaloCrawler();

  const [apiGroups, setApiGroups] = useState<ZaloApiGroup[]>([]);
  const [apiStatus, setApiStatus] = useState<ZaloApiStatus | null>(null);
  const [apiError, setApiError] = useState(false);

  const loadApiData = useCallback(() => {
    Promise.all([fetchZaloGroups(), fetchZaloStatus()])
      .then(([groups, status]) => {
        setApiGroups(groups);
        setApiStatus(status);
        setApiError(false);
      })
      .catch(() => setApiError(true));
  }, []);

  useEffect(() => {
    loadApiData();
  }, [loadApiData]);

  const apiGroupIds = new Set(apiGroups.map((g) => g.id));
  const localOnlyMetas = groupMetas.filter((m) => !apiGroupIds.has(m.id));
  const allGroupMetas: ZaloGroupMeta[] = [
    ...apiGroups.map(apiGroupToMeta),
    ...localOnlyMetas,
  ];

  const backendReady = apiStatus?.ready === true;

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-on-surface text-2xl font-black">Zalo Crawler</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Crawl và xem dữ liệu tin nhắn các nhóm Zalo.
        </p>
      </div>

      {!apiError && apiStatus && !backendReady && (
        <div className="border-outline-variant bg-surface-container-low flex items-start gap-3 rounded-xl border px-md py-sm text-sm">
          <MaterialIcon name="info" className="text-primary mt-0.5 shrink-0" />
          <p className="text-on-surface-variant">
            Backend chưa cấu hình đầy đủ. Thiếu{" "}
            {!apiStatus.profileConfigured && (
              <code className="bg-surface-container rounded px-1">ZALO_PROFILE_DIR</code>
            )}
            {!apiStatus.outputConfigured && (
              <code className="bg-surface-container ml-1 rounded px-1">ZALO_OUTPUT_DIR</code>
            )}{" "}
            trong <code className="bg-surface-container rounded px-1">.env</code>.
          </p>
        </div>
      )}

      <div className="grid gap-lg lg:grid-cols-[1fr_360px]">
        <section aria-label="Danh sách nhóm">
          <div className="mb-md flex items-baseline justify-between">
            <h2 className="text-on-surface font-semibold">
              Nhóm ({allGroupMetas.length})
            </h2>
            {apiGroups.length > 0 && localOnlyMetas.length > 0 && (
              <span className="text-on-surface-variant text-xs">
                {apiGroups.length} từ backend · {localOnlyMetas.length} local
              </span>
            )}
          </div>

          {allGroupMetas.length === 0 ? (
            <div className="text-on-surface-variant flex flex-col items-center gap-3 py-16 text-center">
              <MaterialIcon name="chat_bubble" className="text-5xl opacity-30" />
              <p className="text-sm">
                {apiError
                  ? "Không kết nối được backend."
                  : "Chưa có dữ liệu. Nhấn Bắt đầu crawl để thu thập tin nhắn."}
              </p>
            </div>
          ) : (
            <div className="grid gap-md sm:grid-cols-2 xl:grid-cols-3">
              {allGroupMetas.map((g) => {
                const apiGroup = apiGroups.find((a) => a.id === g.id);
                return (
                  <article
                    key={g.id}
                    className="border-outline-variant bg-surface flex flex-col gap-md rounded-xl border p-md transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-2">
                      <MaterialIcon name="chat_bubble" className="text-primary mt-0.5 shrink-0" />
                      <h3 className="text-on-surface min-w-0 flex-1 truncate font-semibold text-sm">
                        {g.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-md text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <MaterialIcon name="chat" className="text-sm" />
                        {g.messageCount.toLocaleString()} tin
                      </span>
                      {apiGroup?.lastCrawl && (
                        <span className="flex items-center gap-1">
                          <MaterialIcon name="history" className="text-sm" />
                          {new Date(apiGroup.lastCrawl).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/zalo/group/${g.id}`}
                      className="bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-md py-sm text-sm font-semibold transition-colors"
                    >
                      <MaterialIcon name="visibility" className="text-base" />
                      Xem tin nhắn
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside aria-label="Crawl">
          {backendReady ? (
            <ZaloCrawlControls groups={apiGroups} onCrawlDone={loadApiData} />
          ) : (
            <div className="border-outline-variant bg-surface-container-low rounded-xl border p-lg text-center">
              <MaterialIcon name="radar" className="text-on-surface-variant mx-auto mb-sm text-4xl opacity-40" />
              <p className="text-on-surface-variant text-sm">
                Cấu hình backend để bật tính năng crawl tự động.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
