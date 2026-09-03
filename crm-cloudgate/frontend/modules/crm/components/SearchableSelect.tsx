'use client';

import { useEffect, useRef, useState } from 'react';

type Option = string | { value: string; label: string };

function optionValue(option: Option): string {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option: Option): string {
  return typeof option === 'string' ? option : option.label;
}

// Bỏ dấu tiếng Việt để search không phân biệt dấu (vd gõ "giam doc" vẫn khớp
// "Giám đốc") — dùng chung cho mọi nơi gọi SearchableSelect, không riêng gì
// Chức vụ, vì lợi ích này áp dụng tốt như nhau cho Nguồn/Gói/Lĩnh vực.
function foldDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

/** Dropdown <select> tùy biến (trigger + menu tìm kiếm được) — dùng thay cho
 * <select> gốc để mọi dropdown trong form CRM có cùng 1 kiểu hiển thị, không
 * lệ thuộc vào cách mỗi trình duyệt tự vẽ <select>/<option> gốc. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '-- Chọn --',
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = search.trim()
    ? options.filter(o => foldDiacritics(optionLabel(o)).includes(foldDiacritics(search.trim())))
    : options;

  const selectedLabel = options.find(o => optionValue(o) === value);

  return (
    <div ref={containerRef} className="crm-searchable-select">
      <button
        type="button"
        className="crm-searchable-select-trigger"
        onClick={() => !disabled && setIsOpen(open => !open)}
        disabled={disabled}
      >
        <span>{selectedLabel ? optionLabel(selectedLabel) : placeholder}</span>
        <span aria-hidden>▾</span>
      </button>
      {isOpen && !disabled ? (
        <div className="crm-searchable-select-menu">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm..."
            className="crm-searchable-select-input"
          />
          <div className="crm-searchable-select-list">
            <button
              type="button"
              className="crm-searchable-select-option"
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
            >
              {placeholder}
            </button>
            {filtered.map(option => (
              <button
                key={optionValue(option)}
                type="button"
                className={`crm-searchable-select-option ${value === optionValue(option) ? 'is-selected' : ''}`}
                onClick={() => { onChange(optionValue(option)); setIsOpen(false); setSearch(''); }}
              >
                {optionLabel(option)}
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="crm-searchable-select-empty">Không tìm thấy</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
