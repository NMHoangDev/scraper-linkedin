"use client";

import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/ui";
import type { ZaloMessage } from "@/types/zalo";
import { ZaloMessageItem } from "./ZaloMessageItem";

const PAGE_SIZE = 50;

interface ZaloMessageListProps {
  messages: ZaloMessage[];
  selectedIndex: number | null;
  groupId: string;
  userId: string;
  onSelect: (index: number) => void;
}

export function ZaloMessageList({
  messages,
  selectedIndex,
  groupId,
  userId,
  onSelect,
}: ZaloMessageListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [messages]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, messages.length));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="text-on-surface-variant flex flex-col items-center gap-3 py-16 text-center">
        <MaterialIcon name="search_off" className="text-5xl opacity-30" />
        <p className="text-sm">Không tìm thấy tin nhắn nào.</p>
      </div>
    );
  }

  const visible = messages.slice(0, visibleCount);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto min-h-0 px-md py-sm">
        <div className="flex flex-col gap-sm" role="list">
          {visible.map((msg, i) => (
            <div key={i} role="listitem">
              <ZaloMessageItem
                message={msg}
                index={i}
                selected={selectedIndex === i}
                groupId={groupId}
                userId={userId}
                onSelect={onSelect}
              />
            </div>
          ))}

          {visibleCount < messages.length && (
            <div ref={sentinelRef} className="text-on-surface-variant py-4 text-center text-sm">
              <span className="animate-pulse">Đang tải thêm...</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-outline-variant text-on-surface-variant shrink-0 border-t px-md py-xs text-center text-xs">
        {Math.min(visibleCount, messages.length)}/{messages.length} tin nhắn
      </div>
    </div>
  );
}
