"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { INBOX_TEMPLATES, POST_PLACEHOLDER } from "./inbox-templates";

const STORAGE_KEY = "quick_inbox_library_v1";
const HISTORY_KEY = "quick_inbox_library_history_v1";
const MAX_QUOTE_LENGTH = 300;

export interface QuickInboxLibraryEntry {
  id: string;
  title: string;
  label: string;
  content: string;
  contentWithPost?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type QuickInboxLibraryAction = "create" | "update" | "delete" | "reorder";

export interface QuickInboxLibraryHistoryEntry {
  id: string;
  itemId?: string;
  action: QuickInboxLibraryAction;
  title: string;
  label: string;
  before?: string;
  after?: string;
  user?: string;
  timestamp: string;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `qi-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeItems(items: QuickInboxLibraryEntry[]) {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
}

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function buildDefaultLibraryItems(): QuickInboxLibraryEntry[] {
  const now = nowIso();
  return INBOX_TEMPLATES.flatMap((group, groupIndex) =>
    group.templates.map((template, templateIndex) => ({
      id: `fallback-${groupIndex}-${templateIndex}`,
      title: template.title,
      label: group.category,
      content: template.content,
      contentWithPost: template.contentWithPost,
      order: groupIndex * 100 + templateIndex + 1,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export function composeQuickInboxMessage(
  template: Pick<QuickInboxLibraryEntry, "content" | "contentWithPost">,
  postContent?: string | null,
): string {
  const quote = (postContent || "").replace(/\s+/g, " ").trim();
  const replacement = (text?: string) =>
    (text || template.content).replace(POST_PLACEHOLDER, quote);

  if (!quote) {
    if (template.content.includes(POST_PLACEHOLDER)) {
      return template.content.replace(POST_PLACEHOLDER, "").trim();
    }
    return template.content;
  }

  if (template.contentWithPost) {
    return replacement(template.contentWithPost);
  }

  if (template.content.includes(POST_PLACEHOLDER)) {
    return replacement(template.content);
  }

  return template.content;
}

export function useQuickInboxLibrary() {
  const { user } = useAppAuth();
  const [items, setItems] = useState<QuickInboxLibraryEntry[]>([]);
  const [history, setHistory] = useState<QuickInboxLibraryHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawItems = window.localStorage.getItem(STORAGE_KEY);
    const loadedItems = rawItems ? loadFromStorage<QuickInboxLibraryEntry[]>(STORAGE_KEY) : null;
    const loadedHistory = loadFromStorage<QuickInboxLibraryHistoryEntry[]>(HISTORY_KEY) ?? [];

    if (rawItems === null) {
      const defaults = normalizeItems(buildDefaultLibraryItems());
      setItems(defaults);
      saveToStorage(STORAGE_KEY, defaults);
    } else if (loadedItems && Array.isArray(loadedItems)) {
      setItems(normalizeItems(loadedItems));
    } else {
      setItems([]);
    }

    setHistory(Array.isArray(loadedHistory) ? loadedHistory : []);
    setIsLoaded(true);
  }, []);

  const fallbackItems = useMemo(() => normalizeItems(buildDefaultLibraryItems()), []);

  const persistItems = (nextItems: QuickInboxLibraryEntry[]) => {
    const normalized = normalizeItems(nextItems);
    setItems(normalized);
    saveToStorage(STORAGE_KEY, normalized);
  };

  const persistHistory = (nextHistory: QuickInboxLibraryHistoryEntry[]) => {
    setHistory(nextHistory);
    saveToStorage(HISTORY_KEY, nextHistory);
  };

  const addHistory = (
    action: QuickInboxLibraryAction,
    item: QuickInboxLibraryEntry,
    details: { before?: string; after?: string },
  ) => {
    const next: QuickInboxLibraryHistoryEntry[] = [
      {
        id: createId(),
        itemId: item.id,
        action,
        title: item.title,
        label: item.label,
        before: details.before,
        after: details.after,
        user: user?.email || user?.name || "Unknown",
        timestamp: nowIso(),
      },
      ...history,
    ].slice(0, 100);
    persistHistory(next);
  };

  const createTemplate = (payload: {
    title: string;
    label: string;
    content: string;
    contentWithPost?: string;
  }) => {
    const now = nowIso();
    const nextItem: QuickInboxLibraryEntry = {
      id: createId(),
      title: payload.title.trim() || payload.content.slice(0, 40),
      label: payload.label.trim(),
      content: payload.content.trim(),
      contentWithPost: payload.contentWithPost?.trim() || undefined,
      order: items.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    const nextItems = [...items, nextItem];
    persistItems(nextItems);
    addHistory("create", nextItem, { after: nextItem.content });
  };

  const updateTemplate = (
    templateId: string,
    payload: {
      title: string;
      label: string;
      content: string;
      contentWithPost?: string;
    },
  ) => {
    const now = nowIso();
    const nextItems = items.map((item) => {
      if (item.id !== templateId) return item;
      const updated: QuickInboxLibraryEntry = {
        ...item,
        title: payload.title.trim() || payload.content.slice(0, 40),
        label: payload.label.trim(),
        content: payload.content.trim(),
        contentWithPost: payload.contentWithPost?.trim() || undefined,
        updatedAt: now,
      };
      addHistory("update", updated, { before: item.content, after: updated.content });
      return updated;
    });
    persistItems(nextItems);
  };

  const deleteTemplate = (templateId: string) => {
    const target = items.find((item) => item.id === templateId);
    if (!target) return;
    const nextItems = items.filter((item) => item.id !== templateId);
    persistItems(nextItems);
    addHistory("delete", target, { before: target.content });
  };

  const moveTemplate = (templateId: string, direction: "up" | "down") => {
    const normalized = normalizeItems(items);
    const index = normalized.findIndex((item) => item.id === templateId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= normalized.length) return;
    const next = [...normalized];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    const reordered = normalizeItems(next).map((item) => ({ ...item, updatedAt: nowIso() }));
    persistItems(reordered);
    addHistory("reorder", moved, {
      before: `pos ${index + 1}`,
      after: `pos ${targetIndex + 1}`,
    });
  };

  return {
    libraryItems: items,
    fallbackItems,
    history,
    isLoaded,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    moveTemplate,
  };
}
