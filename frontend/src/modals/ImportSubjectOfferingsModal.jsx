import '../styles/ImportSectionsModal.css'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { IconX } from '../components/Icons'
import api from '../api'

/*
 * Expected columns (header row, case-insensitive):
 *   Subject         (required - must match an existing subject name)
 *   Grade Level     (required - must match an existing grade, e.g. "Grade 7")
 *   Strand          (optional - required only when Grade Level is SHS, e.g. "STEM")
 *   Hours per Week  (required - whole number > 0)
 */

const normalize = (value) => String(value ?? '').trim()

const getErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' | ')
  }

  return error?.message || 'Unable to import this row.'
}

const ImportSubjectOfferingsModal = ({ subjects = [], gradeLevels = [], strands = [], onClose, onSaved }) => {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const subjectIdByName = Object.fromEntries(
    subjects.map((s) => [s.subject_name.toLowerCase(), s.subject_id])
  )
  const gradeByName = Object.fromEntries(
    gradeLevels.map((g) => [g.grade_name.toLowerCase(), g])
  )
  const strandIdByName = Object.fromEntries(
    strands.map((s) => [s.strand_name.toLowerCase(), s.strand_id])
  )

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setResults(null)
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      setRows(parsed)
    } catch (parseError) {
      setError('Unable to read that file. Make sure it\'s a valid .xlsx, .xls, or .csv file.')
      setRows([])
    }
  }

  const resolveRow = (row) => {
    const subjectLabel = normalize(row['Subject'] || row['subject'])
    const gradeLabel = normalize(row['Grade Level'] || row['grade_level'])
    const strandLabel = normalize(row['Strand'] || row['strand'])
    const hoursLabel = normalize(row['Hours per Week'] || row['hours_per_week'])

    if (!subjectLabel) throw new Error('Subject is required.')
    if (!gradeLabel) throw new Error('Grade Level is required.')

    const subjectId = subjectIdByName[subjectLabel.toLowerCase()]
    if (!subjectId) throw new Error(`Subject "${subjectLabel}" doesn't match any existing subject.`)

    const grade = gradeByName[gradeLabel.toLowerCase()]
    if (!grade) throw new Error(`Grade Level "${gradeLabel}" doesn't match any existing grade level.`)

    const isSHS = grade.education_level === 'Senior High School'

    let strandId = null
    if (isSHS) {
      if (!strandLabel) throw new Error(`"${gradeLabel}" is Senior High School, so Strand is required.`)
      strandId = strandIdByName[strandLabel.toLowerCase()]
      if (!strandId) throw new Error(`Strand "${strandLabel}" doesn't match any existing strand.`)
    }

    const hours = Number(hoursLabel)
    if (!hoursLabel || Number.isNaN(hours) || hours <= 0) {
      throw new Error('Hours per Week must be a number greater than 0.')
    }

    return {
      subject: subjectId,
      grade_level: grade.grade_level_id,
      strand: strandId,
      hours_per_week: hours,
    }
  }

  const handleImport = async () => {
    if (rows.length === 0) return

    setImporting(true)
    setError('')

    const created = []
    const failed = []

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const subjectLabel = normalize(row['Subject'] || row['subject'])
      const gradeLabel = normalize(row['Grade Level'] || row['grade_level'])
      const label = `${subjectLabel || '—'} / ${gradeLabel || '—'}` || `Row ${i + 2}`

      try {
        const payload = resolveRow(row)
        await api.post('/api/subject-offerings/', payload)
        created.push(label)
      } catch (rowError) {
        failed.push({ label, reason: rowError?.response ? getErrorMessage(rowError) : rowError.message })
      }
    }

    setResults({ created, failed })
    setImporting(false)

    if (created.length > 0) {
      onSaved?.()
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-text">
            <h2>Import Subject Offerings</h2>
            <p>Bulk-add subject offerings from an Excel or CSV file — for testing</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="import-hint">
            Columns expected: <strong>Subject</strong> (must match an existing subject name),
            <strong> Grade Level</strong> (e.g. "Grade 7"), <strong>Strand</strong> (required only for
            Senior High School rows), <strong>Hours per Week</strong>.
          </div>

          <div className="field">
            <label className="field-label">File</label>
            <input className="input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </div>

          {fileName && rows.length > 0 && !results && (
            <div className="import-preview">
              {fileName}: {rows.length} row{rows.length === 1 ? '' : 's'} found. Click Import to add them.
            </div>
          )}

          {results && (
            <div className="import-results">
              <div className="import-results-summary">
                {results.created.length} added, {results.failed.length} failed.
              </div>
              {results.failed.length > 0 && (
                <ul className="import-results-errors">
                  {results.failed.map((f, i) => (
                    <li key={i}>{f.label}: {f.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline btn-full" onClick={onClose} disabled={importing}>
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && (
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleImport}
              disabled={importing || rows.length === 0}
            >
              {importing ? 'Importing…' : `Import ${rows.length || ''} Offering${rows.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportSubjectOfferingsModal