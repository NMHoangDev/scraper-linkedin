"use client";

import Link from "next/link";

import { MaterialIcon } from "@/components/ui";
import type { ZaloGroupMeta } from "@/types/zalo";

interface ZaloGroupCardProps {
  group: ZaloGroupMeta;
  onRemove: (name: string) => void;
}

export function ZaloGroupCard({ group, onRemove }: ZaloGroupCardProps) {
  return (
    <article className="border-outline-variant bg-surface group flex flex-col gap-md rounded-xl border p-md transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <MaterialIcon name="chat_bubble" className="text-primary shrink-0" />
          <h3 className="text-on-surface min-w-0 truncate font-semibold">
            {group.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onRemove(group.name)}
          className="text-on-surface-variant hover:text-error shrink-0 rounded p-1 transition-colors"
          aria-label={`Xoá nhóm ${group.name}`}
        >
          <MaterialIcon name="delete" className="text-lg" />
        </button>
      </div>

      <div className="flex flex-wrap gap-lg text-sm">
        <div className="text-on-surface-variant flex items-center gap-1">
          <MaterialIcon name="chat" className="text-base" />
          <span>{group.messageCount.toLocaleString()} tin nhắn</span>
        </div>
        <div className="text-on-surface-variant flex items-center gap-1">
          <MaterialIcon name="person" className="text-base" />
          <span>{group.senderCount} người gửi</span>
        </div>
        {group.mediaCount > 0 && (
          <div className="text-on-surface-variant flex items-center gap-1">
            <MaterialIcon name="image" className="text-base" />
            <span>{group.mediaCount} media</span>
          </div>
        )}
      </div>

      <Link
        href={`/zalo/group/${group.id}`}
        className="bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-md py-sm text-sm font-semibold transition-colors"
      >
        <MaterialIcon name="visibility" className="text-base" />
        Xem tin nhắn
      </Link>
    </article>
  );
}
