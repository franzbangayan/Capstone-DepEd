import '../styles/TeacherFormModal.css'
import { useEffect, useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'
import api from '../api'

const SPECIALIZATION_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Earth Science',
  'Filipino', 'English', 'Literature', 'Araling Panlipunan', 'Social Studies',
  'MAPEH', 'Physical Education', 'Music', 'Arts',
  'TLE', 'Computer Science', 'EPP',
  'Values Education', 'Oral Communication',
  'General Biology', 'Business Mathematics', 'Statistics',
  'Creative Writing', 'General Mathematics',
]

const ACTIVE_DATE = '9999-12-31'

const getErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' | ')
  }

  return error?.message || 'Unable to save teacher.'
}

const TeacherFormModal = ({
  teacher,
  subjects = [],
  employmentStatuses = [],
  schoolId,
  onClose,
  onSaved,
}) => {
  const [lastName, setLastName] = useState(teacher?.last_name || teacher?.lastName || '')
  const [firstName, setFirstName] = useState(teacher?.first_name || teacher?.firstName || '')
  const [middleName, setMiddleName] = useState(teacher?.middle_name || teacher?.middleName || '')
  const [statusId, setStatusId] = useState(teacher?.employment_status || '')
  const [maxLoad, setMaxLoad] = useState(teacher?.max_load_hours ?? teacher?.maxLoad ?? 6)
  const [specs, setSpecs] = useState(teacher?.specializations || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!statusId && employmentStatuses.length > 0) {
      const permanent = employmentStatuses.find(
        (item) => item.status_name?.toLowerCase() === 'permanent'
      )
      setStatusId(permanent?.status_id || employmentStatuses[0].status_id)
    }
  }, [employmentStatuses, statusId])

  const toggleSpec = (name) => {
    setSpecs((current) => (
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    ))
  }

  const resolveSubjectId = (name) => {
    const subject = subjects.find(
      (item) => item.subject_name?.toLowerCase() === name.toLowerCase()
    )
    return subject?.subject_id
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

  const storedSchoolId = localStorage.getItem("school_id");
  const environmentSchoolId = import.meta.env.VITE_SCHOOL_ID;
  const subjectIds = specs.map(resolveSubjectId);
  const resolvedSchoolId = localStorage.getItem("school_id");




    if (!lastName.trim() || !firstName.trim()) {
      setError('Last name and first name are required.')
      return
    }

    if (!statusId) {
      setError('Please select an employment status.')
      return
    }

    if (!teacher && !resolvedSchoolId) {
  setError("Your account is not linked to a school.");
  return;
}


if (!teacher && Number.isNaN(Number(resolvedSchoolId))) {
  setError("The selected school ID is invalid.");
  return;
}

    if (subjectIds.some((id) => !id)) {
      setError('One or more selected specializations do not exist in the Subjects table.')
      return
    }

    setSaving(true)

    try {
    const teacherPayload = {
  last_name: lastName.trim(),
  first_name: firstName.trim(),
  middle_name: middleName.trim() || null,
  employment_status: Number(statusId),
  ...(teacher ? {} : { school: Number(resolvedSchoolId) }),
};

      const teacherResponse = teacher
        ? await api.put(`/api/teachers/${teacher.teacher_id}/`, teacherPayload)
        : await api.post('/api/teachers/', teacherPayload)

      const savedTeacher = teacherResponse.data
      const teacherId = savedTeacher.teacher_id

      const relatedResponse = await api.get('/api/teacher-load-limits/')
      const loadLimits = Array.isArray(relatedResponse.data)
        ? relatedResponse.data
        : relatedResponse.data.results || []
      const activeLoadLimit = loadLimits.find(
        (item) => Number(item.teacher) === Number(teacherId) && item.date_ended === ACTIVE_DATE
      )

      const loadPayload = {
        teacher: teacherId,
        max_load_hours: Number(maxLoad),
        date_started: new Date().toISOString().slice(0, 10),
        date_ended: ACTIVE_DATE,
      }

      if (activeLoadLimit) {
        await api.put(`/api/teacher-load-limits/${activeLoadLimit.load_limit_id}/`, {
          ...loadPayload,
          date_started: activeLoadLimit.date_started,
        })
      } else {
        await api.post('/api/teacher-load-limits/', loadPayload)
      }

      const specializationResponse = await api.get('/api/teacher-specializations/')
      const specializations = Array.isArray(specializationResponse.data)
        ? specializationResponse.data
        : specializationResponse.data.results || []

      const currentSpecializations = specializations.filter(
        (item) => Number(item.teacher) === Number(teacherId) && item.date_ended === ACTIVE_DATE
      )

      await Promise.all(
        currentSpecializations.map((item) => (
          api.delete(`/api/teacher-specializations/${item.specialization_id}/`)
        ))
      )

      await Promise.all(
        subjectIds.map((subjectId) => (
          api.post('/api/teacher-specializations/', {
            teacher: teacherId,
            subject: subjectId,
            date_started: new Date().toISOString().slice(0, 10),
            date_ended: ACTIVE_DATE,
          })
        ))
      )

      onSaved?.()
      onClose()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div className="modal-header-text">
              <h2>{teacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <p>{teacher ? 'Update faculty record' : 'Add a new faculty member'}</p>
            </div>
            <button type="button" className="modal-close" onClick={onClose}>
              <IconX />
            </button>
          </div>

          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="field-row">
              <div className="field">
                <label className="field-label">Last Name</label>
                <input className="input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">First Name</label>
                <input className="input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Middle Name</label>
                <input className="input" type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Employment Status</label>
              <div className="select-wrap">
                <select value={statusId} onChange={(e) => setStatusId(e.target.value)} required>
                  <option value="">Select status</option>
                  {employmentStatuses.map((item) => (
                    <option key={item.status_id} value={item.status_id}>{item.status_name}</option>
                  ))}
                </select>
                <IconChevronDown />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Max Load Hours / Day</label>
              <input className="input input-mono" type="number" min={1} max={8} value={maxLoad} onChange={(e) => setMaxLoad(Number(e.target.value))} required />
              <span className="field-hint">Default is 6 hours. Part-time teachers typically cap at 3.</span>
            </div>

            <div className="field">
              <label className="field-label">Specializations</label>
              {specs.length > 0 && (
                <div className="spec-selected">
                  {specs.map((name) => (
                    <span key={name} className="spec-chip">
                      {name}
                      <button type="button" onClick={() => toggleSpec(name)}><IconX /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="spec-options">
                {SPECIALIZATION_OPTIONS.filter((name) => !specs.includes(name)).map((name) => (
                  <button type="button" key={name} className="spec-option" onClick={() => toggleSpec(name)}>
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline btn-full" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? 'Saving…' : teacher ? 'Save Changes' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TeacherFormModal
