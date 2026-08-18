import '../styles/CurriculumPage.css'
import { useState } from 'react'
import { IconPlus, IconEdit, IconTrash, IconSearch, IconChevronDown } from '../components/Icons'

/* ── Static K-12 curriculum structure (DepEd standard, not user data) ── */

const GRADE_LEVELS = [
  { label: 'Kindergarten', group: 'Elementary' },
  { label: 'Grade 1',      group: 'Elementary' },
  { label: 'Grade 2',      group: 'Elementary' },
  { label: 'Grade 3',      group: 'Elementary' },
  { label: 'Grade 4',      group: 'Elementary' },
  { label: 'Grade 5',      group: 'Elementary' },
  { label: 'Grade 6',      group: 'Elementary' },
  { label: 'Grade 7',      group: 'Junior High School' },
  { label: 'Grade 8',      group: 'Junior High School' },
  { label: 'Grade 9',      group: 'Junior High School' },
  { label: 'Grade 10',     group: 'Junior High School' },
  { label: 'Grade 11',     group: 'Senior High School' },
  { label: 'Grade 12',     group: 'Senior High School' },
]

const SHS_TRACKS = [
  {
    name: 'Academic Track',
    cls: 'academic',
    icon: '📐',
    strands: [
      { name: 'STEM',  desc: 'Science, Technology, Engineering, and Mathematics' },
      { name: 'ABM',   desc: 'Accountancy, Business, and Management' },
      { name: 'HUMSS', desc: 'Humanities and Social Sciences' },
      { name: 'GAS',   desc: 'General Academic Strand' },
    ],
  },
  {
    name: 'TVL Track',
    cls: 'tvl',
    icon: '🔧',
    strands: [
      { name: 'Agri-Fishery Arts', desc: 'Agriculture and fishery-related specializations' },
      { name: 'Home Economics',    desc: 'Household services and food technology' },
      { name: 'ICT',               desc: 'Information and Communications Technology' },
      { name: 'Industrial Arts',   desc: 'Electrical, automotive, and construction' },
    ],
  },
  {
    name: 'Sports Track',
    cls: 'sports',
    icon: '⚽',
    strands: [
      { name: 'Sports', desc: 'Athletics, team sports, individual sports' },
    ],
  },
  {
    name: 'Arts and Design Track',
    cls: 'arts',
    icon: '🎨',
    strands: [
      { name: 'Arts and Design', desc: 'Visual arts, industrial design, media arts' },
    ],
  },
]

const CURRICULUM_TABS = [
  { id: 'grade-levels',       label: 'Grade Levels' },
  { id: 'tracks',             label: 'Tracks & Strands' },
  { id: 'subjects',           label: 'Subjects' },
  { id: 'subject-offerings',  label: 'Subject Offerings' },
  { id: 'sections',           label: 'Sections' },
  { id: 'school-year',        label: 'School Year' },
]

/* ── Tab: Grade Levels ── */

