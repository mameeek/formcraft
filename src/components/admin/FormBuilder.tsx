'use client'

import { useState } from 'react'
import type { FormConfig, FormField, FormSection, FieldType, FieldCondition, ConditionRule } from '@/types'
import { Btn, Card, Label, Input, Select, IconBtn } from '@/components/ui'
import { uid, normalizeCondition } from '@/lib/utils'

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: 'text',     label: 'ข้อความ',           icon: '✏️' },
  { value: 'email',    label: 'อีเมล',              icon: '📧' },
  { value: 'tel',      label: 'เบอร์โทร',           icon: '📞' },
  { value: 'textarea', label: 'ข้อความยาว',         icon: '📝' },
  { value: 'dropdown', label: 'Dropdown',            icon: '▾' },
  { value: 'choice',   label: 'Choice (ปุ่ม)',      icon: '🔘' },
  { value: 'checkbox', label: 'Checkbox',            icon: '☑️' },
  { value: 'file',     label: 'ไฟล์',               icon: '📎' },
  { value: 'shipping', label: 'วิธีจัดส่ง',         icon: '🚚' },
]

// Placeholder + regex only make sense for free-text inputs.
const TEXT_LIKE_TYPES: FieldType[] = ['text', 'email', 'tel', 'textarea']

const PRESET_REGEX: Record<string, { pattern: string; msg: string }> = {
  email: { pattern: '^[^@]+@[^@]+\\.[^@]+$', msg: 'รูปแบบอีเมลไม่ถูกต้อง' },
  tel:   { pattern: '^[0-9\\-\\+\\s]{8,15}$',  msg: 'รูปแบบเบอร์โทรไม่ถูกต้อง' },
}

// A fresh value matching whatever `fieldId` now points to — switching the
// condition's target field must not leave a stale value from the old one
// (e.g. a Thai option label left behind after switching to __shipping__,
// which expects the literal "delivery"/"pickup").
function defaultConditionValue(fieldId: string, allFields: FormField[]): string {
  if (fieldId === '__shipping__') return 'delivery'
  const target = allFields.find(f => f.id === fieldId)
  // Shipping fields are almost always used to gate something on "delivery"
  // (the 2nd option) — default there instead of the less useful 1st option.
  if (target?.type === 'shipping') return target.options?.[1] || target.options?.[0] || ''
  return target?.options?.[0] || ''
}

// The rule's "value" must match the target field exactly — free text lets
// you type a value the field can never actually produce (wrong language,
// typo, stale option) with no indication anything's wrong. Render a dropdown
// of the field's real options whenever we can.
function ConditionValueField({ rule, allFields, onChange, style }: {
  rule: { fieldId: string; value: string }
  allFields: FormField[]
  onChange: (value: string) => void
  style?: React.CSSProperties
}) {
  if (rule.fieldId === '__shipping__') {
    return (
      <Select value={rule.value} onChange={e => onChange(e.target.value)} style={style}>
        <option value="pickup">รับที่สถานที่ (pickup)</option>
        <option value="delivery">จัดส่งทางไปรษณีย์ (delivery)</option>
      </Select>
    )
  }
  const targetOptions = allFields.find(f => f.id === rule.fieldId)?.options
  if (targetOptions?.length) {
    return (
      <Select value={rule.value} onChange={e => onChange(e.target.value)} style={style}>
        {targetOptions.map(o => <option key={o} value={o}>{o}</option>)}
      </Select>
    )
  }
  return <Input value={rule.value} onChange={e => onChange(e.target.value)} placeholder="ค่าที่ต้องตรงกัน" style={style} />
}

