import '../styles/AddSubjectModal.css'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { IconX } from '../components/Icons'
import api from '../api'

const ACTIVE_DATE = '9999-12-31'

// Expected header row (case-insensitive, order doesn't matter):
// Last Name | First Name | Middle Name | Gender | Birthdate |
// Employment Status | Max Load Hours | Specializations
//
// Specializations is a comma-separated list, matched by name against
// real Subject rows - same names you'd pick in TeacherFormModal.

const ImportTeachersModal = ({ subjects = [], employmentStatuses = [], onClose, onSaved }) => {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)   // { created, failed: [{row, reason}] }
  const [error, setError] = useState('')

  const resolveStatusId = (name) => employmentStatuses.find(
    (s) => s.status_name?.toLowerCase() === String(name).trim().toLowerCase()
  )?.status_id

  const resolveSubjectId = (name) => subjects.find(
    (s) => s.subject_name?.toLowerCase() === String(name).trim().toLowerCase()
  )?.subject_id

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        setRows(parsed)
      } catch (err) {
        setError('Could not read that file. Make sure it is a valid .xlsx/.xls/.csv.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setImporting(true)
    setError('')

    const resolvedSchoolId = localStorage.getItem('school_id')
    const created = []
    const failed = []

    for (const [i, row] of rows.entries()) {
      const rowLabel = `Row ${i + 2}`   // +2: header row + 1-indexed
      try {
        const lastName = String(row['Last Name'] || '').trim()
        const firstName = String(row['First Name'] || '').trim()
        if (!lastName || !firstName) {
          throw new Error('Missing Last Name or First Name.')
        }

        const statusId = resolveStatusId(row['Employment Status'])
        if (!statusId) {
          throw new Error(`Employment Status "${row['Employment Status']}" not recognized.`)
        }

        const birthdate = row['Birthdate']
          ? (row['Birthdate'] instanceof Date
              ? row['Birthdate'].toISOString().slice(0, 10)
              : String(row['Birthdate']))
          : null

        const teacherPayload = {
          last_name: lastName,
          first_name: firstName,
          middle_name: String(row['Middle Name'] || '').trim() || null,
          gender: String(row['Gender'] || '').trim().toUpperCase().startsWith('F') ? 'F'
                 : String(row['Gender'] || '').trim().toUpperCase().startsWith('M') ? 'M' : null,
          birthdate,
          employment_status: Number(statusId),
          school: Number(resolvedSchoolId),
        }

        const teacherRes = await api.post('/api/teachers/', teacherPayload)
        const teacherId = teacherRes.data.teacher_id

        const maxLoad = Number(row['Max Load Hours']) || 6
        await api.post('/api/teacher-load-limits/', {
          teacher: teacherId,
          max_load_hours: maxLoad,
          date_started: new Date().toISOString().slice(0, 10),
          date_ended: ACTIVE_DATE,
        })

        const specNames = String(row['Specializations'] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)

        for (const name of specNames) {
          const subjectId = resolveSubjectId(name)
          if (!subjectId) {
            throw new Error(`Specialization "${name}" is not a recognized subject (teacher was still created).`)
          }
          await api.post('/api/teacher-specializations/', {
            teacher: teacherId,
            subject: subjectId,
            date_started: new Date().toISOString().slice(0, 10),
            date_ended: ACTIVE_DATE,
          })
        }

        created.push(`${firstName} ${lastName}`)
      } catch (rowError) {
        const msg = rowError?.response?.data
          ? JSON.stringify(rowError.response.data)
          : rowError.message
        failed.push({ row: rowLabel, reason: msg })
      }
    }

    setResults({ created, failed })
    setImporting(false)
    if (created.length > 0) onSaved?.()
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => { e.stopPropagation() }}>

        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Import Teachers</h2>
            <p>Bulk-add teachers from an Excel or CSV file</p>
          </div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {!results && (
            <>
              <div className="field">
                <label className="field-label">File</label>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
                <span className="field-hint">
                  Columns: Last Name, First Name, Middle Name, Gender, Birthdate,
                  Employment Status, Max Load Hours, Specializations (comma-separated).
                </span>
              </div>

              {rows.length > 0 && (
                <div className="sy-modal-preview">
                  {fileName}: {rows.length} row{rows.length === 1 ? '' : 's'} detected
                </div>
              )}
            </>
          )}

          {results && (
            <div>
              <div className="sy-modal-preview">
                {results.created.length} created, {results.failed.length} failed
              </div>
              {results.failed.length > 0 && (
                <ul style={{ marginTop: '0.75rem' }}>
                  {results.failed.map((f, i) => (
                    <li key={i} className="form-error">{f.row}: {f.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-full" onClick={onClose} disabled={importing}>
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && (
            <button className="btn btn-primary btn-full" onClick={handleImport} disabled={importing || rows.length === 0}>
              {importing ? 'Importing…' : `Import ${rows.length || ''} Teacher${rows.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default ImportTeachersModal