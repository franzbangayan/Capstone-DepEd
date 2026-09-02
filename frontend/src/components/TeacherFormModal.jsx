import '../styles/TeacherFormModal.css'
import { useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'


//Not yet connected to the backend



const SPECIALIZATION_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Earth Science',
  'Filipino', 'English', 'Literature', 'Araling Panlipunan', 'Social Studies',
  'MAPEH', 'Physical Education', 'Music', 'Arts',
  'TLE', 'Computer Science', 'EPP',
  'Values Education', 'Oral Communication',
  'General Biology', 'Business Mathematics', 'Statistics',
  'Creative Writing', 'General Mathematics',
]

const TeacherFormModal = ({ teacher, onClose }) => {
  const [lastName,   setLastName]   = useState(teacher ? teacher.lastName   : '')
  const [firstName,  setFirstName]  = useState(teacher ? teacher.firstName  : '')
  const [middleName, setMiddleName] = useState(teacher ? teacher.middleName : '')
  const [status,  setStatus]  = useState(teacher ? teacher.status : 'Permanent')
  const [maxLoad, setMaxLoad] = useState(teacher ? teacher.maxLoad : 6)
  const [specs,   setSpecs]   = useState(teacher ? teacher.specializations : [])

  const toggleSpec = (s) => {
    if (specs.includes(s)) {
      setSpecs(specs.filter((x) => { return x !== s }))
    } else {
      setSpecs(specs.concat([s]))
    }
  }

  const handleOverlayClick = () => {
    onClose()
  }

  const handlePanelClick = (e) => {
    e.stopPropagation()
  }


  const HandleSubmit = async =>{

  }

    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-panel" onClick={handlePanelClick}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>{teacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
            <p>{teacher ? 'Update faculty record' : 'Add a new faculty member'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="modal-body">

          <div className="field-row">
            <div className="field">
              <label className="field-label">Last Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Santos"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value) }}
              />
            </div>

            <div className="field">
              <label className="field-label">First Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Maria"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value) }}
              />
            </div>

            <div className="field">
              <label className="field-label">Middle Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Luz"
                value={middleName}
                onChange={(e) => { setMiddleName(e.target.value) }}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Employment Status</label>
            <div className="select-wrap">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value) }}
              >
                <option>Permanent</option>
                <option>Provisional</option>
                <option>Part-time</option>
              </select>
              <IconChevronDown />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Max Load Hours / Day</label>
            <input
              className="input input-mono"
              type="number"
              min={1}
              max={8}
              value={maxLoad}
              onChange={(e) => { setMaxLoad(Number(e.target.value)) }}
            />
            <span className="field-hint">Default is 6 hours. Part-time teachers typically cap at 3.</span>
          </div>

          <div className="field">
            <label className="field-label">Specializations</label>

            {specs.length > 0 && (
              <div className="spec-selected">
                {specs.map((s) => {
                  return (
                    <span key={s} className="spec-chip">
                      {s}
                      <button onClick={() => { toggleSpec(s) }}>
                        <IconX />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            <div className="spec-options">
              {SPECIALIZATION_OPTIONS.filter((s) => {
                return !specs.includes(s)
              }).map((s) => {
                return (
                  <button
                    key={s}
                    className="spec-option"
                    onClick={() => { toggleSpec(s) }}
                  >
                    + {s}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-full" onClick={onClose}>
            {teacher ? 'Save Changes' : 'Add Teacher'}
          </button>
        </div>

      </div>
    </div>
}

export default TeacherFormModal