// A condition is a group of one or more rules combined with a single AND/OR
// (applies uniformly — no mixed/nested logic, which covers the common case
// without the UI complexity of arbitrary boolean trees).
function ConditionEditor({ label, condition, allFields, onChange }: {
  label: string
  condition: FieldCondition
  allFields: FormField[]
  onChange: (cond: FieldCondition) => void
}) {
  const updateRule = (idx: number, patch: Partial<ConditionRule>) =>
    onChange({ ...condition, rules: condition.rules.map((r, i) => i === idx ? { ...r, ...patch } : r) })

  const addRule = () => {
    const fieldId = allFields[0]?.id || '__shipping__'
    onChange({ ...condition, rules: [...condition.rules, { fieldId, operator: 'equals', value: defaultConditionValue(fieldId, allFields) }] })
  }

  const removeRule = (idx: number) => {
    const rules = condition.rules.filter((_, i) => i !== idx)
    onChange({ ...condition, rules: rules.length ? rules : condition.rules })
  }

  return (
    <div style={{ background: 'var(--bg-deep)', borderRadius: 8, padding: 10 }}>
      {condition.rules.map((rule, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: idx < condition.rules.length - 1 ? 8 : 0 }}>
          {idx === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, width: 64 }}>{label}</span>
          ) : (
            <Select value={condition.logic} onChange={e => onChange({ ...condition, logic: e.target.value as 'AND' | 'OR' })}
              style={{ width: 64, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              <option value="AND">และ</option>
              <option value="OR">หรือ</option>
            </Select>
          )}
          <Select value={rule.fieldId}
            onChange={e => {
              const fieldId = e.target.value
              updateRule(idx, { fieldId, value: defaultConditionValue(fieldId, allFields) })
            }}
            style={{ flex: 1, minWidth: 110, fontSize: 12 }}>
            <option value="__shipping__">การจัดส่ง</option>
            {allFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </Select>
          <Select value={rule.operator} onChange={e => updateRule(idx, { operator: e.target.value as ConditionRule['operator'] })}
            style={{ width: 110, fontSize: 12 }}>
            <option value="equals">= เท่ากับ</option>
            <option value="not_equals">≠ ไม่เท่ากับ</option>
            <option value="contains">∋ มีคำว่า</option>
          </Select>
          <ConditionValueField rule={rule} allFields={allFields} onChange={v => updateRule(idx, { value: v })}
            style={{ flex: 1, minWidth: 70, fontSize: 12 }} />
          {condition.rules.length > 1 && (
            <button onClick={() => removeRule(idx)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={addRule}
        style={{ marginTop: 8, fontSize: 11, background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
        + เพิ่มเงื่อนไข
      </button>
    </div>
  )
}

// ── Field card (collapsed/expanded) ─────────────────────────────────────────
function FieldCard({ field, allFields, sectionId, sections, onUpdate, onRemove, onMoveUp, onMoveDown, onMoveToSection, canMoveUp, canMoveDown }: {
  field: FormField
  allFields: FormField[]
  sectionId: string
  sections: { id: string; title: string }[]
  onUpdate: (key: keyof FormField, val: unknown) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveToSection: (toSectionId: string) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const hasOptions = ['dropdown', 'choice', 'checkbox', 'select'].includes(field.type)
  const isShipping = field.type === 'shipping'
  const isTextLike = TEXT_LIKE_TYPES.includes(field.type)

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
      {/* Header row — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onMoveUp() }} disabled={!canMoveUp}
            style={{ background: 'none', border: 'none', cursor: canMoveUp ? 'pointer' : 'default', color: canMoveUp ? 'var(--text-muted)' : 'transparent', fontSize: 10, padding: 0, lineHeight: 1 }}>▲</button>
          <button onClick={e => { e.stopPropagation(); onMoveDown() }} disabled={!canMoveDown}
            style={{ background: 'none', border: 'none', cursor: canMoveDown ? 'pointer' : 'default', color: canMoveDown ? 'var(--text-muted)' : 'transparent', fontSize: 10, padding: 0, lineHeight: 1 }}>▼</button>
        </div>

        {/* Label (editable inline) */}
        <input
          value={field.label}
          onChange={e => { e.stopPropagation(); onUpdate('label', e.target.value) }}
          onClick={e => e.stopPropagation()}
          placeholder="ชื่อฟิลด์"
          style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none', minWidth: 80 }}
        />

        {/* Type badge */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-deep)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {FIELD_TYPES.find(t => t.value === field.type)?.icon} {field.type}
        </span>

        {/* Width toggle */}
        <button onClick={e => { e.stopPropagation(); onUpdate('width', field.width === 'half' ? 'full' : 'half') }}
          style={{ fontSize: 10, background: field.width === 'half' ? 'var(--purple-dim)' : 'var(--bg-deep)', color: field.width === 'half' ? 'var(--purple)' : 'var(--text-muted)', border: `1px solid ${field.width === 'half' ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 5, padding: '2px 7px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {field.width === 'half' ? '½' : '⬛'}
        </button>

        {/* Required dot */}
        <label onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: field.required ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={field.required} onChange={e => onUpdate('required', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          *
        </label>

        {/* Condition indicator */}
        {field.condition && <span style={{ fontSize: 14, flexShrink: 0 }} title="มีเงื่อนไข">⚡</span>}

        <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>✕</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 14px 14px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {/* Type selector */}
            <div style={{ flex: 1 }}>
              <Label>ประเภท</Label>
              <Select value={field.type} onChange={e => {
                onUpdate('type', e.target.value)
                // Auto-fill regex for email/tel
                const preset = PRESET_REGEX[e.target.value]
                if (preset && !field.validationRegex) {
                  onUpdate('validationRegex', preset.pattern)
                  onUpdate('validationMessage', preset.msg)
                }
              }}>
                {FIELD_TYPES.filter(t => t.value !== 'shipping' || isShipping || !allFields.some(f => f.type === 'shipping')).map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </Select>
            </div>
            {isTextLike && (
              <div style={{ flex: 2 }}>
                <Label>Placeholder</Label>
                <Input value={field.placeholder || ''} onChange={e => onUpdate('placeholder', e.target.value)} placeholder="ข้อความ placeholder" />
              </div>
            )}
          </div>

          {/* Options */}
          {hasOptions && (
            <div style={{ marginBottom: 10 }}>
              <Label>ตัวเลือก <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(แต่ละบรรทัด = 1 ตัวเลือก)</span></Label>
              <textarea
                value={(field.options || []).join('\n')}
                onChange={e => onUpdate('options', e.target.value.split('\n').map(o => o.trim()).filter(Boolean))}
                rows={4}
                placeholder={'ตัวเลือก 1\nตัวเลือก 2\nตัวเลือก 3'}
                style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, padding: '9px 11px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          )}

          {/* Shipping method: pickup/delivery labels + delivery cost, instead of the generic options/regex editors */}
          {isShipping && (
            <div style={{ marginBottom: 10 }}>
              <Label>ตัวเลือกรับสินค้า</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input value={field.options?.[0] || ''} placeholder="รับที่สถานที่ (ฟรี)"
                  onChange={e => onUpdate('options', [e.target.value, field.options?.[1] || ''])} />
                <Input value={field.options?.[1] || ''} placeholder="จัดส่งทางไปรษณีย์"
                  onChange={e => onUpdate('options', [field.options?.[0] || '', e.target.value])} />
              </div>
              <Label>ค่าจัดส่ง (฿) <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(เพิ่มเมื่อเลือกตัวเลือกที่ 2)</span></Label>
              <Input type="number" value={String(field.shippingCost ?? 0)}
                onChange={e => onUpdate('shippingCost', Number(e.target.value))} style={{ width: 140 }} />
            </div>
          )}

          {/* Regex validation */}
          {isTextLike && (
          <div style={{ marginBottom: 10 }}>
            <Label>Regex Validation <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(ไม่บังคับ)</span></Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {Object.entries(PRESET_REGEX).map(([key, val]) => (
                <button key={key} onClick={() => { onUpdate('validationRegex', val.pattern); onUpdate('validationMessage', val.msg) }}
                  style={{ fontSize: 11, background: field.validationRegex === val.pattern ? 'var(--purple-dim)' : 'var(--bg-deep)', color: field.validationRegex === val.pattern ? 'var(--purple)' : 'var(--text-muted)', border: `1px solid ${field.validationRegex === val.pattern ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  {key}
                </button>
              ))}
              {field.validationRegex && (
                <button onClick={() => { onUpdate('validationRegex', ''); onUpdate('validationMessage', '') }}
                  style={{ fontSize: 11, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  ล้าง
                </button>
              )}
            </div>
            <Input value={field.validationRegex || ''} onChange={e => onUpdate('validationRegex', e.target.value)}
              placeholder="^[0-9]+$" style={{ marginBottom: 6, fontFamily: 'monospace', fontSize: 12 }} />
            <Input value={field.validationMessage || ''} onChange={e => onUpdate('validationMessage', e.target.value)}
              placeholder="ข้อความแจ้งเตือนเมื่อรูปแบบผิด" />
          </div>
          )}

          {/* Condition logic */}
          <div>
            <Label>แสดงเมื่อ (Logic)</Label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6 }}>
              <input type="checkbox" checked={!!field.condition}
                onChange={e => onUpdate('condition', e.target.checked ? { logic: 'AND', rules: [{ fieldId: '__shipping__', operator: 'equals', value: 'delivery' }] } : null)} />
              เปิดใช้เงื่อนไข
            </label>
            {field.condition && (
              <ConditionEditor label="แสดงเมื่อ" condition={normalizeCondition(field.condition)!}
                allFields={allFields.filter(f => f.id !== field.id)}
                onChange={cond => onUpdate('condition', cond)} />
            )}
          </div>

          {/* Move to another topic — sections are just a grouping, so a field
              can freely relocate without losing its id (anything referencing
              it by id, like another section's condition, keeps working). */}
          {sections.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <Label>ย้ายไปหัวข้ออื่น</Label>
              <Select value="" onChange={e => { if (e.target.value) onMoveToSection(e.target.value) }}>
                <option value="">-- ย้ายไปหัวข้อ --</option>
                {sections.filter(s => s.id !== sectionId).map(s => (
                  <option key={s.id} value={s.id}>{s.title || 'หัวข้อใหม่'}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ section, allFields, sections, onUpdate, onRemove, onUpdateField, onRemoveField, onAddField, onMoveFieldUp, onMoveFieldDown, onMoveFieldToSection, onMoveSectionUp, onMoveSectionDown, canMoveSectionUp, canMoveSectionDown }: {
  section: FormSection
  allFields: FormField[]
  sections: { id: string; title: string }[]
  onUpdate: (key: keyof FormSection, val: unknown) => void
  onRemove: () => void
  onUpdateField: (fid: string, key: keyof FormField, val: unknown) => void
  onRemoveField: (fid: string) => void
  onAddField: (type: FieldType) => void
  onMoveFieldUp: (fid: string) => void
  onMoveFieldDown: (fid: string) => void
  onMoveFieldToSection: (fid: string, toSectionId: string) => void
  onMoveSectionUp: () => void
  onMoveSectionDown: () => void
  canMoveSectionUp: boolean
  canMoveSectionDown: boolean
}) {
  return (
    <Card style={{ marginBottom: 14 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {/* Reorder whole topic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button onClick={onMoveSectionUp} disabled={!canMoveSectionUp}
            style={{ background: 'none', border: 'none', cursor: canMoveSectionUp ? 'pointer' : 'default', color: canMoveSectionUp ? 'var(--text-muted)' : 'transparent', fontSize: 11, padding: 0, lineHeight: 1 }}>▲</button>
          <button onClick={onMoveSectionDown} disabled={!canMoveSectionDown}
            style={{ background: 'none', border: 'none', cursor: canMoveSectionDown ? 'pointer' : 'default', color: canMoveSectionDown ? 'var(--text-muted)' : 'transparent', fontSize: 11, padding: 0, lineHeight: 1 }}>▼</button>
        </div>

        <input value={section.title} onChange={e => onUpdate('title', e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', outline: 'none' }}
          placeholder="ชื่อหัวข้อ" />

        {/* Section-level condition */}
        <label title="เงื่อนไขซ่อน/แสดงหัวข้อทั้งหมด" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: section.condition ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={!!section.condition}
            onChange={e => onUpdate('condition', e.target.checked ? { logic: 'AND', rules: [{ fieldId: '__shipping__', operator: 'equals', value: 'delivery' }] } : null)} />
          ⚡ logic
        </label>

        <IconBtn onClick={onRemove} title="ลบหัวข้อ">🗑️</IconBtn>
      </div>

      {/* Section condition config */}
      {section.condition && (
        <div style={{ marginBottom: 14 }}>
          <ConditionEditor label="แสดงหัวข้อนี้เมื่อ" condition={normalizeCondition(section.condition)!}
            allFields={allFields}
            onChange={cond => onUpdate('condition', cond)} />
        </div>
      )}

      {/* Fields */}
      {section.fields.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0 12px', textAlign: 'center' }}>ยังไม่มีฟิลด์ กดปุ่มด้านล่างเพื่อเพิ่ม</div>
      )}
      {section.fields.map((f, idx) => (
        <FieldCard key={f.id} field={f} allFields={allFields} sectionId={section.id} sections={sections}
          onUpdate={(key, val) => onUpdateField(f.id, key, val)}
          onRemove={() => onRemoveField(f.id)}
          onMoveUp={() => onMoveFieldUp(f.id)}
          onMoveDown={() => onMoveFieldDown(f.id)}
          onMoveToSection={(toSectionId) => onMoveFieldToSection(f.id, toSectionId)}
          canMoveUp={idx > 0}
          canMoveDown={idx < section.fields.length - 1}
        />
      ))}

      {/* Add field buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {FIELD_TYPES.filter(t => t.value !== 'shipping' || !allFields.some(f => f.type === 'shipping')).map(t => (
          <button key={t.value} onClick={() => onAddField(t.value)}
            style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)' }}>
            + {t.icon} {t.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

// ── Main FormBuilder ─────────────────────────────────────────────────────────
export default function FormBuilder({ form, setForm }: { form: FormConfig; setForm: (f: FormConfig) => void }) {
  const allFields = form.sections.flatMap(s => s.fields)

  const updateSection = (sid: string, key: keyof FormSection, val: unknown) =>
    setForm({ ...form, sections: form.sections.map(s => s.id === sid ? { ...s, [key]: val } : s) })

  const removeSection = (sid: string) => {
    const section = form.sections.find(s => s.id === sid)
    const label = section ? `หัวข้อ "${section.title}"${section.fields.length ? ` (${section.fields.length} ฟิลด์)` : ''}` : 'หัวข้อนี้'
    if (!window.confirm(`ลบ${label}? (การเปลี่ยนแปลงนี้จะยังไม่บันทึกจนกว่าจะกด "บันทึกการเปลี่ยนแปลง")`)) return
    setForm({ ...form, sections: form.sections.filter(s => s.id !== sid) })
  }

  const addSection = () =>
    setForm({ ...form, sections: [...form.sections, { id: uid(), title: 'หัวข้อใหม่', fields: [], condition: null }] })

  const addField = (sid: string, type: FieldType) => {
    const preset = PRESET_REGEX[type]
    const isShipping = type === 'shipping'
    setForm({
      ...form, sections: form.sections.map(s => s.id === sid ? {
        ...s, fields: [...s.fields, {
          id: uid(), type, label: isShipping ? 'วิธีรับสินค้า' : (FIELD_TYPES.find(t => t.value === type)?.label || 'ฟิลด์ใหม่'),
          placeholder: '', required: true, width: 'full',
          options: isShipping ? ['รับที่สถานที่', 'จัดส่งทางไปรษณีย์'] : [],
          shippingCost: isShipping ? 0 : undefined,
          validationRegex: preset?.pattern || '',
          validationMessage: preset?.msg || '',
        }]
      } : s)
    })
  }

  const updateField = (sid: string, fid: string, key: keyof FormField, val: unknown) =>
    setForm({
      ...form, sections: form.sections.map(s => s.id === sid ? {
        ...s, fields: s.fields.map(f => f.id === fid ? { ...f, [key]: val } : f)
      } : s)
    })

  const removeField = (sid: string, fid: string) => {
    const field = form.sections.find(s => s.id === sid)?.fields.find(f => f.id === fid)
    if (!window.confirm(`ลบฟิลด์ "${field?.label || ''}"? (การเปลี่ยนแปลงนี้จะยังไม่บันทึกจนกว่าจะกด "บันทึกการเปลี่ยนแปลง")`)) return
    setForm({
      ...form, sections: form.sections.map(s => s.id === sid ? {
        ...s, fields: s.fields.filter(f => f.id !== fid)
      } : s)
    })
  }

  const moveField = (sid: string, fid: string, dir: 1 | -1) =>
    setForm({
      ...form, sections: form.sections.map(s => {
        if (s.id !== sid) return s
        const fields = [...s.fields]
        const idx = fields.findIndex(f => f.id === fid)
        const newIdx = idx + dir
        if (newIdx < 0 || newIdx >= fields.length) return s
        ;[fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]]
        return { ...s, fields }
      })
    })

  const moveSection = (sid: string, dir: 1 | -1) => {
    const sections = [...form.sections]
    const idx = sections.findIndex(s => s.id === sid)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sections.length) return
    ;[sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]]
    setForm({ ...form, sections })
  }

  // Relocates a field to a different topic without touching its id — anything
  // that references it by id (e.g. another section's show/hide condition)
  // keeps working no matter which topic it currently lives under.
  const moveFieldToSection = (fromSid: string, fid: string, toSid: string) => {
    if (fromSid === toSid) return
    const field = form.sections.find(s => s.id === fromSid)?.fields.find(f => f.id === fid)
    if (!field) return
    setForm({
      ...form, sections: form.sections.map(s => {
        if (s.id === fromSid) return { ...s, fields: s.fields.filter(f => f.id !== fid) }
        if (s.id === toSid) return { ...s, fields: [...s.fields, field] }
        return s
      })
    })
  }

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>ข้อมูลฟอร์ม</h3>
        <Label>ชื่อฟอร์ม</Label>
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ marginBottom: 12 }} />
        <Label>คำอธิบาย</Label>
        <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
      </Card>

      <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--purple)', lineHeight: 1.6 }}>
        💡 <strong>Logic:</strong> กดลูกศร ▲▼ เพื่อเรียงหัวข้อ/ฟิลด์ · ⚡ เพื่อกำหนดเงื่อนไขแสดง/ซ่อน ·
        เพิ่มฟิลด์ <strong>🚚 วิธีจัดส่ง</strong> ในหัวข้อไหนก็ได้เพื่อกำหนดวิธีรับสินค้า แล้วใช้ชื่อฟิลด์นั้นเป็นเงื่อนไขที่อื่นได้
      </div>

      {form.sections.map((sec, idx) => (
        <SectionCard key={sec.id} section={sec} allFields={allFields}
          sections={form.sections.map(s => ({ id: s.id, title: s.title }))}
          onUpdate={(key, val) => updateSection(sec.id, key, val)}
          onRemove={() => removeSection(sec.id)}
          onUpdateField={(fid, key, val) => updateField(sec.id, fid, key, val)}
          onRemoveField={(fid) => removeField(sec.id, fid)}
          onAddField={(type) => addField(sec.id, type)}
          onMoveFieldUp={(fid) => moveField(sec.id, fid, -1)}
          onMoveFieldDown={(fid) => moveField(sec.id, fid, 1)}
          onMoveFieldToSection={(fid, toSid) => moveFieldToSection(sec.id, fid, toSid)}
          onMoveSectionUp={() => moveSection(sec.id, -1)}
          onMoveSectionDown={() => moveSection(sec.id, 1)}
          canMoveSectionUp={idx > 0}
          canMoveSectionDown={idx < form.sections.length - 1}
        />
      ))}

      <Btn onClick={addSection} variant="ghost">+ เพิ่มหัวข้อ</Btn>
    </div>
  )
}
