import '../styles/AddSubjectModal.css'
import { useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'

const AddSubjectModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('')
  const [type, setType] = useState('Core')

  const handleOverlayClick = () => { onClose() }
  const handlePanelClick   = (e) => { e.stopPropagation() }

  const handleSave = () => {
    if (name.trim()) {
      onSave && onSave({ name: name.trim(), type })
    }
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog-panel" onClick={handlePanelClick}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Add Subject</h2>
            <p>Add a new subject to the registry</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="modal-body">
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
          <button className="btn btn-outline btn-full" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-full" onClick={handleSave}>
            Add Subject
          </button>
        </div>

      </div>
    </div>
  )
}

export default AddSubjectModal
