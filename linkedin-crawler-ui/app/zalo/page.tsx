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

const ZALO_USER_KEY = "zalo_user_id";

function resolveUserId(): string {
  try {
    const email = localStorage.getItem("linkedin_crawler_email") ?? "";
    if (email) return email;
    const stored = localStorage.getItem(ZALO_USER_KEY) ?? "";
    if (stored) return stored;
    const generated = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(ZALO_USER_KEY, generated);
    return generated;
  } catch {
    return "default";
  }
}

function apiGroupToMeta(g: ZaloApiGroup): ZaloGroupMeta {
  return { id: g.id, name: g.name, messageCount: g.messageCount, senderCount: 0, mediaCount: 0 };
}

export default function ZaloDashboardPage() {
  const { groupMetas } = useZaloCrawler();

  const [userId, setUserId] = useState<string>("");
  const [editingUser, setEditingUser] = useState(false);
  const [userInput, setUserInput] = useState("");

  // Resolve userId on mount — never blocks render
  useEffect(() => {
    const uid = resolveUserId();
    setUserId(uid);
    setUserInput(uid);
  }, []);

  const saveUserId = () => {
    const trimmed = userInput.trim();
    if (!trimmed) return;
    setUserId(trimmed);
    setEditingUser(false);
    try { localStorage.setItem(ZALO_USER_KEY, trimmed); } catch { /* ignore */ }
  };

  const [apiGroups, setApiGroups] = useState<ZaloApiGroup[]>([]);
  const [apiStatus, setApiStatus] = useState<ZaloApiStatus | null>(null);
  const [apiError, setApiError] = useState(false);

  const loadApiData = useCallback(() => {
    if (!userId) return;
    Promise.all([fetchZaloGroups(userId), fetchZaloStatus(userId)])
      .then(([groups, status]) => {
        setApiGroups(groups);
        setApiStatus(status);
        setApiError(false);
      })
      .catch(() => setApiError(true));
  }, [userId]);

  useEffect(() => { loadApiData(); }, [loadApiData]);

  const apiGroupIds = new Set(apiGroups.map((g) => g.id));
  const localOnlyMetas = groupMetas.filter((m) => !apiGroupIds.has(m.id));
  const allGroupMetas: ZaloGroupMeta[] = [...apiGroups.map(apiGroupToMeta), ...localOnlyMetas];

  // Show controls whenever backend responded — even if user profile dir doesn't exist yet
  const backendReachable = apiStatus !== null;
  const backendMisconfigured = apiStatus !== null && !apiStatus.outputConfigured;

  return (
    <div className="space-y-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-on-surface text-2xl font-black">Zalo Crawler</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Crawl và xem dữ liệu tin nhắn các nhóm Zalo.
          </p>
        </div>

        {/* User identity chip */}
        <div className="border-outline-variant bg-surface-container-low flex items-center gap-2 rounded-lg border px-sm py-1.5 text-xs">
          <MaterialIcon name="person" className="text-primary text-sm" />
          {editingUser ? (
            <>
              <input
                className="border-outline-variant bg-surface text-on-surface w-40 rounded border px-2 py-0.5 text-xs focus:outline-none"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveUserId(); if (e.key === "Escape") setEditingUser(false); }}
                autoFocus
              />
              <button type="button" onClick={saveUserId} className="text-primary font-bold">Lưu</button>
              <button type="button" onClick={() => setEditingUser(false)} className="text-on-surface-variant">×</button>
            </>
          ) : (
            <>
              <span className="text-on-surface-variant max-w-[140px] truncate">{userId || "..."}</span>
              <button type="button" onClick={() => setEditingUser(true)} className="text-on-surface-variant hover:text-on-surface">
                <MaterialIcon name="edit" className="text-sm" />
              </button>
            </>
          )}
        </div>
      </div>

      {backendMisconfigured && (
        <div className="border-outline-variant bg-surface-container-low flex items-start gap-3 rounded-xl border px-md py-sm text-sm">
          <MaterialIcon name="info" className="text-primary mt-0.5 shrink-0" />
          <p className="text-on-surface-variant">
            Backend thiếu{" "}
            {!apiStatus!.outputConfigured && (
              <code className="bg-surface-container rounded px-1">ZALO_OUTPUT_DIR</code>
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
                  : "Chưa có dữ liệu. Đăng nhập Zalo và bắt đầu crawl để thu thập tin nhắn."}
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
                      href={`/zalo/group/${g.id}?user_id=${encodeURIComponent(userId)}`}
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
          {backendReachable ? (
            <ZaloCrawlControls userId={userId} groups={apiGroups} onCrawlDone={loadApiData} />
          ) : (
            <div className="border-outline-variant bg-surface-container-low rounded-xl border p-lg text-center">
              <MaterialIcon name="radar" className="text-on-surface-variant mx-auto mb-sm text-4xl opacity-40" />
              <p className="text-on-surface-variant text-sm">
                {apiError
                  ? "Không kết nối được backend. Kiểm tra API URL và API key."
                  : "Đang kết nối..."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
