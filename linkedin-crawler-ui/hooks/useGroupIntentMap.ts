/**
 * useGroupIntentMap — fetch presetGroups và build URL → intent lookup map.
 *
 * Normalize URL: bỏ trailing slash, lowercase để match linh hoạt.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FacebookGroupDTO } from "@/components/nguyen/modules/crawldFB/types/dataFb.type";
import {
  getPresetGroupsService,
  getLinkedInGroupsService,
} from "@/components/nguyen/modules/crawldFB/services/group";

function normalizeGroupUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export interface GroupIntentMap {
  /** Tra intent theo group URL — null nếu không tìm thấy. */
  getIntent: (groupUrl: string) => string | null;
  isLoading: boolean;
  linkedinIntents: string[];
}

/**
 * Fetch preset groups (FB + LinkedIn) rồi build Map<url, intent>.
 * @param linkedInEmail — email để fetch LinkedIn groups. Bỏ trống nếu chỉ cần FB.
 */
export function useGroupIntentMap(linkedInEmail?: string | null): GroupIntentMap {
  const [groups, setGroups] = useState<FacebookGroupDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const email = linkedInEmail?.trim() ?? "";

    Promise.all([
      getPresetGroupsService().catch(() => [] as FacebookGroupDTO[]),
      getLinkedInGroupsService(email).catch(() => [] as FacebookGroupDTO[]),
    ])
      .then(([fbData, liData]) => {
        if (cancelled) return;
        const fb = fbData.map((g) => ({ ...g, platform: "facebook" as const }));
        const li = liData.map((g) => ({ ...g, platform: "linkedin" as const }));
        setGroups([...fb, ...li]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [linkedInEmail]);

  const urlToIntent = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      if (!g.url || !g.intent) continue;
      map.set(normalizeGroupUrl(g.url), g.intent);
    }
    return map;
  }, [groups]);

  const linkedinIntents = useMemo(() => {
    const intentsSet = new Set<string>();
    for (const g of groups) {
      if (g.platform === "linkedin" && g.intent?.trim()) {
        intentsSet.add(g.intent.trim());
      }
    }
    return Array.from(intentsSet).sort();
  }, [groups]);

  return {
    getIntent: (groupUrl: string) => {
      if (!groupUrl) return null;
      return urlToIntent.get(normalizeGroupUrl(groupUrl)) ?? null;
    },
    isLoading,
    linkedinIntents,
  };
}
