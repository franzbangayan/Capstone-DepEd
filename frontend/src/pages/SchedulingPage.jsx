import '../styles/SchedulingPage.css'
import { useState } from 'react'
import { IconZap, IconChevronDown, IconCheck, IconAlert, IconLayers } from '../components/Icons'

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

const SchedulingPage = ({ onNavigate }) => {
  const [schoolYear, setSchoolYear] = useState('2024–2025')
  const [eduLevel,   setEduLevel]   = useState('Junior High School')
  const [gradeLevel, setGradeLevel] = useState('Grade 7')
  const [strand,     setStrand]     = useState('N/A')

  const isAll = eduLevel === 'All'
  const isSHS = eduLevel === 'Senior High School'

  const handleEduLevelChange = (level) => {
    setEduLevel(level)
    setGradeLevel(GRADE_LEVELS_BY_LEVEL[level][0])
    setStrand('N/A')
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
                    value={schoolYear}
                    onChange={(e) => { setSchoolYear(e.target.value) }}
                  >
                    <option>2024–2025</option>
                    <option>2023–2024</option>
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

          <button className="proceed-btn" onClick={() => { onNavigate && onNavigate('review-schedule') }}>
            <IconZap /> Generate Teaching Load
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
                {' · S.Y. ' + schoolYear}
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
    </div>
  )
}

export default SchedulingPage
