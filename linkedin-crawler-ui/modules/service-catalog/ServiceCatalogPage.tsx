'use client';

import { useMemo, useState } from 'react';
import { useServiceCatalog } from './use-service-catalog';
import type { ServiceCatalogItem, ServiceCatalogItemInput, ServiceCatalogItemType } from './types';
import './styles/service-catalog.css';

function emptyForm(itemType: ServiceCatalogItemType, parentId?: string): ServiceCatalogItemInput {
  return {
    itemType,
    parentId,
    sku: '',
    name: '',
    description: '',
    unit: '',
    listPriceUsd: undefined,
    unitPriceUsd: undefined,
    exchangeRateSnapshot: undefined,
    defaultUnitPriceVnd: 0,
    defaultDiscountPercent: 0,
    defaultVatRate: 0,
    specQuantityPerUnit: 1,
    specUnitLabel: '',
    note: '',
    status: 'active',
  };
}

function itemToForm(item: ServiceCatalogItem): ServiceCatalogItemInput {
  return {
    itemType: item.itemType,
    parentId: item.parentId,
    sku: item.sku || '',
    name: item.name,
    description: item.description || '',
    unit: item.unit || '',
    listPriceUsd: item.listPriceUsd,
    unitPriceUsd: item.unitPriceUsd,
    exchangeRateSnapshot: item.exchangeRateSnapshot,
    defaultUnitPriceVnd: item.defaultUnitPriceVnd,
    defaultDiscountPercent: item.defaultDiscountPercent,
    defaultVatRate: item.defaultVatRate,
    specQuantityPerUnit: item.specQuantityPerUnit,
    specUnitLabel: item.specUnitLabel || '',
    note: item.note || '',
    status: item.status,
  };
}

function formatVnd(value: number | undefined | null): string {
  return `${(value || 0).toLocaleString('vi-VN')}đ`;
}

/** "SKU – Tên" nhưng bỏ SKU nếu trùng hệt tên (vd bundle SZ-VPS đặt tên cũng là
 * "SZ-VPS" -> hiện "SZ-VPS – SZ-VPS" bị lặp thừa, chỉ cần hiện "SZ-VPS"). */
function formatSkuName(sku: string | undefined, name: string): string {
  if (!sku || sku.trim().toLowerCase() === name.trim().toLowerCase()) return name;
  return `${sku} – ${name}`;
}

type EditTarget = { mode: 'add' | 'edit'; itemType: ServiceCatalogItemType; parentId?: string; itemId?: string };

function ItemForm({
  form,
  onChange,
}: {
  form: ServiceCatalogItemInput;
  onChange: (patch: Partial<ServiceCatalogItemInput>) => void;
}) {
  return (
    <div className="sc-panel-grid">
      <label className="sc-field">
        <span>SKU</span>
        <input value={form.sku || ''} onChange={e => onChange({ sku: e.target.value })} />
      </label>
      <label className="sc-field">
        <span>Tên</span>
        <input value={form.name} onChange={e => onChange({ name: e.target.value })} />
      </label>
      <label className="sc-field">
        <span>Đơn vị tính</span>
        <input value={form.unit || ''} onChange={e => onChange({ unit: e.target.value })} />
      </label>
      <label className="sc-field">
        <span>Đơn giá VND</span>
        <input
          type="number"
          value={form.defaultUnitPriceVnd ?? 0}
          onChange={e => onChange({ defaultUnitPriceVnd: Number(e.target.value) })}
        />
      </label>
      <label className="sc-field">
        <span>List price USD</span>
        <input
          type="number"
          value={form.listPriceUsd ?? ''}
          onChange={e => onChange({ listPriceUsd: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </label>
      <label className="sc-field">
        <span>Unit price USD</span>
        <input
          type="number"
          value={form.unitPriceUsd ?? ''}
          onChange={e => onChange({ unitPriceUsd: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </label>
      <label className="sc-field">
        <span>Tỷ giá (snapshot)</span>
        <input
          type="number"
          value={form.exchangeRateSnapshot ?? ''}
          onChange={e =>
            onChange({ exchangeRateSnapshot: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
      </label>
      <label className="sc-field">
        <span>Giảm giá mặc định (%)</span>
        <input
          type="number"
          value={form.defaultDiscountPercent ?? 0}
          onChange={e => onChange({ defaultDiscountPercent: Number(e.target.value) })}
        />
      </label>
      <label className="sc-field">
        <span>VAT mặc định (%)</span>
        <input
          type="number"
          value={form.defaultVatRate ?? 0}
          onChange={e => onChange({ defaultVatRate: Number(e.target.value) })}
        />
      </label>
      {form.itemType === 'component' ? (
        <>
          <label className="sc-field">
            <span>Số lượng quy đổi / đơn vị</span>
            <input
              type="number"
              value={form.specQuantityPerUnit ?? 1}
              onChange={e => onChange({ specQuantityPerUnit: Number(e.target.value) })}
            />
          </label>
          <label className="sc-field">
            <span>Nhãn quy đổi (vd "CPU (vCPU)")</span>
            <input value={form.specUnitLabel || ''} onChange={e => onChange({ specUnitLabel: e.target.value })} />
          </label>
        </>
      ) : null}
      <label className="sc-field">
        <span>Trạng thái</span>
        <select value={form.status} onChange={e => onChange({ status: e.target.value as 'active' | 'inactive' })}>
          <option value="active">Đang sử dụng</option>
          <option value="inactive">Ngừng sử dụng</option>
        </select>
      </label>
      <label className="sc-field" style={{ gridColumn: '1 / -1' }}>
        <span>Mô tả</span>
        <textarea value={form.description || ''} onChange={e => onChange({ description: e.target.value })} />
      </label>
      <label className="sc-field" style={{ gridColumn: '1 / -1' }}>
        <span>Ghi chú</span>
        <textarea value={form.note || ''} onChange={e => onChange({ note: e.target.value })} />
      </label>
    </div>
  );
}

export function ServiceCatalogPage() {
  const { items, isLoaded, error, createItem, updateItem, deleteItem, moveItem } = useServiceCatalog();
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [form, setForm] = useState<ServiceCatalogItemInput>(emptyForm('group'));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    const result: ServiceCatalogItem[] = [];
    for (const group of items) {
      const children = (group.children || []).filter(
        child =>
          child.name.toLowerCase().includes(term) ||
          (child.sku || '').toLowerCase().includes(term)
      );
      const groupMatches = group.name.toLowerCase().includes(term);
      if (groupMatches || children.length) {
        result.push({ ...group, children: groupMatches ? group.children : children });
      }
    }
    return result;
  }, [items, search]);

  function openAdd(itemType: ServiceCatalogItemType, parentId?: string) {
    setEdit({ mode: 'add', itemType, parentId });
    setForm(emptyForm(itemType, parentId));
    setFormError(null);
  }

  function openEdit(item: ServiceCatalogItem) {
    setEdit({ mode: 'edit', itemType: item.itemType, parentId: item.parentId, itemId: item.id });
    setForm(itemToForm(item));
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Tên dịch vụ bắt buộc.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (edit?.mode === 'edit' && edit.itemId) {
        await updateItem(edit.itemId, form);
      } else {
        await createItem(form);
      }
      setEdit(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được dịch vụ.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ServiceCatalogItem) {
    if (!window.confirm(`Xoá "${item.name}"?`)) return;
    try {
      await deleteItem(item.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Không xoá được dịch vụ.');
    }
  }

  // Panel Thêm/Sửa render NGAY TẠI VỊ TRÍ đang thao tác (dưới group đang thêm
  // con, hoặc ngay dưới dòng đang sửa) thay vì 1 panel chung ở đầu trang -
  // tránh phải cuộn lên đầu mỗi lần bấm Sửa một dòng ở xa.
  const editPanel = edit ? (
    <div className="sc-panel">
      <strong>
        {edit.mode === 'add'
          ? edit.itemType === 'group'
            ? 'Thêm nhóm dịch vụ'
            : edit.itemType === 'bundle'
              ? 'Thêm gói/combo'
              : 'Thêm dịch vụ thành phần'
          : `Sửa: ${form.name}`}
      </strong>
      <ItemForm form={form} onChange={patch => setForm({ ...form, ...patch })} />
      {formError ? <div className="sc-error">{formError}</div> : null}
      <div className="sc-panel-actions">
        <button type="button" className="sc-btn" onClick={() => setEdit(null)}>
          Huỷ
        </button>
        <button type="button" className="sc-btn sc-btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="sc-page">
      <div className="sc-header">
        <h1>Danh mục dịch vụ</h1>
        <button type="button" className="sc-btn sc-btn-primary" onClick={() => openAdd('group')}>
          + Thêm nhóm dịch vụ
        </button>
      </div>

      <div className="sc-toolbar">
        <input
          className="sc-search"
          placeholder="Tìm theo tên hoặc SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error ? <div className="sc-error">{error}</div> : null}
      {!isLoaded ? <div>Đang tải...</div> : null}

      {edit?.mode === 'add' && edit.itemType === 'group' ? editPanel : null}

      {filteredGroups.map(group => (
        <div className="sc-group" key={group.id}>
          <div className="sc-group-head">
            <span>{group.name}</span>
            <div className="sc-row-actions">
              <button type="button" className="sc-btn" onClick={() => openAdd('component', group.id)}>
                + Dịch vụ thành phần
              </button>
              <button type="button" className="sc-btn" onClick={() => openAdd('bundle', group.id)}>
                + Gói/combo
              </button>
              <button type="button" className="sc-icon-btn" onClick={() => openEdit(group)}>
                Sửa
              </button>
              <button type="button" className="sc-icon-btn" onClick={() => handleDelete(group)}>
                Xoá
              </button>
            </div>
          </div>

          {edit && edit.mode === 'edit' && edit.itemId === group.id ? (
            <div className="sc-inline-panel">{editPanel}</div>
          ) : null}
          {edit && edit.mode === 'add' && edit.parentId === group.id ? (
            <div className="sc-inline-panel">{editPanel}</div>
          ) : null}

          {(group.children || []).map(child => (
            <div key={child.id}>
              <div className="sc-row">
                <div className="sc-row-main">
                  <div className="sc-row-title">
                    <span className={`sc-badge ${child.itemType === 'bundle' ? 'sc-badge-bundle' : ''}`}>
                      {child.itemType === 'bundle' ? 'Gói/combo' : 'Thành phần'}
                    </span>
                    {child.status === 'inactive' ? <span className="sc-badge sc-badge-inactive">Ngừng dùng</span> : null}
                    <span>{formatSkuName(child.sku, child.name)}</span>
                  </div>
                  <span className="sc-row-sub">
                    {formatVnd(child.defaultUnitPriceVnd)}
                    {child.unit ? ` / ${child.unit}` : ''}
                  </span>
                </div>
                <div className="sc-row-actions">
                  <button type="button" className="sc-icon-btn" onClick={() => moveItem(child.id, 'up')}>
                    ↑
                  </button>
                  <button type="button" className="sc-icon-btn" onClick={() => moveItem(child.id, 'down')}>
                    ↓
                  </button>
                  <button type="button" className="sc-icon-btn" onClick={() => openEdit(child)}>
                    Sửa
                  </button>
                  <button type="button" className="sc-icon-btn" onClick={() => handleDelete(child)}>
                    Xoá
                  </button>
                </div>
              </div>
              {edit && edit.mode === 'edit' && edit.itemId === child.id ? (
                <div className="sc-inline-panel">{editPanel}</div>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
