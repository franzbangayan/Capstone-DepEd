import '../styles/TeachersPage.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconSearch, IconChevronDown, IconPlus, IconEdit, IconTrash } from '../components/Icons'
import TeacherFormModal from '../modals/TeacherFormModal'
import ImportTeachersModal from '../modals/ImportTeachersModal'
import TeacherScheduleModal from '../modals/TeacherScheduleModal'
import api from '../api'
import { confirmDialog } from '../components/ConfirmDialog'

const ACTIVE_DATE = '9999-12-31'
const TEACHERS_PAGE_SIZE = 10

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
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [scheduleTeacher, setScheduleTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

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
    // Loading remote teacher data is an intentional effect-side state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const pageCount = Math.max(1, Math.ceil(displayTeachers.length / TEACHERS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visibleTeachers = displayTeachers.slice(
    (safePage - 1) * TEACHERS_PAGE_SIZE,
    safePage * TEACHERS_PAGE_SIZE,
  )

  const handleSearchChange = (value) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value) => {
    setFilterStatus(value)
    setPage(1)
  }

  const openAdd = () => {
    setEditingTeacher(null)
    setShowModal(true)
  }

  const openEdit = (teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const deleteTeacher = async (teacher) => {
    if (!(await confirmDialog({
      title: 'Delete teacher?',
      message: `${teacher.first_name} ${teacher.last_name} will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    }))) return

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
          <input className="input" type="text" placeholder="Search by name or specialization…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>

        <div className="select-wrap">
          <select value={filterStatus} onChange={(e) => handleStatusChange(e.target.value)}>
            <option>All</option>
            {employmentStatuses.map((item) => <option key={item.status_id}>{item.status_name}</option>)}
          </select>
          <IconChevronDown />
        </div>

        <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>Import</button>
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
              visibleTeachers.map((teacher) => (
                <tr key={teacher.teacher_id}>
                  <td>{teacher.last_name}</td>
                  <td>{teacher.first_name}</td>
                  <td>{teacher.middle_name || '—'}</td>
                  <td>{teacher.status}</td>
                  <td>{teacher.maxLoad}</td>
                  <td>{teacher.specializations.length ? teacher.specializations.join(', ') : '—'}</td>
                  <td className="right">
                    <button className="btn btn-outline btn-sm" onClick={() => setScheduleTeacher(teacher)}>View / Print Schedule</button>
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(teacher)}><IconEdit /></button>
                    <button className="icon-btn" title="Delete" onClick={() => deleteTeacher(teacher)}><IconTrash /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="table-footer">
          <span className="table-count">
            Showing {displayTeachers.length ? (safePage - 1) * TEACHERS_PAGE_SIZE + 1 : 0}–{Math.min(safePage * TEACHERS_PAGE_SIZE, displayTeachers.length)} of {displayTeachers.length} filtered teachers ({teachers.length} total)
          </span>
          {pageCount > 1 && (
            <div className="teacher-pagination">
              <button className="btn btn-outline btn-sm" onClick={() => setPage((current) => current - 1)} disabled={safePage === 1}>Previous</button>
              <span>Page {safePage} of {pageCount}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setPage((current) => current + 1)} disabled={safePage === pageCount}>Next</button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TeacherFormModal
          teacher={editingTeacher}
          subjects={subjects}
          employmentStatuses={employmentStatuses}
          onClose={() => {
            setShowModal(false)
            setEditingTeacher(null)
          }}
          onSaved={loadTeachers}
        />
      )}

      {showImportModal && (
        <ImportTeachersModal
          subjects={subjects}
          employmentStatuses={employmentStatuses}
          onClose={() => setShowImportModal(false)}
          onSaved={loadTeachers}
        />
      )}

      {scheduleTeacher && (
        <TeacherScheduleModal
          teacher={scheduleTeacher}
          onClose={() => setScheduleTeacher(null)}
        />
      )}
    </div>
  )
}

export default TeachersPage
