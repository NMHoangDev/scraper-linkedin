import type { ZaloGroupMeta } from "@/types/zalo";
import { ZaloGroupCard } from "./ZaloGroupCard";

interface ZaloGroupListProps {
  groups: ZaloGroupMeta[];
  onRemove: (name: string) => void;
}

export function ZaloGroupList({ groups, onRemove }: ZaloGroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-on-surface-variant flex flex-col items-center gap-3 py-16 text-center">
        <span className="material-symbols-outlined text-5xl opacity-30">
          chat_bubble_outline
        </span>
        <p className="text-sm">Chưa có nhóm nào. Tải file messages.json để bắt đầu.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <ZaloGroupCard key={g.id} group={g} onRemove={onRemove} />
      ))}
    </div>
  );
}
