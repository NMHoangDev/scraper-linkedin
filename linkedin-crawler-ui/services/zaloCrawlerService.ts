import { API_BASE_URL, API_KEY } from "@/lib/env";
import type { ZaloMessage, ZaloGroupMeta } from "@/types/zalo";

// ── API types ─────────────────────────────────────────────────────────────────

export interface ZaloApiGroup {
  id: string;
  name: string;
  messageCount: number;
  lastCrawl: string | null;
  hasCrawledData: boolean;
}

export interface ZaloApiStatus {
  profileConfigured: boolean;
  outputConfigured: boolean;
  gsheetConfigured: boolean;
  ready: boolean;
  groupCount: number;
  currentJob: ZaloCrawlJob | null;
}

export interface ZaloCrawlJob {
  jobId: string;
  groups: string[];
  status: "pending" | "running" | "done" | "error";
  logs: string[];
  startedAt: string | null;
  finishedAt: string | null;
  results: Record<string, { success: boolean; messageCount?: number; error?: string }>;
  error: string | null;
}

export interface ZaloLoginStatus {
  browser_open: boolean;
  logged_in: boolean;
  status: "closed" | "opening" | "waiting" | "logged_in";
  error: string | null;
}

export interface ZaloMessagesPage {
  messages: ZaloMessage[];
  total: number;
  offset: number;
  limit: number;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function headers(): HeadersInit {
  return API_KEY ? { "Content-Type": "application/json", "x-api-key": API_KEY } : { "Content-Type": "application/json" };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  const payload = (await res.json()) as { success: boolean; data: T; message?: string };
  if (!res.ok) throw new Error(payload.message ?? `API ${res.status}`);
  return payload.data;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export function fetchZaloStatus(): Promise<ZaloApiStatus> {
  return api<ZaloApiStatus>("/zalo/status");
}

export function fetchZaloGroups(): Promise<ZaloApiGroup[]> {
  return api<ZaloApiGroup[]>("/zalo/groups");
}

export function fetchZaloMessages(
  groupId: string,
  offset = 0,
  limit = 200,
): Promise<ZaloMessagesPage> {
  return api<ZaloMessagesPage>(
    `/zalo/groups/${encodeURIComponent(groupId)}/messages?offset=${offset}&limit=${limit}`,
  );
}

export function startZaloCrawl(groups?: string[]): Promise<ZaloCrawlJob> {
  return api<ZaloCrawlJob>("/zalo/crawl", {
    method: "POST",
    body: JSON.stringify({ groups: groups ?? null }),
  });
}

export function fetchZaloCrawlStatus(): Promise<ZaloCrawlJob | null> {
  return api<ZaloCrawlJob | null>("/zalo/crawl/status");
}

export function openZaloBrowser(): Promise<{ already_open: boolean; status: string; logged_in: boolean }> {
  return api("/zalo/login/open", { method: "POST" });
}

export function fetchZaloLoginStatus(): Promise<ZaloLoginStatus> {
  return api<ZaloLoginStatus>("/zalo/login/status");
}

export function zaloImageUrl(groupId: string, filename: string): string {
  const headers = API_KEY ? `?x-api-key=${encodeURIComponent(API_KEY)}` : "";
  return `${API_BASE_URL}/zalo/groups/${encodeURIComponent(groupId)}/images/${encodeURIComponent(filename)}${headers}`;
}

export function exportZaloGroup(groupId: string): Promise<{ logs: string[]; messageCount: number }> {
  return api(`/zalo/groups/${encodeURIComponent(groupId)}/export`, { method: "POST" });
}

// ── Local storage (file-upload fallback) ─────────────────────────────────────

const STORAGE_KEY = "zalo_crawler_groups";

export function saveGroupsToStorage(groups: Record<string, ZaloMessage[]>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // quota exceeded
  }
}

export function loadGroupsFromStorage(): Record<string, ZaloMessage[]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ZaloMessage[]>) : {};
  } catch {
    return {};
  }
}

export function buildGroupMetas(
  groups: Record<string, ZaloMessage[]>,
): ZaloGroupMeta[] {
  return Object.entries(groups).map(([name, messages]) => ({
    id: encodeURIComponent(name),
    name,
    messageCount: messages.length,
    senderCount: new Set(messages.map((m) => m.sender ?? "__unknown__")).size,
    mediaCount: messages.filter((m) => m.image_urls.length > 0).length,
  }));
}

export function exportToCsv(messages: ZaloMessage[], groupName: string): void {
  const header = ["index", "sender", "time_text", "is_sent", "content"];
  const rows = messages.map((m, i) => [
    String(i + 1),
    `"${(m.sender ?? "").replace(/"/g, '""')}"`,
    `"${(m.time_text ?? "").replace(/"/g, '""')}"`,
    m.is_sent ? "TRUE" : "FALSE",
    `"${(m.content ?? "").replace(/"/g, '""')}"`,
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${groupName.replace(/[/\\?%*:|"<>]/g, "-")}-messages.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function parseMessagesJson(text: string): ZaloMessage[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) throw new Error("File phải là mảng JSON.");
  return parsed as ZaloMessage[];
}
