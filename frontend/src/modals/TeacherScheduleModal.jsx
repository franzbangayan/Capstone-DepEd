import '../styles/TeacherScheduleModal.css'
import { useEffect, useState } from 'react'
import { IconX } from '../components/Icons'
import api from '../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// Matches the double-shift day defined in algorithm.py (PERIODS_BY_SHIFT) -
// keep these in sync if the bell schedule ever changes.
const SHIFT_PERIODS = {
  Morning: [
    { start: '06:00', end: '06:50' },
    { start: '06:50', end: '07:40' },
    { start: '07:40', end: '08:30' },
    { start: '08:30', end: '08:50', isBreak: true },
    { start: '08:50', end: '09:40' },
    { start: '09:40', end: '10:30' },
    { start: '10:30', end: '11:20' },
  ],
  Afternoon: [
    { start: '12:10', end: '13:00' },
    { start: '13:00', end: '13:50' },
    { start: '13:50', end: '14:40' },
    { start: '14:40', end: '15:00', isBreak: true },
    { start: '15:00', end: '15:50' },
    { start: '15:50', end: '16:40' },
    { start: '16:40', end: '17:30' },
  ],
}

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const formatTime = (t) => {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 === 0 ? 12 : h % 12
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`
}

const PERIODS = [...SHIFT_PERIODS.Morning, ...SHIFT_PERIODS.Afternoon]

const TeacherScheduleModal = ({ teacher, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gridByKey, setGridByKey] = useState({})   // "Monday|07:30" -> { subject, section, room }
  const [totalPeriods, setTotalPeriods] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [loadsRes, sectionsRes, offeringsRes, subjectsRes] = await Promise.all([
          api.get('/api/teaching-loads/'),
          api.get('/api/sections/'),
          api.get('/api/subject-offerings/'),
          api.get('/api/subjects/'),
        ])

        const loads = listData(loadsRes).filter(
          (l) => Number(l.teacher) === Number(teacher.teacher_id)
        )
        const sections = listData(sectionsRes)
        const offerings = listData(offeringsRes)
        const subjects = listData(subjectsRes)

        const sectionNameById = Object.fromEntries(sections.map((s) => [s.section_id, s.section_name]))
        const offeringById = Object.fromEntries(offerings.map((o) => [o.offering_id, o]))
        const subjectNameById = Object.fromEntries(subjects.map((s) => [s.subject_id, s.subject_name]))

        const grid = {}
        loads.forEach((l) => {
          const offering = offeringById[l.offering]
          const key = `${l.day}|${l.time_start.slice(0, 5)}`
          grid[key] = {
            subject: offering ? subjectNameById[offering.subject] : 'Unknown subject',
            section: sectionNameById[l.section] || 'Unknown section',
            room: l.room_assigned || '—',
          }
        })

        setGridByKey(grid)
        setTotalPeriods(loads.length)
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load this teacher\'s schedule.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [teacher.teacher_id])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="schedule-modal-panel" onClick={(e) => { e.stopPropagation() }}>

        <div className="schedule-toolbar no-print">
          <div>
            <h2>{teacher.first_name} {teacher.last_name}'s Schedule</h2>
            <p>{totalPeriods} period{totalPeriods === 1 ? '' : 's'} per week</p>
          </div>
          <div className="schedule-toolbar-actions">
            <button className="btn btn-primary btn-sm" onClick={handlePrint} disabled={loading}>Print</button>
            <button className="modal-close" onClick={onClose}><IconX /></button>
          </div>
        </div>

        <div className="schedule-scroll-area">
          {loading ? (
            <div className="schedule-empty">Loading…</div>
          ) : error ? (
            <div className="schedule-empty">{error}</div>
          ) : (
            <div id="printable-teacher-schedule" className="schedule-paper">
              <div className="schedule-letterhead">
                <h1>{teacher.first_name} {teacher.last_name}</h1>
                <p>Weekly Teaching Schedule</p>
              </div>

              <table className="schedule-grid">
                <thead>
                  <tr>
                    <th>Time</th>
                    {DAYS.map((day) => <th key={day}>{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p) => (
                    p.isBreak ? (
                      <tr key={p.start} className="schedule-break-row">
                        <td className="schedule-time-cell">{formatTime(p.start)}–{formatTime(p.end)}</td>
                        <td className="schedule-break-cell" colSpan={DAYS.length}>Break</td>
                      </tr>
                    ) : (
                      <tr key={p.start}>
                        <td className="schedule-time-cell">{formatTime(p.start)}–{formatTime(p.end)}</td>
                        {DAYS.map((day) => {
                          const cell = gridByKey[`${day}|${p.start}`]
                          return (
                            <td key={day} className={cell ? 'schedule-cell filled' : 'schedule-cell'}>
                              {cell ? (
                                <>
                                  <div className="schedule-cell-subject">{cell.subject}</div>
                                  <div className="schedule-cell-meta">{cell.section}</div>
                                  <div className="schedule-cell-meta">{cell.room}</div>
                                </>
                              ) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  ))}
                </tbody>
              </table>

              {totalPeriods === 0 && (
                <div className="schedule-empty" style={{ marginTop: '16px' }}>
                  No teaching load assigned yet for this teacher.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default TeacherScheduleModal