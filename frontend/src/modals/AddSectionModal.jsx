import '../styles/AddSubjectModal.css'
import { useEffect, useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'
import api from '../api'

const ALL_GRADE_LEVELS = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
]

const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Sports', 'Arts and Design']

const SHS_GRADES = ['Grade 11', 'Grade 12']

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const getErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' | ')
  }

  return error?.message || 'Unable to save section.'
}

// Pass `section` (the row object from the backend) to open in edit mode.
const AddSectionModal = ({ section, onClose, onSaved }) => {
  const [name,       setName]       = useState(section?.section_name || '')
  const [grade,      setGrade]      = useState('Grade 1')
  const [strand,     setStrand]     = useState('STEM')
  const [adviserId,  setAdviserId]  = useState(section?.adviser_teacher || '')
  const [schoolYearId, setSchoolYearId] = useState(section?.school_year || '')

  const [gradeLevels,  setGradeLevels]  = useState([])
  const [strands,      setStrands]      = useState([])
  const [schoolYears,  setSchoolYears]  = useState([])
  const [teachers,     setTeachers]     = useState([])

  const [loadingLookups, setLoadingLookups] = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const isSHS = SHS_GRADES.includes(grade)

  // Load real DB rows so we can resolve the hardcoded labels above to
  // actual IDs, and populate live dropdowns for school year / adviser.
  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true)
      try {
        const [gradeRes, strandRes, syRes, teacherRes] = await Promise.all([
          api.get('/api/grade-levels/'),
          api.get('/api/strands/'),
          api.get('/api/school-years/'),
          api.get('/api/teachers/'),
        ])
        setGradeLevels(listData(gradeRes))
        setStrands(listData(strandRes))
        setSchoolYears(listData(syRes))
        setTeachers(listData(teacherRes))
      } catch (loadError) {
        setError(loadError?.response?.data?.detail || 'Unable to load grade levels, strands, school years, or teachers.')
      } finally {
        setLoadingLookups(false)
      }
    }
    loadLookups()
  }, [])

  // If editing, once grade levels/strands are loaded, resolve the
  // section's existing grade_level/strand IDs back to display labels.
  useEffect(() => {
    if (!section || gradeLevels.length === 0) return
    const gl = gradeLevels.find((g) => g.grade_level_id === section.grade_level)
    if (gl) setGrade(gl.grade_name)
  }, [section, gradeLevels])

  useEffect(() => {
    if (!section || strands.length === 0) return
    const st = strands.find((s) => s.strand_id === section.strand)
    if (st) setStrand(st.strand_name)
  }, [section, strands])

  const handleGradeChange = (val) => {
    setGrade(val)
    if (!SHS_GRADES.includes(val)) setStrand('STEM')
  }

  const resolveGradeLevelId = (label) => {
    const match = gradeLevels.find((g) => g.grade_name?.toLowerCase() === label.toLowerCase())
    return match?.grade_level_id
  }

  const resolveStrandId = (label) => {
    const match = strands.find((s) => s.strand_name?.toLowerCase() === label.toLowerCase())
    return match?.strand_id
  }

  const handleSave = async () => {
    setError('')

    if (!name.trim()) {
      setError('Section name is required.')
      return
    }

    if (!schoolYearId) {
      setError('Please select a school year.')
      return
    }

    const gradeLevelId = resolveGradeLevelId(grade)
    if (!gradeLevelId) {
      setError(`"${grade}" was not found in the database. Ask an admin to add it under Grade Levels first.`)
      return
    }

    let strandId = null
    if (isSHS) {
      strandId = resolveStrandId(strand)
      if (!strandId) {
        setError(`"${strand}" was not found in the database. Ask an admin to add it under Tracks & Strands first.`)
        return
      }
    }

    setSaving(true)

    const payload = {
      section_name: name.trim(),
      school_year: Number(schoolYearId),
      grade_level: gradeLevelId,
      strand: strandId,
      adviser_teacher: adviserId ? Number(adviserId) : null,
    }

    try {
      if (section) {
        await api.put(`/api/sections/${section.section_id}/`, payload)
      } else {
        await api.post('/api/sections/', payload)
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
            <h2>{section ? 'Edit Section' : 'Add Section'}</h2>
            <p>{section ? 'Update this class section' : 'Register a new class section'}</p>
          </div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="modal-body">

          {error && <div className="form-error">{error}</div>}

          {loadingLookups ? (
            <div className="table-empty-cell">Loading form data…</div>
          ) : (
            <>
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
                <div className="select-wrap">
                  <select value={adviserId} onChange={(e) => { setAdviserId(e.target.value) }}>
                    <option value="">— None —</option>
                    {teachers.map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>
                        {t.last_name}, {t.first_name}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown />
                </div>
              </div>

              <div className="field">
                <label className="field-label">School Year</label>
                <div className="select-wrap">
                  <select value={schoolYearId} onChange={(e) => { setSchoolYearId(e.target.value) }}>
                    <option value="">Select school year</option>
                    {schoolYears.map((sy) => (
                      <option key={sy.school_year_id} value={sy.school_year_id}>
                        {sy.year_start}–{sy.year_end}{sy.is_active ? ' (Active)' : ''}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown />
                </div>
              </div>
            </>
          )}

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || loadingLookups}>
            {saving ? 'Saving…' : section ? 'Save Changes' : 'Add Section'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default AddSectionModal