const GradeLevelsTab = () => {
  const groups = [
    { key: 'Elementary',        cls: 'elem', badge: 'elem' },
    { key: 'Junior High School',cls: 'jhs',  badge: 'jhs' },
    { key: 'Senior High School',cls: 'shs',  badge: 'shs' },
  ]

  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Grade Levels</h3>
          <p>Complete K-12 grade level structure as per DepEd — read only</p>
        </div>
      </div>

      <div className="grade-cols">
        {groups.map((g) => {
          const levels = GRADE_LEVELS.filter((gl) => { return gl.group === g.key })
          return (
            <div key={g.key} className={'grade-group ' + g.cls}>
              <div className={'grade-group-badge ' + g.badge}>{g.key}</div>
              <div className="grade-list">
                {levels.map((gl) => {
                  return (
                    <div key={gl.label} className="grade-item">
                      <span className="grade-item-label">{gl.label}</span>
                      <button><IconEdit /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Tab: Tracks & Strands ── */

const TracksTab = () => {
  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Senior High School Tracks &amp; Strands</h3>
          <p>Complete SHS track and strand structure as per DepEd K-12 curriculum</p>
        </div>
      </div>

      <div className="tracks-grid">
        {SHS_TRACKS.map((track) => {
          return (
            <div key={track.name} className={'track-card ' + track.cls}>
              <div className="track-title">
                <span>{track.icon}</span>
                {track.name}
              </div>
              <div className="strand-list">
                {track.strands.map((s) => {
                  return (
                    <div key={s.name} className="strand-item">
                      <div className="strand-dot" />
                      <div>
                        <div className="strand-name">{s.name}</div>
                        <div className="strand-desc">{s.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SUBJECT_REGISTRY = [
  { name: 'Filipino',             type: 'Core' },
  { name: 'English',              type: 'Core' },
  { name: 'Mathematics',          type: 'Core' },
  { name: 'Science',              type: 'Core' },
  { name: 'Araling Panlipunan',   type: 'Core' },
  { name: 'MAPEH',                type: 'Applied' },
  { name: 'TLE',                  type: 'Applied' },
  { name: 'General Biology 1',    type: 'Specialized' },
  { name: 'Business Mathematics', type: 'Specialized' },
  { name: 'Creative Writing',     type: 'Specialized' },
]

const subjectTypeBadge = (type) => {
  if (type === 'Core')        return <span className="badge badge-blue">Core</span>
  if (type === 'Applied')     return <span className="badge badge-amber">Applied</span>
  return <span className="badge badge-purple">Specialized</span>
}

/* ── Tab: Subjects ── */

const SubjectsTab = () => {
  const [search, setSearch] = useState('')

  const filtered = SUBJECT_REGISTRY.filter((s) => {
    return s.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Subject Registry</h3>
          <p>Core, Applied, and Specialized subjects — each subject appears once</p>
        </div>
        <div className="row">
          <div className="search-wrap">
            <IconSearch />
            <input
              className="input"
              type="text"
              placeholder="Search subjects…"
              value={search}
              onChange={(e) => { setSearch(e.target.value) }}
            />
          </div>
          <button className="btn btn-primary btn-sm">
            <IconPlus /> Add Subject
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Type</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="table-empty-cell">No subjects match your search.</td>
              </tr>
            )}
            {filtered.map((s, i) => {
              return (
                <tr key={i}>
                  <td className="td-name">{s.name}</td>
                  <td>{subjectTypeBadge(s.type)}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon edit"><IconEdit /></button>
                      <button className="btn-icon del"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Tab: Subject Offerings ── */

const SHS_GRADE_LEVELS = ['Grade 11', 'Grade 12']

const ALL_GRADE_LEVELS = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
]

const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Sports', 'Arts and Design']

const SAMPLE_OFFERINGS = [
  { subject: 'Filipino',             grade: 'Grade 7',  group: 'Junior High School', strand: '—', hours: 4 },
  { subject: 'Mathematics',          grade: 'Grade 7',  group: 'Junior High School', strand: '—', hours: 4 },
  { subject: 'General Biology 1',    grade: 'Grade 11', group: 'Senior High School', strand: 'STEM', hours: 5 },
  { subject: 'Business Mathematics', grade: 'Grade 11', group: 'Senior High School', strand: 'ABM',  hours: 5 },
  { subject: 'Creative Writing',     grade: 'Grade 12', group: 'Senior High School', strand: 'HUMSS', hours: 5 },
]

const offeringGradeBadge = (group) => {
  if (group === 'Elementary')         return 'badge badge-sky'
  if (group === 'Junior High School') return 'badge badge-indigo'
  return 'badge badge-violet'
}

const gradeGroup = (grade) => {
  if (['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'].includes(grade)) return 'Elementary'
  if (['Grade 7','Grade 8','Grade 9','Grade 10'].includes(grade)) return 'Junior High School'
  return 'Senior High School'
}

const SubjectOfferingsTab = () => {
  const [showForm,    setShowForm]    = useState(false)
  const [formSubject, setFormSubject] = useState(SUBJECT_REGISTRY[0].name)
  const [formGrade,   setFormGrade]   = useState('Grade 7')
  const [formStrand,  setFormStrand]  = useState('STEM')
  const [formHours,   setFormHours]   = useState(4)

  const isSHS = SHS_GRADE_LEVELS.includes(formGrade)

  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Subject Offerings</h3>
          <p>Link subjects to grade levels and strands, with required weekly hours</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm) }}>
          <IconPlus /> Add Offering
        </button>
      </div>

      {showForm && (
        <div className="offering-form card card-body">
          <div className="offering-form-title">New Subject Offering</div>
          <div className="offering-form-fields">
            <div className="field">
              <label className="field-label">Subject</label>
              <div className="select-wrap">
                <select value={formSubject} onChange={(e) => { setFormSubject(e.target.value) }}>
                  {SUBJECT_REGISTRY.map((s) => { return <option key={s.name}>{s.name}</option> })}
                </select>
                <IconChevronDown />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Grade Level</label>
              <div className="select-wrap">
                <select value={formGrade} onChange={(e) => { setFormGrade(e.target.value) }}>
                  {ALL_GRADE_LEVELS.map((g) => { return <option key={g}>{g}</option> })}
                </select>
                <IconChevronDown />
              </div>
            </div>

            {isSHS && (
              <div className="field">
                <label className="field-label">Strand</label>
                <div className="select-wrap">
                  <select value={formStrand} onChange={(e) => { setFormStrand(e.target.value) }}>
                    {SHS_STRANDS.map((s) => { return <option key={s}>{s}</option> })}
                  </select>
                  <IconChevronDown />
                </div>
              </div>
            )}

            <div className="field">
              <label className="field-label">Hours per Week</label>
              <input
                className="input"
                type="number"
                min={1}
                max={10}
                value={formHours}
                onChange={(e) => { setFormHours(Number(e.target.value)) }}
              />
            </div>
          </div>
          <div className="offering-form-footer">
            <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false) }}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(false) }}>
              Save Offering
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Grade Level</th>
              <th>Strand</th>
              <th>Hours / Week</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_OFFERINGS.map((o, i) => {
              return (
                <tr key={i}>
                  <td className="td-name">{o.subject}</td>
                  <td>
                    <span className={offeringGradeBadge(o.group)}>{o.grade}</span>
                  </td>
                  <td className="td-muted">{o.strand}</td>
                  <td className="td-mono">{o.hours}h</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon edit"><IconEdit /></button>
                      <button className="btn-icon del"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SAMPLE_SECTIONS = [
  { name: 'Sampaguita', grade: 'Grade 1',  group: 'Elementary',          strand: '—', adviser: '—', sy: '2024–2025' },
  { name: 'Rosal',      grade: 'Grade 2',  group: 'Elementary',          strand: '—', adviser: '—', sy: '2024–2025' },
  { name: 'Gumamela',   grade: 'Grade 6',  group: 'Elementary',          strand: '—', adviser: '—', sy: '2024–2025' },
  { name: 'Aguila',     grade: 'Grade 7',  group: 'Junior High School',  strand: '—', adviser: '—', sy: '2024–2025' },
  { name: 'Lawin',      grade: 'Grade 8',  group: 'Junior High School',  strand: '—', adviser: '—', sy: '2024–2025' },
  { name: 'Narra',      grade: 'Grade 11', group: 'Senior High School',  strand: 'STEM', adviser: '—', sy: '2024–2025' },
  { name: 'Molave',     grade: 'Grade 12', group: 'Senior High School',  strand: 'ABM',  adviser: '—', sy: '2024–2025' },
]

const sectionGradeBadge = (group) => {
  if (group === 'Elementary')          return 'badge badge-sky'
  if (group === 'Junior High School')  return 'badge badge-indigo'
  return 'badge badge-violet'
}

/* ── Tab: Sections ── */

const SectionsTab = () => {
  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Sections</h3>
          <p>Registered class sections with adviser assignments</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <IconPlus /> Add Section
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Section Name</th>
              <th>Grade Level</th>
              <th>Strand</th>
              <th>Adviser</th>
              <th>School Year</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_SECTIONS.map((s, i) => {
              return (
                <tr key={i}>
                  <td className="td-name">{s.name}</td>
                  <td>
                    <span className={sectionGradeBadge(s.group)}>{s.grade}</span>
                  </td>
                  <td className="td-muted">{s.strand}</td>
                  <td className="td-muted">{s.adviser}</td>
                  <td className="td-muted">{s.sy}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon edit"><IconEdit /></button>
                      <button className="btn-icon del"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SAMPLE_SCHOOL_YEARS = [
  { start: 2024, end: 2025, active: true },
  { start: 2023, end: 2024, active: false },
  { start: 2022, end: 2023, active: false },
]

/* ── Tab: School Year ── */

const SchoolYearTab = () => {
  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>School Year Configuration</h3>
          <p>Manage academic year records. Only one school year can be active at a time.</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <IconPlus /> Add School Year
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Year Start</th>
              <th>Year End</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_SCHOOL_YEARS.map((sy, i) => {
              return (
                <tr key={i}>
                  <td className="td-name">{sy.start}</td>
                  <td>{sy.end}</td>
                  <td>
                    {sy.active ? (
                      <span className="badge-active badge">
                        <span className="badge-active-dot" /> Active (most recent)
                      </span>
                    ) : (
                      <span className="badge-archived badge">
                        <span className="badge-archived-dot" /> Archived
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon edit"><IconEdit /></button>
                      <button className="btn-icon del"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Main Curriculum Page ── */

const CurriculumPage = () => {
  const [activeTab, setActiveTab] = useState('grade-levels')

  return (
    <div className="screen">
      <div className="card">
        <div className="tabs-bar">
          {CURRICULUM_TABS.map((tab) => {
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'tab-btn active' : 'tab-btn'}
                onClick={() => { setActiveTab(tab.id) }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="tab-body">
          {activeTab === 'grade-levels'      && <GradeLevelsTab />}
          {activeTab === 'tracks'            && <TracksTab />}
          {activeTab === 'subjects'          && <SubjectsTab />}
          {activeTab === 'subject-offerings' && <SubjectOfferingsTab />}
          {activeTab === 'sections'          && <SectionsTab />}
          {activeTab === 'school-year'       && <SchoolYearTab />}
        </div>
      </div>
    </div>
  )
}

export default CurriculumPage
