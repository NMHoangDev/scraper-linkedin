'use client';

import type { QuoteData, QuoteField, QuoteItem, QuoteSchema, VillaSolutionItem } from '../types';
import {
  calculateQuoteTotals,
  calculateVillaTotals,
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
  return { description: '', serviceDescription: '', unit: '', quantity: 1, unitPrice: 0, vatRate: 10 };
}

function emptySolutionRow(): VillaSolutionItem {
  return { name: '', description: '', originalPrice: 0, offerPrice: 0, note: '' };
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
          return (
            <section key={section.key} className="quote-section-card">
              <div className="quote-section-head">
                <h4>{section.title}</h4>
              </div>
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
  totals: { subtotalAmount: number; totalVatAmount: number; totalAmount: number };
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
    // Villa layout: "Chi phí setup một lần" / "Thanh toán đợt 1-2" — không có trong
    // `totals` chung (chỉ có subtotal/vat/total) nên phải tính riêng từ % đợt thanh
    // toán (field cùng section, đọc qua `data`) nhân với tổng tiền giải pháp.
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
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={event => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className={fieldClass}>
        {label}
        <select
          value={String(value ?? field.defaultValue ?? '')}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
        >
          <option value="">-- Chọn --</option>
          {(field.options || []).map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className={fieldClass}>
        {label}
        <textarea
          value={String(value ?? field.defaultValue ?? '')}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.type === 'repeatable-textarea') {
    const rows = Array.isArray(value) ? value : Array.isArray(field.defaultValue) ? field.defaultValue : [];
    return (
      <label className={fieldClass}>
        {label}
        <textarea
          value={(rows as string[]).join('\n')}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={event => onChange(event.target.value.split('\n'))}
        />
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
        onChange={event =>
          onChange(
            field.type === 'number' || field.type === 'currency'
              ? Number(event.target.value) || 0
              : event.target.value
          )
        }
      />
    </label>
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
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Xuống"
                  >
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
