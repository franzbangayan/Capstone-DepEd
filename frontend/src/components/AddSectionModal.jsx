import '../styles/AddSubjectModal.css'
import { useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'

const ALL_GRADE_LEVELS = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
]

const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Sports', 'Arts and Design']

const SHS_GRADES = ['Grade 11', 'Grade 12']

const SCHOOL_YEARS = ['2024–2025', '2023–2024', '2022–2023']

const AddSectionModal = ({ onClose, onSave }) => {
  const [name,       setName]       = useState('')
  const [grade,      setGrade]      = useState('Grade 1')
  const [strand,     setStrand]     = useState('STEM')
  const [adviser,    setAdviser]    = useState('')
  const [schoolYear, setSchoolYear] = useState('2024–2025')

  const isSHS = SHS_GRADES.includes(grade)

  const handleGradeChange = (val) => {
    setGrade(val)
    if (!SHS_GRADES.includes(val)) setStrand('STEM')
  }

  const handleSave = () => {
    onSave && onSave({
      name,
      grade,
      strand: isSHS ? strand : '—',
      adviser: adviser.trim() || '—',
      schoolYear,
    })
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => { e.stopPropagation() }}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Add Section</h2>
            <p>Register a new class section</p>
          </div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="modal-body">

          <div className="field">
            <label className="field-label">Section Name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Sampaguita"
              value={name}
              onChange={(e) => { setName(e.target.value) }}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label">Grade Level</label>
            <div className="select-wrap">
              <select value={grade} onChange={(e) => { handleGradeChange(e.target.value) }}>
                {ALL_GRADE_LEVELS.map((g) => { return <option key={g}>{g}</option> })}
              </select>
              <IconChevronDown />
            </div>
          </div>

          {isSHS && (
            <div className="field">
              <label className="field-label">Strand</label>
              <div className="select-wrap">
                <select value={strand} onChange={(e) => { setStrand(e.target.value) }}>
                  {SHS_STRANDS.map((s) => { return <option key={s}>{s}</option> })}
                </select>
                <IconChevronDown />
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label">Adviser <span className="field-optional">(optional)</span></label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Maria Santos"
              value={adviser}
              onChange={(e) => { setAdviser(e.target.value) }}
            />
          </div>

          <div className="field">
            <label className="field-label">School Year</label>
            <div className="select-wrap">
              <select value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value) }}>
                {SCHOOL_YEARS.map((sy) => { return <option key={sy}>{sy}</option> })}
              </select>
              <IconChevronDown />
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={handleSave}>Add Section</button>
        </div>

      </div>
    </div>
  )
}

export default AddSectionModal
