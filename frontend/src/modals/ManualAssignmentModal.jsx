import '../styles/ImportSectionsModal.css'
import '../styles/ManualAssignmentModal.css'
import { useState, useEffect, useCallback } from 'react'
import { IconX } from '../components/Icons'
import api from '../api'
import { confirmDialog } from '../components/ConfirmDialog'

const errorText = (err) => err?.response?.data?.detail || err?.message || 'Request failed.'

const fmtHours = (t) => `${Math.round(t.hours * 10) / 10}/${t.max_hours ?? '?'}h`

const TeacherSelect = ({ row, teachers, value, onChange }) => {
  const qualified = new Set(row.qualified_teacher_ids)
  const q = teachers.filter((t) => qualified.has(t.teacher_id))
  const other = teachers.filter((t) => !qualified.has(t.teacher_id))

  return (
    <select className="input ma-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select teacher…</option>
      <optgroup label="Qualified for this subject">
        {q.map((t) => (
          <option key={t.teacher_id} value={t.teacher_id}>{t.name} ({fmtHours(t)})</option>
        ))}
      </optgroup>
      <optgroup label="Not listed for this subject">
        {other.map((t) => (
          <option key={t.teacher_id} value={t.teacher_id}>{t.name} ({fmtHours(t)})</option>
        ))}
      </optgroup>
    </select>
  )
}

const ManualAssignmentModal = ({ scope, onClose, onChanged }) => {
  const [tab, setTab] = useState('unassigned')
  const [data, setData] = useState({ unassigned: [], assigned: [], teachers: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [picked, setPicked] = useState({})   // `${section}-${offering}` -> teacher id
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/manual-assignment/', { params: scope })
      setData(res.data)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => { load() }, [load])

  const keyOf = (r) => `${r.section_id}-${r.offering_id}`

  const assign = async (row, teacherId) => {
    if (!teacherId) return
    const qualified = row.qualified_teacher_ids.includes(Number(teacherId))
    const teacher = data.teachers.find((t) => String(t.teacher_id) === String(teacherId))

    if (!qualified && !(await confirmDialog({
      title: 'Teacher not listed for this subject',
      message: `${teacher?.name} is not listed as qualified for ${row.subject}. Assign anyway?`,
      confirmLabel: 'Assign anyway',
    }))) return

    setBusyKey(keyOf(row))
    setError('')
    try {
      await api.post('/api/manual-assignment/', {
        section: row.section_id,
        offering: row.offering_id,
        teacher: Number(teacherId),
        force: !qualified,
      })
      setPicked((p) => ({ ...p, [keyOf(row)]: '' }))
      await load()
      onChanged?.()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusyKey('')
    }
  }

  const remove = async (row) => {
    if (!(await confirmDialog({
      title: 'Remove assignment?',
      message: `${row.teacher} will be removed from ${row.section} / ${row.subject}.`,
      confirmLabel: 'Remove',
      danger: true,
    }))) return
    setBusyKey(keyOf(row))
    setError('')
    try {
      await api.delete('/api/manual-assignment/', {
        params: { section: row.section_id, offering: row.offering_id },
      })
      await load()
      onChanged?.()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusyKey('')
    }
  }

  const match = (text) => text.toLowerCase().includes(filter.trim().toLowerCase())
  const unassigned = data.unassigned.filter((r) => match(`${r.section} ${r.subject}`))
  const assigned = data.assigned.filter((r) => match(`${r.section} ${r.subject} ${r.teacher}`))
  const teachers = data.teachers.filter((t) => match(t.name))

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel ma-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Manual Assignment</h2>
            <p>Assign, change or remove teachers. Manual assignments are preserved separately from generated loads.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="ma-toolbar">
            <div className="ma-tabs">
              <button className={tab === 'unassigned' ? 'ma-tab active' : 'ma-tab'} onClick={() => setTab('unassigned')}>
                Unassigned ({data.unassigned.length})
              </button>
              <button className={tab === 'assigned' ? 'ma-tab active' : 'ma-tab'} onClick={() => setTab('assigned')}>
                Assigned ({data.assigned.length})
              </button>
              <button className={tab === 'teachers' ? 'ma-tab active' : 'ma-tab'} onClick={() => setTab('teachers')}>
                Teachers ({data.teachers.length})
              </button>
            </div>
            <input className="input ma-filter" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>

          {loading ? (
            <div className="import-preview">Loading…</div>
          ) : tab === 'unassigned' ? (
            <div className="ma-list">
              {unassigned.length === 0 && <div className="import-preview">Nothing unassigned in this scope.</div>}
              {unassigned.map((r) => (
                <div className="ma-row" key={keyOf(r)}>
                  <div className="ma-row-main">
                    <strong>{r.section}</strong> · {r.subject} <span className="ma-muted">{r.hours}h/wk</span>
                  </div>
                  <TeacherSelect
                    row={r}
                    teachers={data.teachers}
                    value={picked[keyOf(r)] || ''}
                    onChange={(v) => setPicked((p) => ({ ...p, [keyOf(r)]: v }))}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={!picked[keyOf(r)] || busyKey === keyOf(r)}
                    onClick={() => assign(r, picked[keyOf(r)])}
                  >
                    {busyKey === keyOf(r) ? '…' : 'Assign'}
                  </button>
                </div>
              ))}
            </div>
          ) : tab === 'assigned' ? (
            <div className="ma-list">
              {assigned.length === 0 && <div className="import-preview">Nothing assigned in this scope.</div>}
              {assigned.map((r) => (
                <div className="ma-row" key={keyOf(r)}>
                  <div className="ma-row-main">
                    <strong>{r.section}</strong> · {r.subject} <span className="ma-muted">{r.hours}h/wk</span>
                    <div className="ma-muted">
                      {r.teacher}{r.is_manual ? ' · manual' : ''}
                    </div>
                  </div>
                  <TeacherSelect
                    row={r}
                    teachers={data.teachers}
                    value=""
                    onChange={(v) => assign(r, v)}
                  />
                  <button className="btn btn-outline" disabled={busyKey === keyOf(r)} onClick={() => remove(r)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="ma-list">
              {teachers.map((t) => (
                <div className="ma-row ma-row-simple" key={t.teacher_id}>
                  <div className="ma-row-main">{t.name}</div>
                  <div className={t.hours === 0 ? 'ma-muted ma-warn' : 'ma-muted'}>
                    {t.hours === 0 ? 'No load yet' : fmtHours(t)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline btn-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default ManualAssignmentModal
