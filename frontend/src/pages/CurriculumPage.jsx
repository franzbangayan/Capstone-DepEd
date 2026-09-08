import '../styles/CurriculumPage.css'
import { useState, useEffect, useCallback } from 'react'
import { IconPlus, IconEdit, IconTrash, IconSearch, IconChevronDown } from '../components/Icons'
import AddSubjectModal from '../components/AddSubjectModal'
import AddSectionModal from '../components/AddSectionModal'
import AddSchoolYearModal from '../components/AddSchoolYearModal'
import api from '../api'
  


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

  
  
  
  /* ── Tab: Subjects ── */
  
/* ── Tab: Subjects ── */

const subjectTypeBadge = (type) => {
  if (type === 'Core')        return <span className="badge badge-blue">Core</span>
  if (type === 'Applied')     return <span className="badge badge-amber">Applied</span>
  return <span className="badge badge-purple">Specialized</span>
}

const SubjectsTab = () => {
  const [subjects,       setSubjects]       = useState([])
  const [search,         setSearch]         = useState('')
  const [showModal,      setShowModal]      = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')

  const loadSubjects = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/api/subjects/')
      const data = Array.isArray(response.data) ? response.data : response.data.results || []
      setSubjects(data)
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || 'Unable to load subjects from the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  const filtered = subjects.filter((s) => {
    return s.subject_name.toLowerCase().includes(search.toLowerCase())
  })

  const openAdd = () => {
    setEditingSubject(null)
    setShowModal(true)
  }

  const openEdit = (subject) => {
    setEditingSubject(subject)
    setShowModal(true)
  }

  const deleteSubject = async (subject) => {
    if (!window.confirm(`Delete ${subject.subject_name}?`)) return

    try {
      await api.delete(`/api/subjects/${subject.subject_id}/`)
      await loadSubjects()
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || 'Unable to delete subject.')
    }
  }

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
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <IconPlus /> Add Subject
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showModal && (
        <AddSubjectModal
          subject={editingSubject}
          onClose={() => {
            setShowModal(false)
            setEditingSubject(null)
          }}
          onSaved={loadSubjects}
        />
      )}

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
            {loading ? (
              <tr>
                <td colSpan={3} className="table-empty-cell">Loading subjects…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="table-empty-cell">No subjects match your search.</td>
              </tr>
            ) : (
              filtered.map((s) => {
                return (
                  <tr key={s.subject_id}>
                    <td className="td-name">{s.subject_name}</td>
                    <td>{subjectTypeBadge(s.subject_type)}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(s)}><IconEdit /></button>
                        <button className="btn-icon del" onClick={() => deleteSubject(s)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
  
  /* ── Tab: Sections ── */

  const SectionsTab = () => {
    const [showModal, setShowModal] = useState(false)

    return (
      <div>
        <div className="tab-header">
          <div className="tab-header-text">
            <h3>Sections</h3>
            <p>Registered class sections with adviser assignments</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(true) }}>
            <IconPlus /> Add Section
          </button>
        </div>

        {showModal && (
          <AddSectionModal
            onClose={() => { setShowModal(false) }}
            onSave={() => { setShowModal(false) }}
          />
        )}
  
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

  /* ── Tab: School Year ── */

const SchoolYearTab = () => {
  const [schoolYears,     setSchoolYears]     = useState([])
  const [showModal,       setShowModal]       = useState(false)
  const [editingYear,     setEditingYear]     = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')

  const loadSchoolYears = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/api/school-years/')
      const data = Array.isArray(response.data) ? response.data : response.data.results || []
      // Most recent year first
      data.sort((a, b) => b.year_start - a.year_start)
      setSchoolYears(data)
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || 'Unable to load school years from the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSchoolYears()
  }, [loadSchoolYears])

  const openAdd = () => {
    setEditingYear(null)
    setShowModal(true)
  }

  const openEdit = (sy) => {
    setEditingYear(sy)
    setShowModal(true)
  }

  const deleteSchoolYear = async (sy) => {
    if (!window.confirm(`Delete S.Y. ${sy.year_start}–${sy.year_end}?`)) return

    try {
      await api.delete(`/api/school-years/${sy.school_year_id}/`)
      await loadSchoolYears()
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || 'Unable to delete school year.')
    }
  }

  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>School Year Configuration</h3>
          <p>Manage academic year records. Only one school year can be active at a time.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <IconPlus /> Add School Year
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showModal && (
        <AddSchoolYearModal
          schoolYear={editingYear}
          onClose={() => {
            setShowModal(false)
            setEditingYear(null)
          }}
          onSaved={loadSchoolYears}
        />
      )}

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
            {loading ? (
              <tr>
                <td colSpan={4} className="table-empty-cell">Loading school years…</td>
              </tr>
            ) : schoolYears.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-empty-cell">No school years yet.</td>
              </tr>
            ) : (
              schoolYears.map((sy) => {
                return (
                  <tr key={sy.school_year_id}>
                    <td className="td-name">{sy.year_start}</td>
                    <td>{sy.year_end}</td>
                    <td>
                      {sy.is_active ? (
                        <span className="badge-active badge">
                          <span className="badge-active-dot" /> Active
                        </span>
                      ) : (
                        <span className="badge-archived badge">
                          <span className="badge-archived-dot" /> Archived
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(sy)}><IconEdit /></button>
                        <button className="btn-icon del" onClick={() => deleteSchoolYear(sy)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
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
