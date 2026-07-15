'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  fieldLibrary,
  FORM_STATUS_OPTIONS,
  LAYOUT_OPTIONS,
  schemaForLayout,
} from '../constants/quoteConfig';
import { seedingQuoteRepository } from '../repositories/SeedingQuoteRepository';
import type { QuoteField, QuoteFieldType, QuoteForm, QuoteLayoutType, QuoteSchema } from '../types';

const clone = <T,>(value: T): T => structuredClone(value);

const fieldTypes: Array<{ value: QuoteFieldType; label: string }> = [
  { value: 'text', label: 'Văn bản ngắn' },
  { value: 'textarea', label: 'Văn bản dài' },
  { value: 'number', label: 'Số' },
  { value: 'currency', label: 'Tiền tệ' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Số điện thoại' },
  { value: 'date', label: 'Ngày' },
  { value: 'select', label: 'Danh sách chọn' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'repeater-table', label: 'Bảng lặp' },
  { value: 'calculated', label: 'Trường tính toán' },
  { value: 'repeatable-textarea', label: 'Nhiều dòng lặp' },
];

interface Props {
  formId?: string;
}

function moveItem<T>(list: T[], index: number, offset: number) {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function defaultField(): QuoteField {
  return {
    key: `field_${Date.now().toString(36)}`,
    label: 'Trường mới',
    type: 'text',
    required: false,
    visible: true,
    editable: true,
  };
}

function textToDefault(field: QuoteField, value: string) {
  if (field.type === 'repeatable-textarea') {
    return value.split('\n').map(item => item.trim()).filter(Boolean);
  }
  if (field.type === 'number' || field.type === 'currency') {
    return value === '' ? '' : Number(value);
  }
  if (field.type === 'repeater-table') {
    try {
      return JSON.parse(value);
    } catch {
      return field.defaultValue;
    }
  }
  return value;
}

function defaultToText(value: unknown) {
  if (Array.isArray(value)) return value.join('\n');
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function validateSchema(form: QuoteForm | null, schema: QuoteSchema) {
  if (!form?.name?.trim()) return 'Tên mẫu bắt buộc.';
  const keys = new Set<string>();
  let sellerEmail = '';
  let sellerCompanyName = '';
  let defaultVatRate = 0;
  let validityDays = 0;
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (keys.has(field.key)) return `Tên khóa bị trùng: ${field.key}`;
      keys.add(field.key);
      if (field.key === 'sellerCompanyName') sellerCompanyName = String(field.defaultValue || '');
      if (field.key === 'sellerEmail') sellerEmail = String(field.defaultValue || '');
      if (field.key === 'defaultVatRate') defaultVatRate = Number(field.defaultValue || 0);
      if (field.key === 'validityDays') validityDays = Number(field.defaultValue || 0);
      for (const column of field.config?.columns || []) {
        if (keys.has(column.key)) return `Tên khóa bị trùng: ${column.key}`;
        keys.add(column.key);
        if (column.key === 'vatRate') {
          const vatRate = Number(column.defaultValue ?? defaultVatRate);
          if (vatRate < 0 || vatRate > 100) return 'VAT phải từ 0 đến 100.';
        }
      }
    }
  }
  if (schema.layoutType !== 'blank_quote' && !sellerCompanyName.trim()) return 'Tên công ty bắt buộc.';
  if (sellerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerEmail)) {
    return 'Email công ty không đúng định dạng.';
  }
  if (defaultVatRate < 0 || defaultVatRate > 100) return 'VAT mặc định phải từ 0 đến 100.';
  if (validityDays < 0) return 'Thời hạn hiệu lực không được âm.';
  return '';
}

