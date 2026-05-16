"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

import type { ZaloMessage, ZaloGroupMeta, ZaloFilterState } from "@/types/zalo";
import {
  saveGroupsToStorage,
  loadGroupsFromStorage,
  buildGroupMetas,
  parseMessagesJson,
} from "@/services/zaloCrawlerService";

function applyFilters(
  messages: ZaloMessage[],
  filters: ZaloFilterState,
): ZaloMessage[] {
  return messages.filter((m) => {
    if (filters.hasMedia && m.image_urls.length === 0 && (m.image_files ?? []).length === 0) return false;
    if (filters.sender && m.sender !== filters.sender) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!m.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function useZaloCrawler() {
  const [groups, setGroups] = useState<Record<string, ZaloMessage[]>>({});

  useEffect(() => {
    setGroups(loadGroupsFromStorage());
  }, []);
  const [filters, setFilters] = useState<ZaloFilterState>({
    query: "",
    sender: "",
    hasMedia: false,
  });
  const [selectedMsgIndex, setSelectedMsgIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const groupMetas: ZaloGroupMeta[] = useMemo(
    () => buildGroupMetas(groups),
    [groups],
  );

  const loadGroupFromFile = useCallback(
    async (file: File, groupName?: string) => {
      setUploadError(null);
      setUploadBusy(true);
      try {
        const text = await file.text();
        const messages = parseMessagesJson(text);
        const name = groupName ?? file.name.replace(/\.json$/i, "");
        const updated = { ...groups, [name]: messages };
        setGroups(updated);
        saveGroupsToStorage(updated);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Không đọc được file JSON.",
        );
      } finally {
        setUploadBusy(false);
      }
    },
    [groups],
  );

  const removeGroup = useCallback(
    (name: string) => {
      const updated = { ...groups };
      delete updated[name];
      setGroups(updated);
      saveGroupsToStorage(updated);
    },
    [groups],
  );

  const getFilteredMessages = useCallback(
    (groupName: string): ZaloMessage[] => {
      const msgs = groups[groupName] ?? [];
      return applyFilters(msgs, filters);
    },
    [groups, filters],
  );

  const getMessages = useCallback(
    (groupName: string): ZaloMessage[] => groups[groupName] ?? [],
    [groups],
  );

  const uniqueSenders = useCallback(
    (groupName: string): string[] => {
      const msgs = groups[groupName] ?? [];
      return [...new Set(msgs.map((m) => m.sender).filter(Boolean))] as string[];
    },
    [groups],
  );

  return {
    groups,
    groupMetas,
    filters,
    setFilters,
    selectedMsgIndex,
    setSelectedMsgIndex,
    uploadError,
    uploadBusy,
    loadGroupFromFile,
    removeGroup,
    getFilteredMessages,
    getMessages,
    uniqueSenders,
  };
}
