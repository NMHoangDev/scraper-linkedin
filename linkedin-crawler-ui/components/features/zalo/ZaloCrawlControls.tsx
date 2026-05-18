"use client";

import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/ui";
import {
  startZaloCrawl,
  fetchZaloCrawlStatus,
  fetchZaloCrawlScreenshot,
  stopZaloCrawl,
  type ZaloCrawlJob,
  type ZaloApiGroup,
} from "@/services/zaloCrawlerService";

function parseJobProgress(job: ZaloCrawlJob): { currentGroup: string | null; round: number | null } {
  let currentGroup: string | null = null;
  let round: number | null = null;
  for (const line of job.logs) {
    const groupMatch = /===\s*(.+?)\s*===/.exec(line);
    if (groupMatch) currentGroup = groupMatch[1];
    const roundMatch = /Round\s+(\d+)/i.exec(line);
    if (roundMatch) round = parseInt(roundMatch[1], 10);
  }
  return { currentGroup, round };
}

function ZaloJobProgress({ job }: { job: ZaloCrawlJob }) {
  const [showLogs, setShowLogs] = useState(false);
  const totalGroups = job.groups.length;
  const doneGroups = Object.keys(job.results).length;
  const pct = totalGroups > 0 ? Math.round((doneGroups / totalGroups) * 100) : 0;
  const { currentGroup, round } = parseJobProgress(job);

  const statusColor =
    job.status === "done"
      ? "text-green-700"
      : job.status === "error"
        ? "text-red-600"
        : job.status === "stopped"
          ? "text-orange-600"
          : "text-primary";

  const barColor =
    job.status === "done"
      ? "bg-green-500"
      : job.status === "error"
        ? "bg-red-500"
        : job.status === "stopped"
          ? "bg-orange-400"
          : "bg-primary";

  const statusLabel: Record<ZaloCrawlJob["status"], string> = {
    pending: "Đang chuẩn bị...",
    running: "Đang crawl...",
    done: "Hoàn thành",
    error: "Lỗi",
    stopped: "Đã dừng",
  };

  return (
    <div className="border-outline-variant rounded-xl border p-md space-y-sm">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel[job.status]}</span>
        <span className="text-on-surface-variant text-xs">
          {doneGroups}/{totalGroups} nhóm
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${job.status === "done" ? 100 : pct}%` }}
        />
      </div>

      {(job.status === "running" || job.status === "pending") && (
        <div className="text-on-surface-variant text-xs space-y-0.5">
          {currentGroup && (
            <p className="truncate">
              <span className="font-medium">Nhóm:</span> {currentGroup}
            </p>
          )}
          {round !== null && (
            <p>
              <span className="font-medium">Lượt cuộn:</span> {round}
            </p>
          )}
        </div>
      )}

      {job.status === "done" && doneGroups > 0 && (
        <div className="text-xs text-on-surface-variant space-y-0.5">
          {Object.entries(job.results).map(([grp, res]) => (
            <div key={grp} className="flex items-center gap-1.5 truncate">
              <MaterialIcon
                name={res.success ? "check_circle" : "error"}
                className={`shrink-0 text-sm ${res.success ? "text-green-600" : "text-red-500"}`}
              />
              <span className="truncate">{grp}</span>
              {res.success && res.messageCount !== undefined && (
                <span className="ml-auto shrink-0">({res.messageCount.toLocaleString()} tin)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {job.logs.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="text-on-surface-variant hover:text-on-surface text-xs underline"
          >
            {showLogs ? "Ẩn chi tiết" : "Xem chi tiết"}
          </button>
          {showLogs && (
            <div className="mt-xs bg-surface-container max-h-32 overflow-y-auto rounded-lg px-sm py-xs font-mono text-[10px] text-on-surface-variant">
              {job.logs.map((line, i) => (
                <p key={i} className="whitespace-pre-wrap">{line}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ZaloCrawlControlsProps {
  userId: string;
  groups: ZaloApiGroup[];
  onCrawlDone: () => void;
}

export function ZaloCrawlControls({ userId, groups, onCrawlDone }: ZaloCrawlControlsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [job, setJob] = useState<ZaloCrawlJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  // true once the QR image has been fetched at least once
  const [hasQr, setHasQr] = useState(false);

  const crawlPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrFetchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrImgRef = useRef<HTMLImageElement>(null);

  const isRunning = job?.status === "pending" || job?.status === "running";
  const isLoginPhase = isRunning && (job?.phase === "login" || !job?.phase);
  const isCrawlingPhase = isRunning && job?.phase === "crawling";

  // Poll crawl status — status only, no screenshot
  useEffect(() => {
    if (!isRunning) return;
    crawlPollRef.current = setInterval(() => {
      fetchZaloCrawlStatus(userId)
        .then((j) => {
          if (j) setJob(j);
          if (j?.status === "done" || j?.status === "error" || j?.status === "stopped") {
            clearInterval(crawlPollRef.current!);
            if (j.status === "done") onCrawlDone();
          }
        })
        .catch(() => clearInterval(crawlPollRef.current!));
    }, 3000);
    return () => { if (crawlPollRef.current) clearInterval(crawlPollRef.current); };
  }, [isRunning, userId, onCrawlDone]);

  // Fetch QR screenshot exactly once when login phase starts — no auto-repeat
  useEffect(() => {
    if (!isLoginPhase || hasQr) return;
    qrFetchRef.current = setInterval(() => {
      fetchZaloCrawlScreenshot(userId)
        .then((r) => {
          if (qrImgRef.current) {
            qrImgRef.current.src = `data:image/png;base64,${r.screenshot}`;
          }
          setHasQr(true);
          clearInterval(qrFetchRef.current!);
        })
        .catch(() => {}); // 404 while browser is still launching — keep retrying
    }, 2000);
    return () => { if (qrFetchRef.current) clearInterval(qrFetchRef.current); };
  }, [isLoginPhase, hasQr, userId]);

  const toggleGroup = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleCrawl = async () => {
    setError(null);
    setBusy(true);
    setHasQr(false);
    try {
      const crawlGroups = selected.size > 0 ? [...selected] : groups.map((g) => g.name);
      const j = await startZaloCrawl(userId, crawlGroups);
      setJob(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bắt đầu crawl");
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshQr = () => {
    fetchZaloCrawlScreenshot(userId)
      .then((r) => {
        if (qrImgRef.current) {
          qrImgRef.current.src = `data:image/png;base64,${r.screenshot}`;
        }
        if (!hasQr) setHasQr(true);
      })
      .catch(() => {});
  };

  const handleStop = async () => {
    setStopping(true);
    try { await stopZaloCrawl(userId); } catch { /* ignore */ }
    finally { setStopping(false); }
  };

  return (
    <div className="border-outline-variant bg-surface rounded-xl border p-lg space-y-md">
      <div className="flex items-center gap-2">
        <MaterialIcon name="radar" className="text-primary" />
        <h3 className="text-on-surface font-semibold">Crawl nhóm</h3>
      </div>

      {/* Group selection — only when idle */}
      {groups.length > 0 && !isRunning && (
        <div className="space-y-xs">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            Chọn nhóm (để trống = tất cả)
          </p>
          {groups.map((g) => (
            <label key={g.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                checked={selected.has(g.name)}
                onChange={() => toggleGroup(g.name)}
              />
              <span className="text-on-surface">{g.name}</span>
              {g.hasCrawledData && (
                <span className="text-on-surface-variant text-xs">
                  ({g.messageCount.toLocaleString()} tin)
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {/* ── Main flow ── */}
      {isLoginPhase ? (
        <div className="space-y-sm">
          {!hasQr ? (
            <div className="flex items-center justify-center gap-2 py-sm text-sm text-on-surface-variant">
              <MaterialIcon name="hourglass_top" className="animate-pulse text-primary" />
              Đang mở trình duyệt...
            </div>
          ) : (
            <div className="space-y-xs">
              <p className="text-on-surface-variant text-xs text-center">
                Quét mã QR bằng ứng dụng Zalo trên điện thoại
              </p>
              <div className="rounded-lg overflow-hidden border border-outline-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={qrImgRef} alt="Zalo QR code" className="w-full" />
              </div>
              <button
                type="button"
                onClick={handleRefreshQr}
                className="flex w-full items-center justify-center gap-1.5 text-on-surface-variant hover:text-on-surface text-xs underline"
              >
                <MaterialIcon name="refresh" className="text-sm" />
                Làm mới ảnh
              </button>
              <p className="text-on-surface-variant animate-pulse text-center text-xs">
                Đang chờ đăng nhập...
              </p>
            </div>
          )}
          <button
            type="button"
            disabled={stopping}
            onClick={() => void handleStop()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-md py-sm text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <MaterialIcon name="close" className="text-base" />
            {stopping ? "Đang hủy..." : "Hủy"}
          </button>
        </div>

      ) : isCrawlingPhase ? (
        <div className="space-y-sm">
          <ZaloJobProgress job={job!} />
          <button
            type="button"
            disabled={stopping}
            onClick={() => void handleStop()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-md py-sm text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <MaterialIcon name="close" className="text-base" />
            {stopping ? "Đang dừng..." : "Dừng crawl"}
          </button>
        </div>

      ) : isRunning ? (
        <div className="flex items-center justify-center gap-2 py-sm text-sm text-on-surface-variant">
          <MaterialIcon name="hourglass_top" className="animate-pulse text-primary" />
          Đang chuẩn bị...
        </div>

      ) : (
        <button
          type="button"
          onClick={() => void handleCrawl()}
          disabled={busy}
          className="bg-primary text-on-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-md py-sm font-semibold transition-colors disabled:opacity-60"
        >
          <MaterialIcon name="radar" className="text-base" />
          {busy ? "Đang khởi động..." : "Bắt đầu crawl"}
        </button>
      )}

      {error && (
        <p className="border-error-container bg-error-container/30 text-error rounded-lg border px-md py-sm text-sm">
          {error}
        </p>
      )}

      {/* Summary after completion */}
      {job && !isRunning && <ZaloJobProgress job={job} />}
    </div>
  );
}
