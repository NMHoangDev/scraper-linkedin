'use client';

import type { QuoteData, QuoteField, QuoteItem, QuoteSchema, VillaSolutionItem } from '../types';
import {
  calculateItemAfterDiscount,
  calculateItemDiscount,
  calculateItemSubtotal,
  calculateItemTotal,
  calculateItemVat,
  calculateQuoteTotals,
  calculateVillaTotals,
  clampDiscountPercent,
  formatVnd,
  sanitizeMoneyInput,
} from '../utils/quoteCalculations';

export interface QuoteFillValue {
  data: QuoteData;
  items: QuoteItem[];
  solutionItems: VillaSolutionItem[];
}

interface Props {
  schema: QuoteSchema;
  value: QuoteFillValue;
  onChange: (next: QuoteFillValue) => void;
}

type RowRecord = Record<string, unknown>;

const WIDE_FIELD_KEYS = new Set([
  'quoteTitle',
  'quoteSubtitle',
  'quoteBenefitLine',
  'customerNeed',
  'customerRequirement',
  'proposedSolution',
  'solutionOverview',
  'projectScope',
]);

function emptyItemRow(): QuoteItem {
  return {
    description: '',
    serviceDescription: '',
    unit: '',
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    vatRate: 10,
    children: [],
  };
}

function emptySolutionRow(): VillaSolutionItem {
  return { name: '', description: '', originalPrice: 0, offerPrice: 0, note: '' };
}

function coerceNumber(value: string) {
  return Number(value) || 0;
}

function coercePercent(value: string) {
  return clampDiscountPercent(Number(value) || 0);
}

