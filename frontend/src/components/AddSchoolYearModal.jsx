import '../styles/AddSubjectModal.css'
import { useState } from 'react'
import { IconX } from './Icons'

const currentYear = new Date().getFullYear()

const AddSchoolYearModal = ({ onClose, onSave }) => {
  const [yearStart, setYearStart] = useState(currentYear)
  const [yearEnd,   setYearEnd]   = useState(currentYear + 1)
  const [error,     setError]     = useState('')

  const handleStartChange = (val) => {
    const n = Number(val)
    setYearStart(n)
    setYearEnd(n + 1)
    setError('')
  }

  const handleSave = () => {
    if (yearEnd !== yearStart + 1) {
      setError('Year End must be exactly one year after Year Start.')
      return
    }
    onSave && onSave({ start: yearStart, end: yearEnd, active: false })
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => { e.stopPropagation() }}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Add School Year</h2>
            <p>Add a new academic year record</p>
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

          <div className="sy-modal-preview">
            S.Y. {yearStart}–{yearEnd}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={handleSave}>Add School Year</button>
        </div>

      </div>
    </div>
  )
}

export default AddSchoolYearModal