export function QuoteFormBuilderPage({ formId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<QuoteForm | null>(() => {
    if (formId) return null;
    const now = new Date().toISOString();
    const schema = schemaForLayout('cloudgate_standard_quote');
    return {
      id: '',
      code: '',
      name: '',
      description: '',
      status: 'active',
      schemaVersion: 1,
      schemaJson: schema,
      sectionCount: schema.sections.length,
      fieldCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
  const [loading, setLoading] = useState(Boolean(formId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [presetKey, setPresetKey] = useState(fieldLibrary[0].key);
  const [advancedKeys, setAdvancedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!formId) return;
    seedingQuoteRepository
      .getForm(formId)
      .then(row => setForm(clone(row)))
      .catch(err => setError(err instanceof Error ? err.message : 'Không tải được mẫu báo giá.'))
      .finally(() => setLoading(false));
  }, [formId]);

  const selectedPreset = useMemo(
    () => fieldLibrary.find(field => field.key === presetKey) || fieldLibrary[0],
    [presetKey]
  );

  function updateForm(patch: Partial<QuoteForm>) {
    setForm(current => (current ? { ...current, ...patch } : current));
  }

  function updateSchema(updater: (schema: QuoteSchema) => QuoteSchema) {
    setForm(current =>
      current ? { ...current, schemaJson: updater(clone(current.schemaJson)) } : current
    );
  }

  function updateLayout(layoutType: QuoteLayoutType) {
    const schema = schemaForLayout(layoutType);
    setForm(current => current ? { ...current, schemaJson: schema } : current);
  }

  function addSection() {
    updateSchema(schema => ({
      ...schema,
      sections: [
        ...schema.sections,
        { key: `section_${Date.now().toString(36)}`, title: 'Nhóm thông tin mới', fields: [] },
      ],
    }));
  }

  function addField(sectionIndex: number, fromLibrary = true) {
    updateSchema(schema => {
      const sections = [...schema.sections];
      const section = { ...sections[sectionIndex], fields: [...sections[sectionIndex].fields] };
      const field = fromLibrary ? clone(selectedPreset) : defaultField();
      const exists = section.fields.some(item => item.key === field.key);
      section.fields.push({
        ...field,
        key: exists ? `${field.key}_${Date.now().toString(36)}` : field.key,
        required: Boolean(field.required),
        visible: field.visible ?? true,
        editable: field.editable ?? true,
      });
      sections[sectionIndex] = section;
      return { ...schema, sections };
    });
  }

  function patchField(sectionIndex: number, fieldIndex: number, patch: Partial<QuoteField>) {
    updateSchema(schema => {
      const sections = [...schema.sections];
      const section = { ...sections[sectionIndex], fields: [...sections[sectionIndex].fields] };
      section.fields[fieldIndex] = { ...section.fields[fieldIndex], ...patch };
      sections[sectionIndex] = section;
      return { ...schema, sections };
    });
  }

  function patchColumn(sectionIndex: number, fieldIndex: number, columnIndex: number, patch: Partial<QuoteField>) {
    updateSchema(schema => {
      const sections = [...schema.sections];
      const section = { ...sections[sectionIndex], fields: [...sections[sectionIndex].fields] };
      const field = { ...section.fields[fieldIndex], config: { ...(section.fields[fieldIndex].config || {}) } };
      const columns = [...(field.config?.columns || [])];
      columns[columnIndex] = { ...columns[columnIndex], ...patch };
      field.config = { ...field.config, columns };
      section.fields[fieldIndex] = field;
      sections[sectionIndex] = section;
      return { ...schema, sections };
    });
  }

  async function save() {
    if (!form) return;
    const validationError = validateSchema(form, form.schemaJson);
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (formId) {
        await seedingQuoteRepository.updateForm(formId, {
          name: form.name,
          description: form.description,
          status: form.status,
          schemaVersion: form.schemaVersion,
          schemaJson: form.schemaJson,
        });
      } else {
        await seedingQuoteRepository.createForm({
          name: form.name,
          description: form.description,
          status: form.status,
          schemaVersion: form.schemaVersion,
          schemaJson: form.schemaJson,
          layoutType: form.schemaJson.layoutType,
        });
      }
      router.push('/all-platform/quotes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được mẫu báo giá.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="quote-page"><section className="quote-state">Đang tải mẫu báo giá...</section></main>;
  if (!form) return <main className="quote-page"><section className="quote-state quote-state--error">Không tìm thấy mẫu báo giá.</section></main>;

  return (
    <main className="quote-builder">
      <header className="quote-action-bar">
        <div>
          <h1>{formId ? 'Chỉnh sửa mẫu báo giá' : 'Tạo form báo giá mới'}</h1>
          <p>{form.schemaJson.layoutType}</p>
        </div>
        <div className="quote-head-actions">
          <Link href="/all-platform/quotes" className="quote-button quote-button--secondary">Hủy</Link>
          {formId ? <Link href={`/all-platform/quotes/${formId}/preview`} className="quote-button quote-button--secondary">Xem thử</Link> : null}
          <button type="button" className="quote-button quote-button--primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Đang lưu...' : 'Lưu mẫu'}
          </button>
        </div>
      </header>

      {error ? <section className="quote-state quote-state--error">{error}</section> : null}

      <section className="quote-builder-grid">
        <aside className="quote-builder-sidebar">
          <label>Tên mẫu</label>
          <input value={form.name} onChange={event => updateForm({ name: event.target.value })} />
          <label>Trạng thái</label>
          <select value={form.status} onChange={event => updateForm({ status: event.target.value as QuoteForm['status'] })}>
            {FORM_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label>Layout</label>
          <select value={form.schemaJson.layoutType} onChange={event => updateLayout(event.target.value as QuoteLayoutType)}>
            {LAYOUT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label>Mô tả</label>
          <textarea value={form.description} onChange={event => updateForm({ description: event.target.value })} />
          <div className="quote-sidebar-line" />
          <label>Thư viện trường</label>
          <select value={presetKey} onChange={event => setPresetKey(event.target.value)}>
            {fieldLibrary.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}
          </select>
          <button type="button" className="quote-button quote-button--secondary quote-button--full" onClick={addSection}>Thêm nhóm</button>
        </aside>

        <section className="quote-builder-main">
          {form.schemaJson.sections.map((section, sectionIndex) => (
            <article className="quote-section-card" key={section.key}>
              <div className="quote-section-head">
                <input
                  value={section.title}
                  onChange={event => updateSchema(schema => {
                    const sections = [...schema.sections];
                    sections[sectionIndex] = { ...sections[sectionIndex], title: event.target.value };
                    return { ...schema, sections };
                  })}
                />
                <div>
                  <button type="button" onClick={() => updateSchema(schema => ({ ...schema, sections: moveItem(schema.sections, sectionIndex, -1) }))}>↑</button>
                  <button type="button" onClick={() => updateSchema(schema => ({ ...schema, sections: moveItem(schema.sections, sectionIndex, 1) }))}>↓</button>
                  <button type="button" onClick={() => updateSchema(schema => ({ ...schema, sections: schema.sections.filter((_, index) => index !== sectionIndex) }))}>Xóa</button>
                </div>
              </div>
              <div className="quote-section-actions">
                <button type="button" className="quote-button quote-button--secondary" onClick={() => addField(sectionIndex, true)}>Thêm từ thư viện</button>
                <button type="button" className="quote-button quote-button--secondary" onClick={() => addField(sectionIndex, false)}>Thêm trường trống</button>
              </div>

              <div className="quote-fields-list">
                {section.fields.map((field, fieldIndex) => {
                  const advancedOpen = advancedKeys[`${section.key}:${field.key}`];
                  return (
                    <div className="quote-field-row" key={`${field.key}-${fieldIndex}`}>
                      <div className="quote-field-grid">
                        <label>
                          Label
                          <input value={field.label} onChange={event => patchField(sectionIndex, fieldIndex, { label: event.target.value })} />
                        </label>
                        <label>
                          Key
                          <input value={field.key} onChange={event => patchField(sectionIndex, fieldIndex, { key: event.target.value })} />
                        </label>
                        <label>
                          Type
                          <select value={field.type} onChange={event => patchField(sectionIndex, fieldIndex, { type: event.target.value as QuoteFieldType })}>
                            {fieldTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                          </select>
                        </label>
                        <label>
                          Placeholder
                          <input value={field.placeholder || ''} onChange={event => patchField(sectionIndex, fieldIndex, { placeholder: event.target.value })} />
                        </label>
                      </div>
                      <label>
                        Giá trị mặc định
                        <textarea value={defaultToText(field.defaultValue)} onChange={event => patchField(sectionIndex, fieldIndex, { defaultValue: textToDefault(field, event.target.value) })} />
                      </label>
                      <label>
                        Help text
                        <textarea value={field.helpText || ''} onChange={event => patchField(sectionIndex, fieldIndex, { helpText: event.target.value })} />
                      </label>
                      <div className="quote-field-flags">
                        <label><input type="checkbox" checked={Boolean(field.required)} onChange={event => patchField(sectionIndex, fieldIndex, { required: event.target.checked })} /> Bắt buộc</label>
                        <label><input type="checkbox" checked={field.visible !== false} onChange={event => patchField(sectionIndex, fieldIndex, { visible: event.target.checked })} /> Hiển thị</label>
                        <label><input type="checkbox" checked={field.editable !== false} onChange={event => patchField(sectionIndex, fieldIndex, { editable: event.target.checked })} /> Cho sửa</label>
                        <button type="button" onClick={() => updateSchema(schema => {
                          const sections = [...schema.sections];
                          sections[sectionIndex] = { ...section, fields: moveItem(section.fields, fieldIndex, -1) };
                          return { ...schema, sections };
                        })}>↑</button>
                        <button type="button" onClick={() => updateSchema(schema => {
                          const sections = [...schema.sections];
                          sections[sectionIndex] = { ...section, fields: moveItem(section.fields, fieldIndex, 1) };
                          return { ...schema, sections };
                        })}>↓</button>
                        <button type="button" onClick={() => updateSchema(schema => {
                          const sections = [...schema.sections];
                          sections[sectionIndex] = { ...section, fields: section.fields.filter((_, index) => index !== fieldIndex) };
                          return { ...schema, sections };
                        })}>Xóa trường</button>
                        <button type="button" onClick={() => setAdvancedKeys(keys => ({ ...keys, [`${section.key}:${field.key}`]: !advancedOpen }))}>
                          Nâng cao
                        </button>
                      </div>
                      {field.type === 'select' ? (
                        <label>
                          Options
                          <textarea
                            value={(field.options || []).join('\n')}
                            onChange={event => patchField(sectionIndex, fieldIndex, {
                              options: event.target.value.split('\n').map(item => item.trim()).filter(Boolean),
                            })}
                          />
                        </label>
                      ) : null}
                      {field.type === 'repeater-table' ? (
                        <div className="quote-columns-config">
                          <h4>Cấu hình cột bảng lặp</h4>
                          {(field.config?.columns || []).map((column, columnIndex) => (
                            <div className="quote-column-row" key={`${column.key}-${columnIndex}`}>
                              <input value={column.label} onChange={event => patchColumn(sectionIndex, fieldIndex, columnIndex, { label: event.target.value })} />
                              <input value={column.key} onChange={event => patchColumn(sectionIndex, fieldIndex, columnIndex, { key: event.target.value })} />
                              <select value={column.type} onChange={event => patchColumn(sectionIndex, fieldIndex, columnIndex, { type: event.target.value as QuoteFieldType })}>
                                {fieldTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                              </select>
                              <label><input type="checkbox" checked={Boolean(column.required)} onChange={event => patchColumn(sectionIndex, fieldIndex, columnIndex, { required: event.target.checked })} /> Bắt buộc</label>
                              <label><input type="checkbox" checked={column.visible !== false} onChange={event => patchColumn(sectionIndex, fieldIndex, columnIndex, { visible: event.target.checked })} /> Hiện</label>
                              <button type="button" onClick={() => patchField(sectionIndex, fieldIndex, {
                                config: { ...(field.config || {}), columns: moveItem(field.config?.columns || [], columnIndex, -1) },
                              })}>↑</button>
                              <button type="button" onClick={() => patchField(sectionIndex, fieldIndex, {
                                config: { ...(field.config || {}), columns: moveItem(field.config?.columns || [], columnIndex, 1) },
                              })}>↓</button>
                            </div>
                          ))}
                          <button type="button" className="quote-button quote-button--secondary" onClick={() => patchField(sectionIndex, fieldIndex, {
                            config: { ...(field.config || {}), columns: [...(field.config?.columns || []), defaultField()] },
                          })}>Thêm cột</button>
                        </div>
                      ) : null}
                      {advancedOpen ? (
                        <label>
                          JSON config nâng cao
                          <textarea
                            className="quote-json-textarea"
                            value={JSON.stringify(field.config || {}, null, 2)}
                            onChange={event => {
                              try {
                                patchField(sectionIndex, fieldIndex, { config: JSON.parse(event.target.value || '{}') });
                                setError('');
                              } catch {
                                setError('Cấu hình bảng phải là JSON hợp lệ.');
                              }
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
