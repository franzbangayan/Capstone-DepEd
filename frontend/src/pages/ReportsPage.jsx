import '../styles/ReportsPage.css'
import { useEffect, useState } from 'react'
import api from '../api'

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

// Same flattening as SchedulingPage - backend groups periods under each
// assignment (assignment.schedule = [...]); flatten for the flat table view.
const formatTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 === 0 ? 12 : h % 12
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`
}

const flattenSchedule = (assigned) => {
  const rows = []
  assigned.forEach((a) => {
    (a.schedule || []).forEach((s) => {
      rows.push({
        teacher: a.teacher,
        section: a.section,
        subject: a.subject,
        day: s.day,
        time: `${formatTime(s.time_start)}–${formatTime(s.time_end)}`,
        room: s.room,
      })
    })
  })
  return rows
}

const ReportsPage = ({ onNavigate }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [clearing, setClearing] = useState(false)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/generation-logs/')
      setLogs(listData(res))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load generation history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all generation history? This only removes the log entries below, not any actual teaching loads.')) return
    setClearing(true)
    try {
      await api.post('/api/clear-generation-history/')
      setExpandedId(null)
      await loadLogs()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to clear generation history.')
    } finally {
      setClearing(false)
    }
  }

  const toggleExpand = (logId) => {
    setExpandedId((current) => (current === logId ? null : logId))
  }

  const scopeLabel = (log) => {
    if (!log.education_level || log.education_level === 'All') return 'All Levels'
    const parts = [log.education_level]
    if (log.grade_level && log.grade_level !== 'All Levels') parts.push(log.grade_level)
    if (log.strand && log.strand !== 'N/A') parts.push(log.strand)
    return parts.join(' · ')
  }

  return (
    <div className="screen stack">

      {/* Report cards - unchanged */}
      <div className="report-cards">
        <div className="report-card">
          <div className="report-card-top">
            <div className="report-card-title">Teaching Load Summary</div>
            <span className="badge badge-slate">Not Generated</span>
          </div>
          <div className="report-card-desc">
            Full breakdown of teacher-subject-section assignments for the active school year.
          </div>
          <div className="report-card-actions">
            <button className="btn btn-outline btn-sm btn-full">Preview</button>
            <button className="btn btn-primary btn-sm btn-full">Export PDF</button>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-top">
            <div className="report-card-title">Unassigned Load Report</div>
            <span className="badge badge-slate">Not Generated</span>
          </div>
          <div className="report-card-desc">
            Subjects and sections with no assigned teacher (requires manual review.)
          </div>
          <div className="report-card-actions">
            <button className="btn btn-outline btn-sm btn-full">Preview</button>
            <button className="btn btn-primary btn-sm btn-full">Export PDF</button>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-top">
            <div className="report-card-title">Workload Balance Report</div>
            <span className="badge badge-green">Available</span>
          </div>
          <div className="report-card-desc">
            Comparison of assigned hours per teacher against maximum load capacity.
          </div>
          <div className="report-card-actions">
            <button
              className="btn btn-outline btn-sm btn-full"
              onClick={() => { onNavigate && onNavigate('workload-dashboard') }}
            >
              View Dashboard
            </button>
            <button className="btn btn-primary btn-sm btn-full">Export PDF</button>
          </div>
        </div>
      </div>

      {/* History table - now real data */}
      <div className="card card-body">
        <div className="row-between">
          <div className="section-title">Generated Load History</div>
          {logs.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={handleClearHistory} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear History'}
            </button>
          )}
        </div>
        <div className="table-wrap report-history-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date Generated</th>
                <th>School Year</th>
                <th>Algorithm</th>
                <th>Scope</th>
                <th>Generated By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-empty-cell">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="table-empty-cell">{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="table-empty-cell">No records found. Generate a teaching load to see history here.</td></tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr
                      key={log.log_id}
                      onClick={() => toggleExpand(log.log_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{new Date(log.generated_at).toLocaleString()}</td>
                      <td>{log.school_year_label || '—'}</td>
                      <td>{log.algorithm === 'backtracking' ? 'Backtracking' : 'Greedy'}</td>
                      <td>{scopeLabel(log)}</td>
                      <td>{log.generated_by_username || '—'}</td>
                      <td>
                        {log.assigned_count} assigned
                        {log.skipped_count > 0 ? `, ${log.skipped_count} unresolved` : ''}
                        {log.duration_seconds ? ` · ${log.duration_seconds.toFixed(2)}s` : ''}
                      </td>
                    </tr>
                    {expandedId === log.log_id && (
                      <tr key={`${log.log_id}-detail`}>
                        <td colSpan={6}>
                          <div className="paper-sheet-inline" style={{ padding: '8px 12px' }}>
                            <table className="paper-table">
                              <thead>
                                <tr>
                                  <th>Teacher</th>
                                  <th>Section</th>
                                  <th>Subject</th>
                                  <th>Day</th>
                                  <th>Time</th>
                                  <th>Room</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const rows = flattenSchedule(log.details?.assigned || [])
                                  return rows.length === 0 ? (
                                    <tr><td colSpan={6} className="paper-empty">Nothing was assigned in this run.</td></tr>
                                  ) : (
                                    rows.map((r, i) => (
                                      <tr key={i}>
                                        <td>{r.teacher}</td>
                                        <td>{r.section}</td>
                                        <td>{r.subject}</td>
                                        <td>{r.day}</td>
                                        <td>{r.time}</td>
                                        <td>{r.room}</td>
                                      </tr>
                                    ))
                                  )
                                })()}
                              </tbody>
                            </table>
                            {(log.details?.skipped || []).length > 0 && (
                              <div className="paper-unresolved">
                                <h2>Unresolved</h2>
                                <ul>
                                  {log.details.skipped.map((s, i) => (
                                    <li key={i}>{s.section} — {s.subject}: {s.reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default ReportsPage