import '../styles/ImportSectionsModal.css'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { IconX } from '../components/Icons'
import api from '../api'

/*
 * Expected columns (header row, case-insensitive):
 *   Section Name   (required)
 *   Grade Level    (required - must match an existing grade, e.g. "Grade 7")
 *   Strand         (optional - SHS only, e.g. "STEM")
 *   Adviser        (optional - "Last Name, First Name" or "Last Name")
 *   School Year    (optional - year_start, e.g. 2025; falls back to the
 *                   currently active school year if left blank)
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

const ImportSectionsModal = ({ gradeLevels = [], strands = [], teachers = [], schoolYears = [], onClose, onSaved }) => {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const gradeIdByName = Object.fromEntries(
    gradeLevels.map((g) => [g.grade_name.toLowerCase(), g.grade_level_id])
  )
  const strandIdByName = Object.fromEntries(
    strands.map((s) => [s.strand_name.toLowerCase(), s.strand_id])
  )
  const teacherIdByName = Object.fromEntries(
    teachers.map((t) => [`${t.last_name}, ${t.first_name}`.toLowerCase(), t.teacher_id])
  )
  const teacherIdByLastName = Object.fromEntries(
    teachers.map((t) => [t.last_name.toLowerCase(), t.teacher_id])
  )
  const activeSchoolYear = schoolYears.find((sy) => sy.is_active)
  const schoolYearIdByStart = Object.fromEntries(
    schoolYears.map((sy) => [String(sy.year_start), sy.school_year_id])
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
    const sectionName = normalize(row['Section Name'] || row['section_name'])
    const gradeLabel = normalize(row['Grade Level'] || row['grade_level'])
    const strandLabel = normalize(row['Strand'] || row['strand'])
    const adviserLabel = normalize(row['Adviser'] || row['adviser'])
    const yearLabel = normalize(row['School Year'] || row['school_year'])

    if (!sectionName) throw new Error('Section Name is required.')
    if (!gradeLabel) throw new Error('Grade Level is required.')

    const gradeLevelId = gradeIdByName[gradeLabel.toLowerCase()]
    if (!gradeLevelId) throw new Error(`Grade Level "${gradeLabel}" doesn't match any existing grade level.`)

    let strandId = null
    if (strandLabel) {
      strandId = strandIdByName[strandLabel.toLowerCase()]
      if (!strandId) throw new Error(`Strand "${strandLabel}" doesn't match any existing strand.`)
    }

    let adviserTeacherId = null
    if (adviserLabel) {
      adviserTeacherId = teacherIdByName[adviserLabel.toLowerCase()] || teacherIdByLastName[adviserLabel.toLowerCase()]
      if (!adviserTeacherId) throw new Error(`Adviser "${adviserLabel}" doesn't match any existing teacher.`)
    }

    let schoolYearId = null
    if (yearLabel) {
      schoolYearId = schoolYearIdByStart[yearLabel]
      if (!schoolYearId) throw new Error(`School Year "${yearLabel}" doesn't match any existing school year.`)
    } else if (activeSchoolYear) {
      schoolYearId = activeSchoolYear.school_year_id
    } else {
      throw new Error('No School Year given and no active school year is set.')
    }

    return {
      section_name: sectionName,
      grade_level: gradeLevelId,
      strand: strandId,
      adviser_teacher: adviserTeacherId,
      school_year: schoolYearId,
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
      const label = normalize(row['Section Name'] || row['section_name']) || `Row ${i + 2}`

      try {
        const payload = resolveRow(row)
        await api.post('/api/sections/', payload)
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
            <h2>Import Sections</h2>
            <p>Bulk-add sections from an Excel or CSV file — for testing</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="import-hint">
            Columns expected: <strong>Section Name</strong>, <strong>Grade Level</strong> (e.g. "Grade 7"),
            <strong> Strand</strong> (optional, SHS only), <strong>Adviser</strong> (optional, "Last Name, First Name"),
            <strong> School Year</strong> (optional, e.g. 2025 — defaults to the active school year).
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
              {importing ? 'Importing…' : `Import ${rows.length || ''} Section${rows.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportSectionsModal