'use client';

import { useMemo, useState } from 'react';
import { useServiceCatalog } from './use-service-catalog';
import type { ServiceCatalogItem, ServiceCatalogItemInput, ServiceCatalogItemType } from './types';
import './styles/service-catalog.css';

type Tab = 'products' | 'groups' | 'tax-units';

function emptyProductForm(parentId?: string): ServiceCatalogItemInput {
  return {
    itemType: 'component',
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

function emptyGroupForm(): ServiceCatalogItemInput {
  return {
    itemType: 'group',
    sku: '',
    name: '',
    description: '',
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

/** "SKU – Tên" nhưng bỏ SKU nếu trùng hệt tên. */
function formatSkuName(sku: string | undefined, name: string): string {
  if (!sku || sku.trim().toLowerCase() === name.trim().toLowerCase()) return name;
  return `${sku} – ${name}`;
}

interface FlatProduct extends ServiceCatalogItem {
  groupName: string;
}

export function ServiceCatalogPage() {
  const { items, isLoaded, error, createItem, updateItem, deleteItem } = useServiceCatalog();
  const [tab, setTab] = useState<Tab>('products');

  const groups = useMemo(() => items.filter(item => item.itemType === 'group'), [items]);

  const flatProducts = useMemo<FlatProduct[]>(() => {
    const result: FlatProduct[] = [];
    for (const group of items) {
      for (const child of group.children || []) {
        result.push({ ...child, groupName: group.name });
      }
    }
    return result;
  }, [items]);

  return (
    <div className="sc-page">
      <div className="sc-header">
        <h1>Thư viện sản phẩm & dịch vụ</h1>
      </div>

      <div className="sc-tabs">
        <button type="button" className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Sản phẩm & dịch vụ
        </button>
        <button type="button" className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>
          Nhóm sản phẩm
        </button>
        <button type="button" className={tab === 'tax-units' ? 'active' : ''} onClick={() => setTab('tax-units')}>
          Thuế & đơn vị tính
        </button>
      </div>

      {error ? <div className="sc-error">{error}</div> : null}
      {!isLoaded ? <div>Đang tải...</div> : null}

      {isLoaded && tab === 'products' ? (
        <ProductsTab
          products={flatProducts}
          groups={groups}
          createItem={createItem}
          updateItem={updateItem}
          deleteItem={deleteItem}
        />
      ) : null}
      {isLoaded && tab === 'groups' ? (
        <GroupsTab groups={groups} createItem={createItem} updateItem={updateItem} deleteItem={deleteItem} />
      ) : null}
      {isLoaded && tab === 'tax-units' ? <TaxUnitsTab products={flatProducts} /> : null}
    </div>
  );
}

function ProductsTab({
  products,
  groups,
  createItem,
  updateItem,
  deleteItem,
}: {
  products: FlatProduct[];
  groups: ServiceCatalogItem[];
  createItem: (input: ServiceCatalogItemInput) => Promise<unknown>;
  updateItem: (id: string, input: Partial<ServiceCatalogItemInput>) => Promise<unknown>;
  deleteItem: (id: string) => Promise<unknown>;
}) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<ServiceCatalogItemInput>(emptyProductForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(product => {
      if (groupFilter && product.parentId !== groupFilter) return false;
      if (statusFilter && product.status !== statusFilter) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        (product.sku || '').toLowerCase().includes(term) ||
        (product.description || '').toLowerCase().includes(term)
      );
    });
  }, [products, search, groupFilter, statusFilter]);

  function openAdd() {
    setEditTarget({ mode: 'add' });
    setForm(emptyProductForm(groups[0]?.id));
    setFormError(null);
  }
  function openEdit(product: ServiceCatalogItem) {
    setEditTarget({ mode: 'edit', id: product.id });
    setForm(itemToForm(product));
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Tên sản phẩm bắt buộc.');
      return;
    }
    if (!form.parentId) {
      setFormError('Vui lòng chọn nhóm sản phẩm.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget?.mode === 'edit' && editTarget.id) {
        await updateItem(editTarget.id, form);
      } else {
        await createItem(form);
      }
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được sản phẩm.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(product: ServiceCatalogItem) {
    const next = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateItem(product.id, { status: next });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Không cập nhật được trạng thái.');
    }
  }

  async function handleDelete(product: ServiceCatalogItem) {
    if (!window.confirm(`Xoá "${product.name}"?`)) return;
    try {
      await deleteItem(product.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Không xoá được sản phẩm.');
    }
  }

  return (
    <div className="sc-tab-panel">
      <div className="sc-toolbar">
        <input
          className="sc-search"
          placeholder="Tìm theo mã, tên, mô tả..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
          <option value="">Tất cả nhóm</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang kinh doanh</option>
          <option value="inactive">Ngừng kinh doanh</option>
        </select>
        <button type="button" className="sc-btn sc-btn-primary" onClick={openAdd}>
          + Sản phẩm mới
        </button>
      </div>

      {editTarget ? (
        <div className="sc-panel">
          <strong>{editTarget.mode === 'add' ? 'Thêm sản phẩm mới' : `Sửa: ${form.name}`}</strong>
          <div className="sc-panel-grid">
            <label className="sc-field">
              <span>Nhóm sản phẩm *</span>
              <select value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                <option value="">-- Chọn nhóm --</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sc-field">
              <span>SKU</span>
              <input value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </label>
            <label className="sc-field">
              <span>Tên sản phẩm</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="sc-field">
              <span>Đơn vị tính</span>
              <input value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </label>
            <label className="sc-field">
              <span>Đơn giá Sale (VND)</span>
              <input
                type="number"
                value={form.defaultUnitPriceVnd ?? 0}
                onChange={e => setForm({ ...form, defaultUnitPriceVnd: Number(e.target.value) })}
              />
            </label>
            <label className="sc-field">
              <span>VAT mặc định (%)</span>
              <input
                type="number"
                value={form.defaultVatRate ?? 0}
                onChange={e => setForm({ ...form, defaultVatRate: Number(e.target.value) })}
              />
            </label>
            <label className="sc-field">
              <span>Giảm giá mặc định (%)</span>
              <input
                type="number"
                value={form.defaultDiscountPercent ?? 0}
                onChange={e => setForm({ ...form, defaultDiscountPercent: Number(e.target.value) })}
              />
            </label>
            <label className="sc-field">
              <span>List price USD</span>
              <input
                type="number"
                value={form.listPriceUsd ?? ''}
                onChange={e => setForm({ ...form, listPriceUsd: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </label>
            <label className="sc-field">
              <span>Unit price USD</span>
              <input
                type="number"
                value={form.unitPriceUsd ?? ''}
                onChange={e => setForm({ ...form, unitPriceUsd: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </label>
            <label className="sc-field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
                <option value="active">Đang kinh doanh</option>
                <option value="inactive">Ngừng kinh doanh</option>
              </select>
            </label>
            <label className="sc-field" style={{ gridColumn: '1 / -1' }}>
              <span>Mô tả chuẩn</span>
              <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="sc-field" style={{ gridColumn: '1 / -1' }}>
              <span>Ghi chú</span>
              <textarea value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} />
            </label>
          </div>
          {formError ? <div className="sc-error">{formError}</div> : null}
          <div className="sc-panel-actions">
            <button type="button" className="sc-btn" onClick={() => setEditTarget(null)}>
              Huỷ
            </button>
            <button type="button" className="sc-btn sc-btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Mã/Sản phẩm</th>
              <th>Nhóm</th>
              <th>Mô tả chuẩn</th>
              <th>ĐVT</th>
              <th>Đơn giá Sale</th>
              <th>VAT</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="sc-empty">
                  Không có sản phẩm phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="sc-cell-title">
                        {formatSkuName(product.sku, product.name)}
                        {product.itemType === 'bundle' ? <span className="sc-badge sc-badge-bundle">Gói</span> : null}
                      </div>
                    </td>
                    <td>{product.groupName}</td>
                    <td className="sc-cell-desc">{product.description || '—'}</td>
                    <td>{product.unit || '—'}</td>
                    <td>{formatVnd(product.defaultUnitPriceVnd)}</td>
                    <td>{product.defaultVatRate ? `${product.defaultVatRate}%` : '—'}</td>
                    <td>
                      <span className={`sc-badge ${product.status === 'inactive' ? 'sc-badge-inactive' : 'sc-badge-active'}`}>
                        {product.status === 'inactive' ? 'Ngừng kinh doanh' : 'Đang kinh doanh'}
                      </span>
                    </td>
                    <td className="sc-row-actions">
                      <button type="button" className="sc-icon-btn" onClick={() => openEdit(product)}>
                        Sửa
                      </button>
                      <button type="button" className="sc-icon-btn" onClick={() => toggleStatus(product)}>
                        {product.status === 'inactive' ? 'Kích hoạt lại' : 'Ngưng kinh doanh'}
                      </button>
                      <button type="button" className="sc-icon-btn" onClick={() => handleDelete(product)}>
                        Xoá
                      </button>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupsTab({
  groups,
  createItem,
  updateItem,
  deleteItem,
}: {
  groups: ServiceCatalogItem[];
  createItem: (input: ServiceCatalogItemInput) => Promise<unknown>;
  updateItem: (id: string, input: Partial<ServiceCatalogItemInput>) => Promise<unknown>;
  deleteItem: (id: string) => Promise<unknown>;
}) {
  const [editTarget, setEditTarget] = useState<{ mode: 'add' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<ServiceCatalogItemInput>(emptyGroupForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditTarget({ mode: 'add' });
    setForm(emptyGroupForm());
    setFormError(null);
  }
  function openEdit(group: ServiceCatalogItem) {
    setEditTarget({ mode: 'edit', id: group.id });
    setForm(itemToForm(group));
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Tên nhóm bắt buộc.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget?.mode === 'edit' && editTarget.id) {
        await updateItem(editTarget.id, form);
      } else {
        await createItem(form);
      }
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được nhóm.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group: ServiceCatalogItem) {
    if (!window.confirm(`Xoá nhóm "${group.name}"?`)) return;
    try {
      await deleteItem(group.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Không xoá được nhóm.');
    }
  }

  return (
    <div className="sc-tab-panel">
      <div className="sc-toolbar">
        <button type="button" className="sc-btn sc-btn-primary" onClick={openAdd}>
          + Nhóm mới
        </button>
      </div>

      {editTarget ? (
        <div className="sc-panel">
          <strong>{editTarget.mode === 'add' ? 'Thêm nhóm sản phẩm' : `Sửa nhóm: ${form.name}`}</strong>
          <div className="sc-panel-grid">
            <label className="sc-field">
              <span>Tên nhóm</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="sc-field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
                <option value="active">Đang sử dụng</option>
                <option value="inactive">Ngừng sử dụng</option>
              </select>
            </label>
            <label className="sc-field" style={{ gridColumn: '1 / -1' }}>
              <span>Mô tả</span>
              <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
          {formError ? <div className="sc-error">{formError}</div> : null}
          <div className="sc-panel-actions">
            <button type="button" className="sc-btn" onClick={() => setEditTarget(null)}>
              Huỷ
            </button>
            <button type="button" className="sc-btn sc-btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Tên nhóm</th>
              <th>Số sản phẩm</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="sc-empty">
                  Chưa có nhóm nào.
                </td>
              </tr>
            ) : (
              groups.map(group => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{(group.children || []).length}</td>
                  <td>
                    <span className={`sc-badge ${group.status === 'inactive' ? 'sc-badge-inactive' : 'sc-badge-active'}`}>
                      {group.status === 'inactive' ? 'Ngừng sử dụng' : 'Đang sử dụng'}
                    </span>
                  </td>
                  <td className="sc-row-actions">
                    <button type="button" className="sc-icon-btn" onClick={() => openEdit(group)}>
                      Sửa
                    </button>
                    <button type="button" className="sc-icon-btn" onClick={() => handleDelete(group)}>
                      Xoá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaxUnitsTab({ products }: { products: FlatProduct[] }) {
  const unitStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      const key = product.unit?.trim() || '(Chưa đặt đơn vị)';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const vatStats = useMemo(() => {
    const map = new Map<number, number>();
    for (const product of products) {
      const key = product.defaultVatRate || 0;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [products]);

  return (
    <div className="sc-tab-panel">
      <p className="sc-tab-note">
        Tổng hợp thật từ dữ liệu sản phẩm hiện có — sửa đơn vị tính/VAT trực tiếp trên từng sản phẩm ở tab "Sản phẩm & dịch vụ".
      </p>
      <div className="sc-summary-grid">
        <div className="sc-summary-card">
          <h3>Đơn vị tính đang dùng</h3>
          <table className="sc-table">
            <thead>
              <tr>
                <th>Đơn vị tính</th>
                <th>Số sản phẩm</th>
              </tr>
            </thead>
            <tbody>
              {unitStats.map(([unit, count]) => (
                <tr key={unit}>
                  <td>{unit}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sc-summary-card">
          <h3>Mức VAT đang dùng</h3>
          <table className="sc-table">
            <thead>
              <tr>
                <th>VAT</th>
                <th>Số sản phẩm</th>
              </tr>
            </thead>
            <tbody>
              {vatStats.map(([vat, count]) => (
                <tr key={vat}>
                  <td>{vat}%</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
