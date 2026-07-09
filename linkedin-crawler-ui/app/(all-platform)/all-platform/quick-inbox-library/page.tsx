"use client";

import { useMemo, useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuickInboxLibrary, type QuickInboxLibraryEntry } from "@/components/all-platform/components/use-quick-inbox-library";
import { useAppAuth } from "@/contexts/AppAuthContext";

const LABELS = ["Chào hỏi", "Follow-up", "Chốt đơn", "Giới thiệu", "CSKH", "Khác"];

function libraryFilter(items: QuickInboxLibraryEntry[], filter: string, label: string) {
  const normalizedFilter = filter.trim().toLowerCase();
  return items.filter((item) => {
    const matchesLabel = label ? item.label === label : true;
    const matchesText =
      !normalizedFilter ||
      item.title.toLowerCase().includes(normalizedFilter) ||
      item.label.toLowerCase().includes(normalizedFilter) ||
      item.content.toLowerCase().includes(normalizedFilter);
    return matchesLabel && matchesText;
  });
}

export default function QuickInboxLibraryPage() {
  const { user } = useAppAuth();
  const {
    libraryItems,
    history,
    isLoaded,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    moveTemplate,
  } = useQuickInboxLibrary();

  const [search, setSearch] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    label: "",
    content: "",
    contentWithPost: "",
  });

  const filteredItems = useMemo(() => libraryFilter(libraryItems, search, selectedLabel), [libraryItems, search, selectedLabel]);

  const handleOpenNew = () => {
    setEditingId(null);
    setDraft({ title: "", label: "", content: "", contentWithPost: "" });
  };

  const handleEdit = (item: QuickInboxLibraryEntry) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      label: item.label,
      content: item.content,
      contentWithPost: item.contentWithPost || "",
    });
  };

  const handleSave = () => {
    const payload = {
      title: draft.title,
      label: draft.label || "Khác",
      content: draft.content,
      contentWithPost: draft.contentWithPost || undefined,
    };
    if (!payload.title.trim() || !payload.content.trim()) {
      return;
    }
    if (editingId) {
      updateTemplate(editingId, payload);
    } else {
      createTemplate(payload);
    }
    setEditingId(null);
    setDraft({ title: "", label: "", content: "", contentWithPost: "" });
  };

  if (!isLoaded) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải thư viện...</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-surface min-h-screen text-foreground">
      <div className="rounded-[32px] border border-border bg-card/90 p-6 shadow-sm shadow-slate-200/30">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Quick Inbox Library</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-7">
              Quản lý mẫu câu dùng cho nút Inbox ngay. Mọi người có thể xem và dùng, phần lịch sử thay đổi được lưu lại.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="default" onClick={handleOpenNew}>
              <MaterialIcon name="add" /> Thêm mẫu
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-border bg-white/90 p-5 shadow-sm shadow-slate-200/20">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Tìm kiếm title / label / nội dung..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={() => setSearch("")}>Xóa</Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedLabel === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                onClick={() => setSelectedLabel("")}
              >
                Tất cả
              </button>
              {LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedLabel === label ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  onClick={() => setSelectedLabel(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredItems.length === 0 ? (
              <div className="rounded-[28px] border border-border bg-surface p-6 text-sm text-muted-foreground shadow-sm shadow-slate-200/10">
                Không có mẫu phù hợp. Vui lòng thêm mẫu mới hoặc thay đổi bộ lọc.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="rounded-[28px] border border-border bg-white/95 p-5 shadow-sm shadow-slate-200/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline">{item.label}</Badge>
                        <span className="text-sm font-semibold text-foreground truncate">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-6">{item.content}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => moveTemplate(item.id, "up")}> <MaterialIcon name="arrow_upward" /> </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => moveTemplate(item.id, "down")}> <MaterialIcon name="arrow_downward" /> </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(item)}> <MaterialIcon name="edit" /> </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => deleteTemplate(item.id)}> <MaterialIcon name="delete" /> </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-border bg-card/90 p-5 shadow-sm shadow-slate-200/20">
            <h2 className="text-base font-semibold text-foreground mb-4">Thêm / sửa mẫu</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Title</label>
                <Input
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Tên mẫu hiển thị"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Label</label>
                <Input
                  value={draft.label}
                  onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="Ví dụ: Chào hỏi, Follow-up"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nội dung chính</label>
                <Textarea
                  value={draft.content}
                  onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Nội dung mẫu câu"
                  rows={4}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nội dung có chèn bài khách</label>
                <Textarea
                  value={draft.contentWithPost}
                  onChange={(event) => setDraft((prev) => ({ ...prev, contentWithPost: event.target.value }))}
                  placeholder="Nội dung dùng khi có bài khách (có thể chứa {post})"
                  rows={4}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleSave}>
                  {editingId ? "Lưu thay đổi" : "Lưu mẫu"}
                </Button>
                <Button type="button" variant="outline" onClick={() => handleOpenNew()}>
                  Hủy
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card/90 p-5 shadow-sm shadow-slate-200/20">
            <h2 className="text-base font-semibold text-foreground mb-4">Lịch sử chỉnh sửa</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {history.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{new Date(entry.timestamp).toLocaleString("vi-VN")}</span>
                      <span className="font-semibold text-foreground">{entry.user}</span>
                    </div>
                    <div className="mt-3 text-sm text-foreground space-y-1">
                      <div className="font-semibold">{entry.action.toUpperCase()}</div>
                      <div>{entry.title} · {entry.label}</div>
                      {entry.before ? <div className="text-xs text-muted-foreground">Trước: {entry.before}</div> : null}
                      {entry.after ? <div className="text-xs text-muted-foreground">Sau: {entry.after}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
