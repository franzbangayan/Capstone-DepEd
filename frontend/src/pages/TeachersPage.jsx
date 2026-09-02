import '../styles/TeachersPage.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconSearch, IconChevronDown, IconPlus, IconEdit, IconTrash } from '../components/Icons'
import TeacherFormModal from '../components/TeacherFormModal'
import api from '../api'

const ACTIVE_DATE = '9999-12-31'

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [employmentStatuses, setEmploymentStatuses] = useState([])
  const [loadLimits, setLoadLimits] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTeachers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [teacherResponse, subjectResponse, statusResponse, loadResponse, specializationResponse] = await Promise.all([
        api.get('/api/teachers/'),
        api.get('/api/subjects/'),
        api.get('/api/employment-statuses/'),
        api.get('/api/teacher-load-limits/'),
        api.get('/api/teacher-specializations/'),
      ])

      setTeachers(listData(teacherResponse))
      setSubjects(listData(subjectResponse))
      setEmploymentStatuses(listData(statusResponse))
      setLoadLimits(listData(loadResponse))
      setSpecializations(listData(specializationResponse))
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || 'Unable to load teachers from the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  const statusNameById = useMemo(() => (
    Object.fromEntries(employmentStatuses.map((item) => [item.status_id, item.status_name]))
  ), [employmentStatuses])

  const subjectNameById = useMemo(() => (
    Object.fromEntries(subjects.map((item) => [item.subject_id, item.subject_name]))
  ), [subjects])

  const displayTeachers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return teachers
      .map((teacher) => {
        const teacherLoad = loadLimits.find(
          (item) => Number(item.teacher) === Number(teacher.teacher_id) && item.date_ended === ACTIVE_DATE
        )
        const teacherSpecs = specializations
          .filter((item) => Number(item.teacher) === Number(teacher.teacher_id) && item.date_ended === ACTIVE_DATE)
          .map((item) => subjectNameById[item.subject] || `Subject #${item.subject}`)

        return {
          ...teacher,
          status: statusNameById[teacher.employment_status] || 'Unknown',
          maxLoad: teacherLoad?.max_load_hours ?? '—',
          specializations: teacherSpecs,
        }
      })
      .filter((teacher) => {
        const matchesStatus = filterStatus === 'All' || teacher.status === filterStatus
        const searchable = [teacher.last_name, teacher.first_name, teacher.middle_name, ...teacher.specializations]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return matchesStatus && (!query || searchable.includes(query))
      })
  }, [teachers, loadLimits, specializations, subjectNameById, statusNameById, search, filterStatus])

  const openAdd = () => {
    setEditingTeacher(null)
    setShowModal(true)
  }

  const openEdit = (teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const deleteTeacher = async (teacher) => {
    if (!window.confirm(`Delete ${teacher.first_name} ${teacher.last_name}?`)) return

    try {
      await api.delete(`/api/teachers/${teacher.teacher_id}/`)
      await loadTeachers()
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || 'Unable to delete teacher.')
    }
  }

  return (
    <div className="screen stack">
      <div className="toolbar">
        <div className="search-wrap">
          <IconSearch />
          <input className="input" type="text" placeholder="Search by name or specialization…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="select-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option>All</option>
            {employmentStatuses.map((item) => <option key={item.status_id}>{item.status_name}</option>)}
          </select>
          <IconChevronDown />
        </div>

        <button className="btn btn-primary" onClick={openAdd}><IconPlus /> Add Teacher</button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Middle Name</th>
              <th>Status</th>
              <th>Max Load</th>
              <th>Specializations</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-empty-cell">Loading teachers…</td></tr>
            ) : displayTeachers.length === 0 ? (
              <tr><td colSpan={7} className="table-empty-cell">No teachers found.</td></tr>
            ) : (
              displayTeachers.map((teacher) => (
                <tr key={teacher.teacher_id}>
                  <td>{teacher.last_name}</td>
                  <td>{teacher.first_name}</td>
                  <td>{teacher.middle_name || '—'}</td>
                  <td>{teacher.status}</td>
                  <td>{teacher.maxLoad}</td>
                  <td>{teacher.specializations.length ? teacher.specializations.join(', ') : '—'}</td>
                  <td className="right">
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(teacher)}><IconEdit /></button>
                    <button className="icon-btn" title="Delete" onClick={() => deleteTeacher(teacher)}><IconTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="table-footer">
          <span className="table-count">Showing {displayTeachers.length} of {teachers.length} teachers</span>
        </div>
      </div>

      {showModal && (
        <TeacherFormModal
          teacher={editingTeacher}
          subjects={subjects}
          employmentStatuses={employmentStatuses}
          schoolId={localStorage.getItem('school_id') || import.meta.env.VITE_SCHOOL_ID}
          onClose={() => {
            setShowModal(false)
            setEditingTeacher(null)
          }}
          onSaved={loadTeachers}
        />
      )}
    </div>
  )
}

export default TeachersPage
