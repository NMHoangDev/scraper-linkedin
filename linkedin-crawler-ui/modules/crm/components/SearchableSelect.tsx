'use client';

import { useEffect, useRef, useState } from 'react';

type Option = string | { value: string; label: string };

function optionValue(option: Option): string {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option: Option): string {
  return typeof option === 'string' ? option : option.label;
}

/** Dropdown <select> tùy biến (trigger + menu tìm kiếm được) — dùng thay cho
 * <select> gốc để mọi dropdown trong form CRM có cùng 1 kiểu hiển thị, không
 * lệ thuộc vào cách mỗi trình duyệt tự vẽ <select>/<option> gốc. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '-- Chọn --',
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
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
    ? options.filter(o => optionLabel(o).toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const selectedLabel = options.find(o => optionValue(o) === value);

  return (
    <div ref={containerRef} className="crm-searchable-select">
      <button
        type="button"
        className="crm-searchable-select-trigger"
        onClick={() => setIsOpen(open => !open)}
      >
        <span>{selectedLabel ? optionLabel(selectedLabel) : placeholder}</span>
        <span aria-hidden>▾</span>
      </button>
      {isOpen ? (
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
