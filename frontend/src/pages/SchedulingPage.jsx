import '../styles/SchedulingPage.css'
import { useState, useEffect } from 'react'
import api from '../api'
import { IconZap, IconChevronDown, IconCheck, IconAlert, IconLayers } from '../components/Icons'
import ReviewScheduleModal from '../modals/ReviewScheduleModal'

const GRADE_LEVELS_BY_LEVEL = {
  All:                  ['All Levels'],
  Elementary:           ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'Junior High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
}

const DEPED_CONSTRAINTS = [
  'Max 6 teaching hours per teacher per day (Permanent/Provisional)',
  'Part-time teachers limited to 3 hours per day',
  'No teacher assigned to overlapping sections simultaneously',
  'Teacher specialization must match subject area',
  'Each section must have a complete subject load',
  'Advisory classes do not count toward teaching load hours',
  'SHS Specialized subjects must be taught by qualified strand teachers',
]

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const SchedulingPage = () => {
  const [schoolYears,   setSchoolYears]   = useState([])   // real rows from /api/school-years/
  const [schoolYearId,  setSchoolYearId]  = useState('')   // actual school_year_id, not a parsed string
  const [loadingYears,  setLoadingYears]  = useState(true)

  const [eduLevel,   setEduLevel]   = useState('Junior High School')
  const [gradeLevel, setGradeLevel] = useState('Grade 7')
  const [strand,     setStrand]     = useState('N/A')

  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState(null)
  const [results, setResults]       = useState(null)   // response body -> opens the modal when set

  const isAll = eduLevel === 'All'
  const isSHS = eduLevel === 'Senior High School'

  useEffect(() => {
    const loadSchoolYears = async () => {
      setLoadingYears(true)
      try {
        const res = await api.get('/api/school-years/')
        const years = listData(res)
        setSchoolYears(years)
        // Default to the active school year if one exists, else the first row.
        const active = years.find((y) => y.is_active)
        setSchoolYearId(String((active || years[0])?.school_year_id || ''))
      } catch (err) {
        console.error(err)
        setError('Unable to load school years.')
      } finally {
        setLoadingYears(false)
      }
    }
    loadSchoolYears()
  }, [])

  const handleEduLevelChange = (level) => {
    setEduLevel(level)
    setGradeLevel(GRADE_LEVELS_BY_LEVEL[level][0])
    setStrand('N/A')
  }

  const selectedSchoolYear = schoolYears.find(
    (y) => String(y.school_year_id) === String(schoolYearId)
  )

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      if (!selectedSchoolYear) {
        setError('Select a school year first.')
        setGenerating(false)
        return
      }

      const res = await api.post('/api/generate-load/', {
        algorithm: 'backtracking',
        school_year: selectedSchoolYear.year_start,
        education_level: eduLevel,
        grade_level: gradeLevel,
        strand: strand,
      })
      setResults(res.data)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to generate teaching load. Check the server logs.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="screen">
      <div className="sched-layout">

        {/* Left: Parameters */}
        <div className="stack">

          <div className="card card-body">
            <div className="section-title">Scheduling Parameters</div>
            <div className="section-sub sched-sub">Configure scope before generating teaching loads.</div>

            <div className="stack">

              <div className="field">
                <label className="field-label">School Year</label>
                <div className="select-wrap">
                  <select
                    value={schoolYearId}
                    onChange={(e) => { setSchoolYearId(e.target.value) }}
                    disabled={loadingYears}
                  >
                    {loadingYears && <option>Loading…</option>}
                    {!loadingYears && schoolYears.length === 0 && (
                      <option value="">No school years found</option>
                    )}
                    {schoolYears.map((sy) => (
                      <option key={sy.school_year_id} value={sy.school_year_id}>
                        {sy.year_start}–{sy.year_end}{sy.is_active ? ' (Active)' : ''}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Education Level</label>
                <div className="edu-toggle">
                  <button
                    className={eduLevel === 'All' ? 'edu-btn active' : 'edu-btn'}
                    onClick={() => { handleEduLevelChange('All') }}
                  >
                    All
                  </button>
                  <button
                    className={eduLevel === 'Elementary' ? 'edu-btn active' : 'edu-btn'}
                    onClick={() => { handleEduLevelChange('Elementary') }}
                  >
                    Elem.
                  </button>
                  <button
                    className={eduLevel === 'Junior High School' ? 'edu-btn active' : 'edu-btn'}
                    onClick={() => { handleEduLevelChange('Junior High School') }}
                  >
                    JHS
                  </button>
                  <button
                    className={eduLevel === 'Senior High School' ? 'edu-btn active' : 'edu-btn'}
                    onClick={() => { handleEduLevelChange('Senior High School') }}
                  >
                    SHS
                  </button>
                </div>
              </div>

              {isAll === false && (
                <div className="field">
                  <label className="field-label">Grade Level</label>
                  <div className="select-wrap">
                    <select
                      value={gradeLevel}
                      onChange={(e) => { setGradeLevel(e.target.value) }}
                    >
                      {GRADE_LEVELS_BY_LEVEL[eduLevel].map((g) => {
                        return <option key={g}>{g}</option>
                      })}
                    </select>
                    <IconChevronDown />
                  </div>
                </div>
              )}

              {isSHS && (
                <div className="field">
                  <label className="field-label">Track / Strand</label>
                  <div className="select-wrap">
                    <select
                      value={strand}
                      onChange={(e) => { setStrand(e.target.value) }}
                    >
                      <option>N/A</option>
                      <option>STEM</option>
                      <option>ABM</option>
                      <option>HUMSS</option>
                      <option>GAS</option>
                      <option>TVL</option>
                      <option>Sports</option>
                      <option>Arts and Design</option>
                    </select>
                    <IconChevronDown />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Constraints */}
          <div className="card card-body">
            <div className="section-title">DepEd Constraint Rules</div>
            <div className="constraints-list">
              {DEPED_CONSTRAINTS.map((label, i) => {
                const isLastRule = i === DEPED_CONSTRAINTS.length - 1
                const isMet = isLastRule ? (isAll || !isSHS || strand !== 'N/A') : true
                return (
                  <div key={i} className="constraint-row">
                    <div className={isMet ? 'constraint-icon ok' : 'constraint-icon warn'}>
                      {isMet ? <IconCheck /> : <IconAlert />}
                    </div>
                    <span className={isMet ? 'constraint-text ok' : 'constraint-text warn'}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {error && <div className="constraint-text warn">{error}</div>}

          <button className="proceed-btn" onClick={handleGenerate} disabled={generating}>
            <IconZap /> {generating ? 'Generating...' : 'Generate Teaching Load'}
          </button>

        </div>

        {/* Right: Preview */}
        <div className="card card-body">
          <div className="row-between sched-preview-header">
            <div>
              <div className="section-title">Subject Offerings Preview</div>
              <div className="section-sub">
                {isAll
                  ? 'All Levels — Elementary, JHS, SHS'
                  : eduLevel + ' · ' + gradeLevel + (isSHS && strand !== 'N/A' ? ' · ' + strand : '')
                }
                {selectedSchoolYear ? ` · S.Y. ${selectedSchoolYear.year_start}–${selectedSchoolYear.year_end}` : ''}
              </div>
            </div>
            <div className="readonly-badge">
              <IconLayers /> Read-only
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th className="right">Hrs/Wk</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="table-empty-cell">
                    No subject offerings configured. Set up subjects in Curriculum Setup first.
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="preview-total-label">Total Weekly Hours</td>
                  <td className="td-right preview-total-value">0h</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="info-box">
            <IconAlert />
            <div>
              <div className="info-box-title">Before Generating</div>
              <div className="info-box-text">
                Ensure all teachers have complete specialization records and that sections are properly
                configured in Curriculum Setup. The system will flag unresolvable conflicts for manual review.
              </div>
            </div>
          </div>

        </div>
      </div>

      {results && (
        <ReviewScheduleModal results={results} onClose={() => { setResults(null) }} />
      )}
    </div>
  )
}

export default SchedulingPage