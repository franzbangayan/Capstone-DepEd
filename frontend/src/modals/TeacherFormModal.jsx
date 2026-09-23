import '../styles/TeacherFormModal.css'
import { useEffect, useState } from 'react'
import { IconX, IconChevronDown } from '../components/Icons'
import api from '../api'

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

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

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
  const [birthdate, setBirthdate] = useState(teacher?.birthdate || '')
  const [gender, setGender] = useState(teacher?.gender || '')
  const [houseNumber, setHouseNumber] = useState(teacher?.house_no_street || '')
  const [Barangay, setBarangay] = useState(teacher?.barangay || '')
  const [city, setCity] = useState(teacher?.city_municipality || '')
  const [province, setProvince] = useState(teacher?.province || '')
  const [zipCode, setZipCode] = useState(teacher?.zip_code || '')
  const [contactNumber, setContactNumber] = useState(teacher?.contact_number || '')
  const [email, setEmail] = useState(teacher?.email || '')
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

    setSaving(true)

    try {
      const teacherPayload = {
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        gender: gender || null,
        birthdate: birthdate || null,
        house_no_street: houseNumber.trim() || null,
        barangay: Barangay.trim() || null,
        city_municipality: city.trim() || null,
        province: province.trim() || null,
        zip_code: zipCode.trim() || null,
        contact_number: contactNumber.trim() || null,
        email: email.trim() || null,
        employment_status: Number(statusId),
        ...(teacher ? {} : { school: Number(resolvedSchoolId) }),
      };

      const teacherResponse = teacher
        ? await api.put(`/api/teachers/${teacher.teacher_id}/`, teacherPayload)
        : await api.post('/api/teachers/', teacherPayload)

      const savedTeacher = teacherResponse.data
      const teacherId = savedTeacher.teacher_id

      // --- Load limit (unchanged) ---
      const relatedResponse = await api.get('/api/teacher-load-limits/')
      const loadLimits = listData(relatedResponse)
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

      // --- Specializations ---
      // Options in the UI now come straight from the `subjects` prop
      // (real Subject rows), so every name in `specs` should resolve.
      // Fail loudly instead of silently dropping one if it doesn't -
      // that mismatch is exactly what caused specializations to never
      // get saved before.
      const desiredSubjectIds = specs.map((name) => {
        const subjectId = resolveSubjectId(name)
        if (!subjectId) {
          throw new Error(`"${name}" is not a recognized subject. Refresh the page and try again.`)
        }
        return subjectId
      })

      const specResponse = await api.get('/api/teacher-specializations/')
      const allSpecs = listData(specResponse)
      const activeSpecs = allSpecs.filter(
        (item) => Number(item.teacher) === Number(teacherId) && item.date_ended === ACTIVE_DATE
      )
      const activeSubjectIds = activeSpecs.map((item) => item.subject)
      const today = new Date().toISOString().slice(0, 10)

      // Newly checked subjects that aren't already an active specialization.
      const toAdd = desiredSubjectIds.filter((id) => !activeSubjectIds.includes(id))
      await Promise.all(toAdd.map((subjectId) => (
        api.post('/api/teacher-specializations/', {
          teacher: teacherId,
          subject: subjectId,
          date_started: today,
          date_ended: ACTIVE_DATE,
        })
      )))

      // Unchecked subjects that were active - close them out (matches
      // the date_ended sentinel convention used everywhere else in
      // this schema) instead of deleting, so history is preserved.
      const toClose = activeSpecs.filter((item) => !desiredSubjectIds.includes(item.subject))
      await Promise.all(toClose.map((item) => (
        api.put(`/api/teacher-specializations/${item.specialization_id}/`, {
          ...item,
          date_ended: today,
        })
      )))

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
              <label className="field-label">Birthdate</label>
              <div className="select-wrap">
                <input className="input" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Gender</label>
              <div className="select-wrap">
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
                <IconChevronDown />
              </div>
            </div>

            <div className="field">
              <label className="field-label">House Number / Street</label>
              <input className="input" type="text" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label">Barangay</label>
              <input className="input" type="text" value={Barangay} onChange={(e) => setBarangay(e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label">City</label>
              <input className="input" type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label">Province</label>
              <input className="input" type="text" value={province} onChange={(e) => setProvince(e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label">Zip Code</label>
              <input className="input" type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label">Contact Number</label>
              <input className="input" type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required />
            </div>

            <div className="field">
              <label className="field-label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
              {subjects.length === 0 && (
                <span className="field-hint">No subjects found. Add subjects in Curriculum Setup first.</span>
              )}
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
                {subjects
                  .map((s) => s.subject_name)
                  .filter((name) => !specs.includes(name))
                  .map((name) => (
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