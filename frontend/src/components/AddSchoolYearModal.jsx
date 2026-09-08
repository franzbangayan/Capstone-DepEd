import '../styles/AddSubjectModal.css'
import { useState } from 'react'
import { IconX } from './Icons'
import api from '../api'

const currentYear = new Date().getFullYear()

const getErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' | ')
  }

  return error?.message || 'Unable to save school year.'
}

// Pass `schoolYear` (the row object from the backend) to open this in
// edit mode. Leave it undefined/null to add a new one.
const AddSchoolYearModal = ({ schoolYear, onClose, onSaved }) => {
  const [yearStart, setYearStart] = useState(schoolYear?.year_start ?? currentYear)
  const [yearEnd,   setYearEnd]   = useState(schoolYear?.year_end ?? currentYear + 1)
  const [isActive,  setIsActive]  = useState(schoolYear?.is_active ?? false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const handleStartChange = (val) => {
    const n = Number(val)
    setYearStart(n)
    setYearEnd(n + 1)
    setError('')
  }

  const handleSave = async () => {
    setError('')

    if (yearEnd !== yearStart + 1) {
      setError('Year End must be exactly one year after Year Start.')
      return
    }

    setSaving(true)

    const payload = {
      year_start: yearStart,
      year_end: yearEnd,
      is_active: isActive,
    }

    try {
      if (schoolYear) {
        await api.put(`/api/school-years/${schoolYear.school_year_id}/`, payload)
      } else {
        await api.post('/api/school-years/', payload)
      }

      onSaved?.()
      onClose()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => { e.stopPropagation() }}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>{schoolYear ? 'Edit School Year' : 'Add School Year'}</h2>
            <p>{schoolYear ? 'Update this academic year record' : 'Add a new academic year record'}</p>
          </div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="modal-body">

          {error !== '' && (
            <div className="sy-modal-error">{error}</div>
          )}

          <div className="field">
            <label className="field-label">Year Start</label>
            <input
              className="input"
              type="number"
              min={2000}
              max={2099}
              value={yearStart}
              onChange={(e) => { handleStartChange(e.target.value) }}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label">Year End</label>
            <input
              className="input"
              type="number"
              min={2001}
              max={2100}
              value={yearEnd}
              onChange={(e) => { setYearEnd(Number(e.target.value)); setError('') }}
            />
            <span className="field-hint">Typically Year Start + 1 (e.g. 2024 → 2025)</span>
          </div>

          <label className="field-checkbox">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => { setIsActive(e.target.checked) }}
            />
            Set as the active school year
          </label>
          <span className="field-hint">
            Marking this active will automatically deactivate any other school year.
          </span>

          <div className="sy-modal-preview">
            S.Y. {yearStart}–{yearEnd}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : schoolYear ? 'Save Changes' : 'Add School Year'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default AddSchoolYearModal