import '../styles/ReviewScheduleModal.css'
import { IconX } from '../components/Icons'

// `results` is the exact response body from POST /api/generate-load/:
// { assigned_count, skipped_count, assigned: [...], skipped: [...] }
const ReviewScheduleModal = ({ results, onClose }) => {
  const assigned = results?.assigned || []
  const skipped = results?.skipped || []

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="review-modal-panel" onClick={(e) => { e.stopPropagation() }}>

        {/* Toolbar - hidden when printing */}
        <div className="review-toolbar no-print">
          <div>
            <h2>Generated Teaching Load</h2>
            <p>{assigned.length} periods scheduled · {skipped.length} unresolved</p>
          </div>
          <div className="review-toolbar-actions">
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>Print</button>
            <button className="modal-close" onClick={onClose}><IconX /></button>
          </div>
        </div>

        {/* Scrollable gray backdrop holding the paper sheet */}
        <div className="review-scroll-area">
          <div id="printable-schedule" className="paper-sheet">

            <div className="paper-letterhead">
              <h1>Teaching Load Schedule</h1>
              <p>Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <table className="paper-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th className="right">Hrs/Wk</th>
                  <th className="right">Periods</th>
                </tr>
              </thead>
              <tbody>
                {assigned.length === 0 ? (
                  <tr><td colSpan={5} className="paper-empty">Nothing was assigned.</td></tr>
                ) : (
                  assigned.map((a, i) => (
                    <tr key={i}>
                      <td>{a.teacher}</td>
                      <td>{a.section}</td>
                      <td>{a.subject}</td>
                      <td className="right">{a.hours_assigned}</td>
                      <td className="right">{a.periods_scheduled ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {skipped.length > 0 && (
              <div className="paper-unresolved">
                <h2>Unresolved</h2>
                <ul>
                  {skipped.map((s, i) => (
                    <li key={i}>{s.section} — {s.subject}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="paper-footer">
              Prepared for manual review. This schedule has not been committed until reviewed and approved.
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default ReviewScheduleModal