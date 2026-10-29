import '../styles/ReportsPage.css'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import { confirmDialog } from '../components/ConfirmDialog'
import { useSchool } from '../contexts/SchoolContext.jsx'

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const formatTime = (timeValue) => {
  if (!timeValue) return ''
  const [hours, minutes] = timeValue.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

const formatSchedule = (schedule = []) => schedule.map((slot) => (
  `${slot.day} ${formatTime(slot.time_start)}–${formatTime(slot.time_end)}`
)).join(' · ')

const REPORT_PAGE_SIZE = 10

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const printReport = (reportType, reports, title) => {
  const definitions = {
    teaching: {
      heading: ['Teacher', 'Section', 'Grade', 'Subject', 'Hours', 'Periods', 'Schedule'],
      rows: (reports?.teaching_load_summary || []).map((row) => [
        row.teacher, row.section, row.grade_level, row.subject,
        row.hours_per_week, row.periods_scheduled, formatSchedule(row.schedule),
      ]),
    },
    unassigned: {
      heading: ['Section', 'Grade', 'Subject', 'Required Periods', 'Assigned', 'Remaining', 'Status'],
      rows: (reports?.unassigned_load_report || []).map((row) => [
        row.section, row.grade_level, row.subject, row.required_periods,
        row.assigned_periods, row.remaining_periods, row.status,
      ]),
    },
    workload: {
      heading: ['Teacher', 'Employment', 'Assigned Hours', 'Maximum', 'Remaining', 'Utilization', 'Status'],
      rows: (reports?.workload_balance_report || []).map((row) => [
        row.teacher, row.employment_status, row.assigned_hours,
        row.maximum_hours ?? '—', row.remaining_hours ?? '—',
        row.utilization_percent == null ? '—' : `${row.utilization_percent}%`, row.status,
      ]),
    },
  }
  const definition = definitions[reportType]
  if (!definition) return

  // Keep this as a direct user-initiated popup. Some browsers open a blank
  // tab when noopener/noreferrer is supplied while writing a new document.
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  const header = definition.heading.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')
  const body = definition.rows.length
    ? definition.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${definition.heading.length}">No data found for this report.</td></tr>`

  const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #0f172a; font-size: 10px; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { color: #64748b; margin: 0 0 14px; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; vertical-align: top; }
      th { background: #e2e8f0; font-weight: 700; }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(reports?.school_year?.label || 'Active school year')}</p>
    <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`
  printWindow.document.open()
  printWindow.document.write(documentHtml)
  printWindow.document.close()
  printWindow.focus()
  printWindow.setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}

const Pagination = ({ page, pageCount, total, onChange }) => {
  if (pageCount <= 1) return null
  return (
    <div className="report-pagination">
      <span>Showing {(page - 1) * REPORT_PAGE_SIZE + 1}–{Math.min(page * REPORT_PAGE_SIZE, total)} of {total}</span>
      <div className="report-pagination-buttons">
        <button className="btn btn-outline btn-sm" onClick={() => onChange(page - 1)} disabled={page === 1}>Previous</button>
        <span>Page {page} of {pageCount}</span>
        <button className="btn btn-outline btn-sm" onClick={() => onChange(page + 1)} disabled={page === pageCount}>Next</button>
      </div>
    </div>
  )
}

const ReportsPage = () => {
  const { schoolName, activeSchoolYear } = useSchool()
  const [logs, setLogs] = useState([])
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [activeReport, setActiveReport] = useState(null)
  const [reportPage, setReportPage] = useState(1)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const year = activeSchoolYear?.year_start
      const query = year ? `?school_year=${encodeURIComponent(year)}` : ''
      const [reportsResponse, logsResponse] = await Promise.all([
        api.get(`/api/reports/${query}`),
        api.get(`/api/generation-logs/${query}`),
      ])
      setReports(reportsResponse.data)
      setLogs(listData(logsResponse).filter((log) => log.algorithm === 'greedy'))
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load reports.')
    } finally {
      setLoading(false)
    }
  }, [activeSchoolYear])

  useEffect(() => {
    // Loading remote report data is an intentional effect-side state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports()
  }, [loadReports])

  const handleClearHistory = async () => {
    if (!(await confirmDialog({
      title: 'Clear generation history?',
      message: 'This only removes the log entries below, not any actual teaching loads.',
      confirmLabel: 'Clear history',
      danger: true,
    }))) return

    setClearing(true)
    try {
      await api.post('/api/clear-generation-history/')
      setExpandedId(null)
      await loadReports()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to clear generation history.')
    } finally {
      setClearing(false)
    }
  }

  const scopeLabel = (log) => {
    if (!log.education_level || log.education_level === 'All') return 'All Levels'
    const parts = [log.education_level]
    if (log.grade_level && log.grade_level !== 'All Levels') parts.push(log.grade_level)
    if (log.strand && log.strand !== 'N/A') parts.push(log.strand)
    return parts.join(' · ')
  }

  const summary = reports?.summary || {}
  const assignments = reports?.teaching_load_summary || []
  const unassigned = reports?.unassigned_load_report || []
  const workload = reports?.workload_balance_report || []

  const reportTitle = useMemo(() => ({
    teaching: 'Teaching Load Summary',
    unassigned: 'Unassigned Load Report',
    workload: 'Workload Balance Report',
  }[activeReport] || ''), [activeReport])

  const reportRows = activeReport === 'teaching' ? assignments : activeReport === 'unassigned' ? unassigned : workload
  const reportPageCount = Math.max(1, Math.ceil(reportRows.length / REPORT_PAGE_SIZE))
  const safeReportPage = Math.min(reportPage, reportPageCount)
  const visibleReportRows = reportRows.slice(
    (safeReportPage - 1) * REPORT_PAGE_SIZE,
    safeReportPage * REPORT_PAGE_SIZE,
  )

  const openReport = (reportType) => {
    setReportPage(1)
    setActiveReport(reportType)
  }

  const exportReport = (reportType) => {
    printReport(reportType, reports, {
      teaching: 'Teaching Load Summary',
      unassigned: 'Unassigned Load Report',
      workload: 'Workload Balance Report',
    }[reportType])
  }

  return (
    <div className="screen stack">
      <div className="report-page-heading">
        <div>
          <div className="section-title">Reports</div>
          <div className="section-sub">
            {schoolName || 'School'} · {reports?.school_year?.label || 'Active school year'}
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadReports} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh Reports'}
        </button>
      </div>

      {error && <div className="report-error">{error}</div>}

      <div className="report-cards">
        <div className="report-card">
          <div className="report-card-top">
            <div className="report-card-title">Teaching Load Summary</div>
            <span className="badge badge-green">{summary.teaching_assignments || 0} assignments</span>
          </div>
          <div className="report-card-desc">
            Full teacher, subject, section, period, and room breakdown for the selected school year.
          </div>
          <div className="report-card-actions">
            <button className="btn btn-outline btn-sm btn-full" onClick={() => openReport('teaching')}>
              Preview
            </button>
            <button className="btn btn-primary btn-sm btn-full" onClick={() => exportReport('teaching')}>
              Export PDF
            </button>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-top">
            <div className="report-card-title">Unassigned Load Report</div>
            <span className={`badge ${unassigned.length ? 'badge-amber' : 'badge-green'}`}>
              {unassigned.length} unresolved
            </span>
          </div>
          <div className="report-card-desc">
            Subject offerings with no complete teacher assignment, including partial assignments and remaining periods.
          </div>
          <div className="report-card-actions">
            <button className="btn btn-outline btn-sm btn-full" onClick={() => openReport('unassigned')}>
              Preview
            </button>
            <button className="btn btn-primary btn-sm btn-full" onClick={() => exportReport('unassigned')}>
              Export PDF
            </button>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-top">
            <div className="report-card-title">Workload Balance Report</div>
            <span className="badge badge-green">{workload.length} teachers</span>
          </div>
          <div className="report-card-desc">
            Assigned hours, maximum capacity, remaining capacity, utilization, and allocation status per teacher.
          </div>
          <div className="report-card-actions">
            <button className="btn btn-outline btn-sm btn-full" onClick={() => openReport('workload')}>
              Preview
            </button>
            <button className="btn btn-primary btn-sm btn-full" onClick={() => exportReport('workload')}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {activeReport && (
        <div className="report-preview card card-body">
          <div className="row-between report-preview-heading">
            <div>
              <div className="section-title">{reportTitle}</div>
              <div className="section-sub">{reports?.school_year?.label || 'Active school year'}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setActiveReport(null)}>Close Preview</button>
          </div>

          {activeReport === 'teaching' && (
            <div className="table-wrap">
              <table className="data-table report-data-table">
                <thead><tr><th>Teacher</th><th>Section</th><th>Grade</th><th>Subject</th><th>Hours</th><th>Periods</th><th>Schedule</th></tr></thead>
                <tbody>
                  {!assignments.length ? <tr><td colSpan={7} className="table-empty-cell">No teaching loads found for this school year.</td></tr> : visibleReportRows.map((row) => (
                    <tr key={`${row.teacher_id}-${row.section_id}-${row.offering_id}`}>
                      <td>{row.teacher}</td><td>{row.section}</td><td>{row.grade_level}</td><td>{row.subject}</td>
                      <td>{row.hours_per_week}</td><td>{row.periods_scheduled}</td><td>{formatSchedule(row.schedule)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={safeReportPage} pageCount={reportPageCount} total={assignments.length} onChange={setReportPage} />
            </div>
          )}

          {activeReport === 'unassigned' && (
            <div className="table-wrap">
              <table className="data-table report-data-table">
                <thead><tr><th>Section</th><th>Grade</th><th>Subject</th><th>Required Periods</th><th>Assigned</th><th>Remaining</th><th>Status</th></tr></thead>
                <tbody>
                  {!unassigned.length ? <tr><td colSpan={7} className="table-empty-cell">All subject offerings are completely assigned.</td></tr> : visibleReportRows.map((row) => (
                    <tr key={`${row.section_id}-${row.offering_id}`}>
                      <td>{row.section}</td><td>{row.grade_level}</td><td>{row.subject}</td><td>{row.required_periods}</td>
                      <td>{row.assigned_periods}</td><td>{row.remaining_periods}</td><td><span className="badge badge-amber">{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={safeReportPage} pageCount={reportPageCount} total={unassigned.length} onChange={setReportPage} />
            </div>
          )}

          {activeReport === 'workload' && (
            <div className="table-wrap">
              <table className="data-table report-data-table">
                <thead><tr><th>Teacher</th><th>Employment</th><th>Assigned Hours</th><th>Maximum</th><th>Remaining</th><th>Utilization</th><th>Status</th></tr></thead>
                <tbody>
                  {!workload.length ? <tr><td colSpan={7} className="table-empty-cell">No teacher workload data found.</td></tr> : visibleReportRows.map((row) => (
                    <tr key={row.teacher_id}>
                      <td>{row.teacher}</td><td>{row.employment_status}</td><td>{row.assigned_hours}</td><td>{row.maximum_hours ?? '—'}</td>
                      <td>{row.remaining_hours ?? '—'}</td><td>{row.utilization_percent == null ? '—' : `${row.utilization_percent}%`}</td>
                      <td><span className={`badge ${row.status === 'Over capacity' ? 'badge-red' : row.status === 'Unallocated' ? 'badge-slate' : 'badge-green'}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={safeReportPage} pageCount={reportPageCount} total={workload.length} onChange={setReportPage} />
            </div>
          )}
        </div>
      )}

      <div className="card card-body report-history-section">
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
            <thead><tr><th>Date Generated</th><th>School Year</th><th>Scope</th><th>Generated By</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="table-empty-cell">Loading…</td></tr> : logs.length === 0 ? (
                <tr><td colSpan={5} className="table-empty-cell">No records found. Generate a teaching load to see history here.</td></tr>
              ) : logs.map((log) => (
                <Fragment key={log.log_id}>
                  <tr onClick={() => setExpandedId((current) => current === log.log_id ? null : log.log_id)} style={{ cursor: 'pointer' }}>
                    <td>{new Date(log.generated_at).toLocaleString()}</td><td>{log.school_year_label || '—'}</td>
                    <td>{scopeLabel(log)}</td><td>{log.generated_by_username || '—'}</td>
                    <td>{log.assigned_count} assigned{log.skipped_count > 0 ? `, ${log.skipped_count} unresolved` : ''}{log.duration_seconds ? ` · ${log.duration_seconds.toFixed(2)}s` : ''}</td>
                  </tr>
                  {expandedId === log.log_id && (
                    <tr><td colSpan={5}><div className="paper-sheet-inline" style={{ padding: '8px 12px' }}>
                      <table className="paper-table"><thead><tr><th>Teacher</th><th>Section</th><th>Subject</th><th>Day</th><th>Time</th><th>Room</th></tr></thead><tbody>
                        {(log.details?.assigned || []).flatMap((assignment) => (assignment.schedule || []).map((slot, index) => (
                          <tr key={`${assignment.teacher}-${assignment.section}-${assignment.subject}-${index}`}><td>{assignment.teacher}</td><td>{assignment.section}</td><td>{assignment.subject}</td><td>{slot.day}</td><td>{formatTime(slot.time_start)}–{formatTime(slot.time_end)}</td><td>{slot.room}</td></tr>
                        )))}
                        {!(log.details?.assigned || []).some((assignment) => (assignment.schedule || []).length) && <tr><td colSpan={6} className="paper-empty">Nothing was assigned in this run.</td></tr>}
                      </tbody></table>
                      {(log.details?.skipped || []).length > 0 && <div className="paper-unresolved"><h2>Unresolved</h2><ul>{log.details.skipped.map((item, index) => <li key={index}>{item.section} — {item.subject}: {item.reason}</li>)}</ul></div>}
                    </div></td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
