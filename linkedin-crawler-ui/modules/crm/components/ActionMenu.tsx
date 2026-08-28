'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from './icons';

export type ActionMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Nút "⋯" mở dropdown chứa các hành động phụ (Sửa, Xóa, Tạo deal...) —
 * dùng chung cho mọi bảng/row trong CRM để tránh hàng nút hành động bị
 * bóp/wrap ở màn hình hẹp. Tự đóng khi click ra ngoài, cuộn trang, hoặc
 * nhấn Escape.
 *
 * Danh sách dropdown render qua Portal vào document.body (position: fixed,
 * toạ độ tính từ getBoundingClientRect() của nút bấm) — KHÔNG render lồng
 * trong .crm-table-card như trước, vì card đó có overflow:hidden (bo góc
 * bảng) nên dropdown mở ở hàng gần mép phải/dưới bị cắt mất, chỉ lộ ra vài
 * pixel (bug thực tế thấy trên UI, không phải giả thuyết).
 *
 * Dùng: <ActionMenu items={[{ key: 'edit', label: 'Sửa', onSelect: ... }]} />
 */
export function ActionMenu({ items, label = 'Thao tác khác' }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    // Dong menu khi cuon (trang hoac ben trong bang) thay vi theo doi lai vi
    // tri lien tuc - don gian, dung idiom pho bien cua cac thu vien dropdown.
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div className="crm-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="crm-icon-action crm-action-menu-trigger"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={event => {
          event.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        }}
      >
        <MoreVertical className="crm-inline-icon" />
      </button>
      {open && position
        ? createPortal(
            <div
              ref={listRef}
              className="crm-action-menu-list crm-action-menu-list--portal"
              role="menu"
              style={{ top: position.top, right: position.right }}
            >
              {items.map(item => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={`crm-action-menu-item ${item.danger ? 'crm-action-menu-item--danger' : ''}`}
                  onClick={event => {
                    event.stopPropagation();
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
