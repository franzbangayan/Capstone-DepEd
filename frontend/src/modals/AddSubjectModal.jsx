import '../styles/AddSubjectModal.css'
import { useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'
import api from '../api'

const getErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' | ')
  }

  return error?.message || 'Unable to save subject.'
}

// Pass `subject` (the row object from the backend) to open this in edit
// mode. Leave it undefined/null to add a new subject.
const AddSubjectModal = ({ subject, onClose, onSaved }) => {
  const [name, setName] = useState(subject?.subject_name || '')
  const [type, setType] = useState(subject?.subject_type || 'Core')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleOverlayClick = () => { onClose() }
  const handlePanelClick = (e) => { e.stopPropagation() }

  const handleSave = async () => {
    setError('')

    if (!name.trim()) {
      setError('Subject name is required.')
      return
    }

    setSaving(true)

    const payload = {
      subject_name: name.trim(),
      subject_type: type,
    }

    try {
      if (subject) {
        await api.put(`/api/subjects/${subject.subject_id}/`, payload)
      } else {
        await api.post('/api/subjects/', payload)
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
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog-panel" onClick={handlePanelClick}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>{subject ? 'Edit Subject' : 'Add Subject'}</h2>
            <p>{subject ? 'Update this subject' : 'Add a new subject to the registry'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label className="field-label">Subject Name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Mathematics"
              value={name}
              onChange={(e) => { setName(e.target.value) }}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label">Subject Type</label>
            <div className="select-wrap">
              <select value={type} onChange={(e) => { setType(e.target.value) }}>
                <option>Core</option>
                <option>Applied</option>
                <option>Specialized</option>
              </select>
              <IconChevronDown />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : subject ? 'Save Changes' : 'Add Subject'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default AddSubjectModal