export function QuoteFormFiller({ schema, value, onChange }: Props) {
  const layoutType = schema.layoutType;
  const sections = schema.sections || [];
  const totals =
    layoutType === 'villa_solution_package'
      ? calculateVillaTotals(value.solutionItems)
      : calculateQuoteTotals(value.items);

  function setData(key: string, fieldValue: unknown) {
    onChange({ ...value, data: { ...value.data, [key]: fieldValue } });
  }

  return (
    <div className="quote-form-filler">
      {sections.map(section => {
        const repeaterField = section.fields.find(field => field.type === 'repeater-table');
        if (repeaterField) {
          const isSolutionTable = repeaterField.key === 'solutionItems';
          const isQuoteItemsTable = repeaterField.key === 'quoteItems';
          return (
            <section key={section.key} className="quote-section-card">
              <div className="quote-section-head">
                <h4>{section.title}</h4>
              </div>
              {isQuoteItemsTable ? (
                <QuoteItemsEditor items={value.items} onChange={items => onChange({ ...value, items })} />
              ) : (
                <RepeaterTable
                  columns={repeaterField.config?.columns || []}
                  rows={(isSolutionTable ? value.solutionItems : value.items) as unknown as RowRecord[]}
                  emptyRow={() => (isSolutionTable ? emptySolutionRow() : emptyItemRow()) as unknown as RowRecord}
                  emptyLabel={isSolutionTable ? 'Chưa có giải pháp nào.' : 'Chưa có dòng dịch vụ.'}
                  onChange={rows =>
                    onChange(
                      isSolutionTable
                        ? { ...value, solutionItems: rows as unknown as VillaSolutionItem[] }
                        : { ...value, items: rows as unknown as QuoteItem[] }
                    )
                  }
                />
              )}
            </section>
          );
        }
        return (
          <section key={section.key} className="quote-section-card">
            <div className="quote-section-head">
              <h4>{section.title}</h4>
            </div>
            <div className="quote-filler-field-grid">
              {section.fields.map(field => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={value.data[field.key]}
                  data={value.data}
                  totals={totals}
                  onChange={fieldValue => setData(field.key, fieldValue)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {layoutType === 'villa_solution_package' ? null : (
        <section className="quote-section-card quote-totals-card">
          <div className="quote-total-row">
            <span>Tạm tính</span>
            <strong>{formatVnd(totals.subtotalAmount)}</strong>
          </div>
          {totals.discountAmount ? (
            <div className="quote-total-row quote-total-row--discount">
              <span>Giảm giá</span>
              <strong>-{formatVnd(totals.discountAmount)}</strong>
            </div>
          ) : null}
          <div className="quote-total-row">
            <span>VAT</span>
            <strong>{formatVnd(totals.totalVatAmount)}</strong>
          </div>
          <div className="quote-total-row quote-total-row--grand">
            <span>Tổng cộng</span>
            <strong>{formatVnd(totals.totalAmount)}</strong>
          </div>
        </section>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  data,
  totals,
  onChange,
}: {
  field: QuoteField;
  value: unknown;
  data: QuoteData;
  totals: { subtotalAmount: number; discountAmount?: number; totalVatAmount: number; totalAmount: number };
  onChange: (value: unknown) => void;
}) {
  if (field.visible === false) return null;
  const disabled = field.editable === false;
  const fieldClass = `crm-field ${field.type === 'textarea' || field.type === 'repeatable-textarea' || WIDE_FIELD_KEYS.has(field.key) ? 'crm-field--full' : ''}`;
  const label = (
    <>
      <span>
        {field.label} {field.required ? <b>*</b> : null}
      </span>
      {field.helpText ? <p className="crm-help-text">{field.helpText}</p> : null}
    </>
  );

  if (field.type === 'calculated') {
    let computed = 0;
    if (field.key === 'subtotalAmount') computed = totals.subtotalAmount;
    else if (field.key === 'totalVatAmount') computed = totals.totalVatAmount;
    else if (field.key === 'totalAmount') computed = totals.totalAmount;
    else if (field.key === 'setupTotalAmount') computed = totals.totalAmount;
    else if (field.key === 'paymentPhaseOneAmount')
      computed = (totals.totalAmount * sanitizeMoneyInput(data.paymentPhaseOnePercent)) / 100;
    else if (field.key === 'paymentPhaseTwoAmount')
      computed = (totals.totalAmount * sanitizeMoneyInput(data.paymentPhaseTwoPercent)) / 100;
    return (
      <label className={fieldClass}>
        {label}
        <input value={formatVnd(computed)} disabled readOnly />
      </label>
    );
  }

  if (field.type === 'auto-number' || field.config?.generatedWhenCreatingQuote) {
    return (
      <label className={fieldClass}>
        {label}
        <input value="Sẽ sinh khi lưu" disabled readOnly />
      </label>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className={`${fieldClass} quote-switch`}>
        <input type="checkbox" checked={Boolean(value)} disabled={disabled} onChange={event => onChange(event.target.checked)} />
        {field.label}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className={fieldClass}>
        {label}
        <select value={String(value ?? field.defaultValue ?? '')} disabled={disabled} onChange={event => onChange(event.target.value)}>
          <option value="">-- Chọn --</option>
          {(field.options || []).map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className={fieldClass}>
        {label}
        <textarea value={String(value ?? field.defaultValue ?? '')} placeholder={field.placeholder} disabled={disabled} onChange={event => onChange(event.target.value)} />
      </label>
    );
  }

  if (field.type === 'repeatable-textarea') {
    const rows = Array.isArray(value) ? value : Array.isArray(field.defaultValue) ? field.defaultValue : [];
    return (
      <label className={fieldClass}>
        {label}
        <textarea value={(rows as string[]).join('\n')} placeholder={field.placeholder} disabled={disabled} onChange={event => onChange(event.target.value.split('\n'))} />
      </label>
    );
  }

  const inputType =
    field.type === 'number' || field.type === 'currency'
      ? 'number'
      : field.type === 'email'
        ? 'email'
        : field.type === 'phone'
          ? 'tel'
          : field.type === 'date'
            ? 'date'
            : 'text';

  return (
    <label className={fieldClass}>
      {label}
      <input
        type={inputType}
        value={value === undefined || value === null ? String(field.defaultValue ?? '') : String(value)}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={event => onChange(field.type === 'number' || field.type === 'currency' ? Number(event.target.value) || 0 : event.target.value)}
      />
    </label>
  );
}

function QuoteItemsEditor({ items, onChange }: { items: QuoteItem[]; onChange: (items: QuoteItem[]) => void }) {
  function updateParent(index: number, patch: Partial<QuoteItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function addParent() {
    onChange([...items, emptyItemRow()]);
  }
  function removeParent(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function moveParent(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  }
  function updateChild(parentIndex: number, childIndex: number, patch: Partial<QuoteItem>) {
    const parent = items[parentIndex];
    const children = parent.children || [];
    updateParent(parentIndex, { children: children.map((child, i) => (i === childIndex ? { ...child, ...patch } : child)) });
  }
  function addChild(parentIndex: number) {
    const parent = items[parentIndex];
    onChange(items.map((item, i) => (i === parentIndex ? { ...parent, children: [...(parent.children || []), emptyItemRow()] } : item)));
  }
  function removeChild(parentIndex: number, childIndex: number) {
    const parent = items[parentIndex];
    updateParent(parentIndex, { children: (parent.children || []).filter((_, i) => i !== childIndex) });
  }
  function moveChild(parentIndex: number, childIndex: number, offset: number) {
    const parent = items[parentIndex];
    const children = [...(parent.children || [])];
    const nextIndex = childIndex + offset;
    if (nextIndex < 0 || nextIndex >= children.length) return;
    const [child] = children.splice(childIndex, 1);
    children.splice(nextIndex, 0, child);
    updateParent(parentIndex, { children });
  }

  return (
    <div className="quote-items-editor">
      {items.length === 0 ? (
        <div className="empty-row quote-items-empty">Chưa có dòng dịch vụ. Bấm &quot;Thêm dịch vụ cha&quot; để bắt đầu.</div>
      ) : null}
      {items.map((item, index) => (
        <div key={item.id || index} className="quote-parent-item">
          <div className="quote-item-toolbar">
            <div className="quote-item-title">
              <span>{index + 1}</span>
              <strong>Dịch vụ cha</strong>
              {(item.children || []).length ? <em>{(item.children || []).length} dịch vụ con</em> : null}
            </div>
            <div className="quote-item-actions">
              <button type="button" onClick={() => moveParent(index, -1)} disabled={index === 0}>↑</button>
              <button type="button" onClick={() => moveParent(index, 1)} disabled={index === items.length - 1}>↓</button>
              <button type="button" className="quote-danger-button" onClick={() => removeParent(index)}>Xóa</button>
            </div>
          </div>
          <QuoteItemFields item={item} prefix="parent" onChange={patch => updateParent(index, patch)} />
          {(item.children || []).length ? (
            <div className="quote-child-list">
              {(item.children || []).map((child, childIndex) => (
                <div key={child.id || childIndex} className="quote-child-item">
                  <div className="quote-item-toolbar quote-item-toolbar--child">
                    <div className="quote-item-title quote-item-title--child">
                      <span>{index + 1}.{childIndex + 1}</span>
                      <strong>Dịch vụ con</strong>
                    </div>
                    <div className="quote-item-actions">
                      <button type="button" onClick={() => moveChild(index, childIndex, -1)} disabled={childIndex === 0}>↑</button>
                      <button type="button" onClick={() => moveChild(index, childIndex, 1)} disabled={childIndex === (item.children || []).length - 1}>↓</button>
                      <button type="button" className="quote-danger-button" onClick={() => removeChild(index, childIndex)}>Xóa</button>
                    </div>
                  </div>
                  <QuoteItemFields item={child} prefix="child" onChange={patch => updateChild(index, childIndex, patch)} />
                </div>
              ))}
            </div>
          ) : null}
          <div className="quote-item-footer">
            <button type="button" className="quote-add-child-button" onClick={() => addChild(index)}>
              + Thêm dịch vụ con
            </button>
            <div className="quote-group-subtotal">
              <span>Tạm tính nhóm</span>
              <strong>{formatVnd([item, ...(item.children || [])].reduce((sum, row) => sum + calculateItemTotal(row), 0))}</strong>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="quote-add-parent-button" onClick={addParent}>
        + Thêm dịch vụ cha
      </button>
    </div>
  );
}

function QuoteItemFields({ item, prefix, onChange }: { item: QuoteItem; prefix: 'parent' | 'child'; onChange: (patch: Partial<QuoteItem>) => void }) {
  const subtotal = calculateItemSubtotal(item);
  const discount = calculateItemDiscount(item);
  const afterDiscount = calculateItemAfterDiscount(item);
  const vat = calculateItemVat(item);
  const total = calculateItemTotal(item);
  const nameLabel = prefix === 'parent' ? 'Tên dịch vụ' : 'Tên dịch vụ con';
  return (
    <div className="quote-item-fields">
      <label className="crm-field crm-field--full">
        <span>{nameLabel} <b>*</b></span>
        <input value={item.serviceDescription || ''} onChange={event => onChange({ serviceDescription: event.target.value })} />
      </label>
      <label className="crm-field crm-field--full">
        <span>{prefix === 'parent' ? 'Mô tả chung' : 'Mô tả'}</span>
        <textarea value={item.description || ''} onChange={event => onChange({ description: event.target.value })} />
      </label>
      <label className="crm-field">
        <span>Đơn vị tính</span>
        <input value={item.unit || ''} onChange={event => onChange({ unit: event.target.value })} />
      </label>
      <label className="crm-field">
        <span>Số lượng</span>
        <input type="number" min={0} value={item.quantity || 0} onChange={event => onChange({ quantity: coerceNumber(event.target.value) })} />
      </label>
      <label className="crm-field">
        <span>Đơn giá</span>
        <input type="number" min={0} value={item.unitPrice || 0} onChange={event => onChange({ unitPrice: coerceNumber(event.target.value) })} />
      </label>
      <label className="crm-field">
        <span>Giảm giá (%)</span>
        <input type="number" min={0} max={100} value={item.discountPercent ?? 0} onChange={event => onChange({ discountPercent: coercePercent(event.target.value) })} />
      </label>
      <label className="crm-field">
        <span>VAT (%)</span>
        <input type="number" min={0} max={100} value={item.vatRate || 0} onChange={event => onChange({ vatRate: coercePercent(event.target.value) })} />
      </label>
      <div className="quote-item-calculation">
        <span>Gốc: {formatVnd(subtotal)}</span>
        <span>Giảm: {discount ? `-${formatVnd(discount)}` : '—'}</span>
        <span>Sau giảm: {formatVnd(afterDiscount)}</span>
        <span>VAT: {formatVnd(vat)}</span>
        <strong>Thành tiền: {formatVnd(total)}</strong>
      </div>
    </div>
  );
}

function RepeaterTable({
  columns,
  rows,
  emptyRow,
  emptyLabel,
  onChange,
}: {
  columns: QuoteField[];
  rows: RowRecord[];
  emptyRow: () => RowRecord;
  emptyLabel: string;
  onChange: (rows: RowRecord[]) => void;
}) {
  const visibleColumns = columns.filter(column => column.visible !== false);

  function updateRow(index: number, key: string, fieldValue: unknown) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: fieldValue } : row)));
  }
  function addRow() {
    onChange([...rows, emptyRow()]);
  }
  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function moveRow(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    onChange(next);
  }

  return (
    <div className="quote-table-wrap">
      <table className="quote-table quote-table--editable">
        <thead>
          <tr>
            {visibleColumns.map(column => (
              <th key={column.key}>
                {column.label} {column.required ? <b>*</b> : null}
              </th>
            ))}
            <th aria-label="Thao tác" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length + 1} className="empty-row">
                {emptyLabel} Bấm &quot;Thêm dòng&quot; để bắt đầu.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {visibleColumns.map(column => (
                  <td key={column.key}>
                    {column.type === 'auto-number' ? (
                      <input value={index + 1} disabled readOnly />
                    ) : (
                      <input
                        type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
                        value={String(row[column.key] ?? '')}
                        placeholder={column.placeholder}
                        onChange={event =>
                          updateRow(
                            index,
                            column.key,
                            column.type === 'number' || column.type === 'currency'
                              ? Number(event.target.value) || 0
                              : event.target.value
                          )
                        }
                      />
                    )}
                  </td>
                ))}
                <td className="quote-row-actions">
                  <button type="button" onClick={() => moveRow(index, -1)} disabled={index === 0} aria-label="Lên">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1} aria-label="Xuống">
                    ↓
                  </button>
                  <button type="button" onClick={() => removeRow(index)} aria-label="Xóa dòng">
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button type="button" className="quote-button quote-button--secondary" onClick={addRow}>
        + Thêm dòng
      </button>
    </div>
  );
}
