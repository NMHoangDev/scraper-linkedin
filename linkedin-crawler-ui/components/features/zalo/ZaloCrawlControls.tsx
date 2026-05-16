"use client";

import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/ui";
import {
  startZaloCrawl,
  fetchZaloCrawlStatus,
  openZaloBrowser,
  fetchZaloLoginStatus,
  type ZaloCrawlJob,
  type ZaloApiGroup,
} from "@/services/zaloCrawlerService";

interface ZaloCrawlControlsProps {
  groups: ZaloApiGroup[];
  onCrawlDone: () => void;
}

type LoginStep = "idle" | "opening" | "waiting_login" | "ready";

export function ZaloCrawlControls({ groups, onCrawlDone }: ZaloCrawlControlsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [job, setJob] = useState<ZaloCrawlJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const crawlPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loginPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = job?.status === "pending" || job?.status === "running";

  // Poll crawl job status while running
  useEffect(() => {
    if (isRunning) {
      crawlPollRef.current = setInterval(() => {
        fetchZaloCrawlStatus()
          .then((j) => {
            if (j) setJob(j);
            if (j?.status === "done" || j?.status === "error") {
              clearInterval(crawlPollRef.current!);
              if (j.status === "done") onCrawlDone();
            }
          })
          .catch(() => clearInterval(crawlPollRef.current!));
      }, 3000);
    }
    return () => {
      if (crawlPollRef.current) clearInterval(crawlPollRef.current);
    };
  }, [isRunning, onCrawlDone]);

  // Poll login status while browser is opening or waiting for user to login
  useEffect(() => {
    if (loginStep !== "opening" && loginStep !== "waiting_login") return;
    loginPollRef.current = setInterval(() => {
      fetchZaloLoginStatus()
        .then((s) => {
          if (s.logged_in) {
            setLoginStep("ready");
            clearInterval(loginPollRef.current!);
          } else if (s.status === "closed") {
            setLoginStep("idle");
            clearInterval(loginPollRef.current!);
          } else if (s.status === "waiting" && loginStep === "opening") {
            setLoginStep("waiting_login");
          }
        })
        .catch(() => {});
    }, 3000);
    return () => {
      if (loginPollRef.current) clearInterval(loginPollRef.current);
    };
  }, [loginStep]);

  const toggleGroup = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleOpenBrowser = async () => {
    setError(null);
    setBusy(true);
    setLoginStep("opening");
    try {
      const result = await openZaloBrowser();
      // If already open and already logged in, skip straight to ready
      if (result.logged_in) setLoginStep("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở trình duyệt");
      setLoginStep("idle");
    } finally {
      setBusy(false);
    }
  };

  const handleCrawl = async () => {
    setError(null);
    setBusy(true);
    try {
      const crawlGroups = selected.size > 0 ? [...selected] : groups.map((g) => g.name);
      const j = await startZaloCrawl(crawlGroups);
      setJob(j);
      setLoginStep("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bắt đầu crawl");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-outline-variant bg-surface rounded-xl border p-lg space-y-md">
      <div className="flex items-center gap-2">
        <MaterialIcon name="radar" className="text-primary" />
        <h3 className="text-on-surface font-semibold">Crawl nhóm</h3>
      </div>

      {groups.length > 0 && (
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
                disabled={isRunning}
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

      {/* ── Login / crawl flow ── */}
      {isRunning ? (
        <div className="flex items-center justify-center gap-2 py-sm text-sm text-on-surface-variant">
          <MaterialIcon name="hourglass_top" className="animate-pulse text-primary" />
          Đang crawl...
        </div>
      ) : loginStep === "idle" ? (
        <button
          type="button"
          onClick={() => void handleOpenBrowser()}
          disabled={busy}
          className="bg-primary text-on-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-md py-sm font-semibold transition-colors disabled:opacity-60"
        >
          <MaterialIcon name="open_in_new" className="text-base" />
          Mở Zalo để đăng nhập
        </button>
      ) : loginStep === "opening" ? (
        <div className="flex items-center justify-center gap-2 py-sm text-sm text-on-surface-variant">
          <MaterialIcon name="hourglass_top" className="animate-pulse text-primary" />
          Đang mở Chrome...
        </div>
      ) : loginStep === "waiting_login" ? (
        <div className="border-outline-variant bg-surface-container-low space-y-sm rounded-xl border p-md">
          <div className="flex items-start gap-2">
            <MaterialIcon name="info" className="text-primary mt-0.5 shrink-0" />
            <p className="text-on-surface-variant text-sm">
              Chrome đã mở. Vui lòng đăng nhập Zalo trong cửa sổ Chrome vừa mở, sau đó quay lại đây.
            </p>
          </div>
          <p className="text-on-surface-variant animate-pulse text-center text-xs">
            Đang chờ đăng nhập...
          </p>
        </div>
      ) : loginStep === "ready" ? (
        <div className="space-y-sm">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-md py-sm text-sm text-green-700">
            <MaterialIcon name="check_circle" className="shrink-0 text-base" />
            Đã đăng nhập Zalo thành công!
          </div>
          <button
            type="button"
            onClick={() => void handleCrawl()}
            disabled={busy}
            className="bg-primary text-on-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg px-md py-sm font-semibold transition-colors disabled:opacity-60"
          >
            <MaterialIcon name="radar" className="text-base" />
            Bắt đầu crawl
          </button>
        </div>
      ) : null}

      {error && (
        <p className="border-error-container bg-error-container/30 text-error rounded-lg border px-md py-sm text-sm">
          {error}
        </p>
      )}

      {job && (
        <div className="border-outline-variant rounded-lg border">
          <div className="border-outline-variant flex items-center justify-between border-b px-md py-sm">
            <span className="text-on-surface text-sm font-semibold">Job {job.jobId}</span>
            <span
              className={[
                "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                job.status === "done"
                  ? "bg-green-100 text-green-700"
                  : job.status === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700",
              ].join(" ")}
            >
              {job.status}
            </span>
          </div>
          <div
            className="bg-surface-container max-h-40 overflow-y-auto px-md py-sm font-mono text-xs"
            aria-label="Crawl logs"
          >
            {job.logs.map((line, i) => (
              <p key={i} className="text-on-surface-variant whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
