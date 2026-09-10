import '../styles/CurriculumPage.css'
import { useState, useEffect, useCallback } from 'react'
import { IconPlus, IconEdit, IconTrash, IconSearch, IconChevronDown } from '../components/Icons'
import AddSubjectModal from '../modals/AddSubjectModal'
import AddSectionModal from '../modals/AddSectionModal'
import AddSchoolYearModal from '../modals/AddSchoolYearModal'
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

/* ── Tab: Sections ── */

const sectionGradeBadge = (group) => {
  if (group === 'Elementary')          return 'badge badge-sky'
  if (group === 'Junior High School')  return 'badge badge-indigo'
  return 'badge badge-violet'
}

const gradeGroupFromName = (name) => {
  if (['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'].includes(name)) return 'Elementary'
  if (['Grade 7','Grade 8','Grade 9','Grade 10'].includes(name)) return 'Junior High School'
  return 'Senior High School'
}

const SectionsTab = () => {
  const [sections,     setSections]     = useState([])
  const [gradeLevels,  setGradeLevels]  = useState([])
  const [strands,      setStrands]      = useState([])
  const [schoolYears,  setSchoolYears]  = useState([])
  const [teachers,     setTeachers]     = useState([])
  const [showModal,    setShowModal]    = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  const listData = (response) => (
    Array.isArray(response.data) ? response.data : response.data.results || []
  )

  const loadSections = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [sectionRes, gradeRes, strandRes, syRes, teacherRes] = await Promise.all([
        api.get('/api/sections/'),
        api.get('/api/grade-levels/'),
        api.get('/api/strands/'),
        api.get('/api/school-years/'),
        api.get('/api/teachers/'),
      ])
      setSections(listData(sectionRes))
      setGradeLevels(listData(gradeRes))
      setStrands(listData(strandRes))
      setSchoolYears(listData(syRes))
      setTeachers(listData(teacherRes))
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || 'Unable to load sections from the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  const gradeNameById = Object.fromEntries(gradeLevels.map((g) => [g.grade_level_id, g.grade_name]))
  const strandNameById = Object.fromEntries(strands.map((s) => [s.strand_id, s.strand_name]))
  const schoolYearLabelById = Object.fromEntries(
    schoolYears.map((sy) => [sy.school_year_id, `${sy.year_start}–${sy.year_end}`])
  )
  const teacherNameById = Object.fromEntries(
    teachers.map((t) => [t.teacher_id, `${t.last_name}, ${t.first_name}`])
  )

  const openAdd = () => {
    setEditingSection(null)
    setShowModal(true)
  }

  const openEdit = (section) => {
    setEditingSection(section)
    setShowModal(true)
  }

  const deleteSection = async (section) => {
    if (!window.confirm(`Delete section ${section.section_name}?`)) return

    try {
      await api.delete(`/api/sections/${section.section_id}/`)
      await loadSections()
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || 'Unable to delete section.')
    }
  }

  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Sections</h3>
          <p>Registered class sections with adviser assignments</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <IconPlus /> Add Section
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showModal && (
        <AddSectionModal
          section={editingSection}
          onClose={() => {
            setShowModal(false)
            setEditingSection(null)
          }}
          onSaved={loadSections}
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
            {loading ? (
              <tr>
                <td colSpan={6} className="table-empty-cell">Loading sections…</td>
              </tr>
            ) : sections.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell">No sections yet.</td>
              </tr>
            ) : (
              sections.map((s) => {
                const gradeName = gradeNameById[s.grade_level] || '—'
                const group = gradeGroupFromName(gradeName)
                return (
                  <tr key={s.section_id}>
                    <td className="td-name">{s.section_name}</td>
                    <td>
                      <span className={sectionGradeBadge(group)}>{gradeName}</span>
                    </td>
                    <td className="td-muted">{strandNameById[s.strand] || '—'}</td>
                    <td className="td-muted">{teacherNameById[s.adviser_teacher] || '—'}</td>
                    <td className="td-muted">{schoolYearLabelById[s.school_year] || '—'}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(s)}><IconEdit /></button>
                        <button className="btn-icon del" onClick={() => deleteSection(s)}><IconTrash /></button>
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
/* ── Tab: Subject Offerings ── */

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const offeringGradeBadge = (educationLevel) => {
  if (educationLevel === 'Elementary')         return 'badge badge-sky'
  if (educationLevel === 'Junior High School') return 'badge badge-indigo'
  return 'badge badge-violet'
}

const getErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
      .join(' | ')
  }

  return error?.message || 'Unable to save subject offering.'
}

const SubjectOfferingsTab = () => {
  const [offerings,    setOfferings]    = useState([])
  const [subjects,     setSubjects]     = useState([])
  const [gradeLevels,  setGradeLevels]  = useState([])
  const [strands,      setStrands]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  const [showForm,     setShowForm]     = useState(false)
  const [editingId,    setEditingId]    = useState(null)
  const [formSubject,  setFormSubject]  = useState('')
  const [formGrade,    setFormGrade]    = useState('')
  const [formStrand,   setFormStrand]   = useState('')
  const [formHours,    setFormHours]    = useState(4)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [offeringRes, subjectRes, gradeRes, strandRes] = await Promise.all([
        api.get('/api/subject-offerings/'),
        api.get('/api/subjects/'),
        api.get('/api/grade-levels/'),
        api.get('/api/strands/'),
      ])
      setOfferings(listData(offeringRes))
      setSubjects(listData(subjectRes))
      setGradeLevels(listData(gradeRes))
      setStrands(listData(strandRes))
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || 'Unable to load subject offerings from the backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const subjectNameById = Object.fromEntries(subjects.map((s) => [s.subject_id, s.subject_name]))
  const gradeById = Object.fromEntries(gradeLevels.map((g) => [g.grade_level_id, g]))
  const strandNameById = Object.fromEntries(strands.map((s) => [s.strand_id, s.strand_name]))

  const selectedGrade = gradeById[Number(formGrade)]
  const isSHS = selectedGrade?.education_level === 'Senior High School'

  const resetForm = () => {
    setEditingId(null)
    setFormSubject(subjects[0]?.subject_id || '')
    setFormGrade(gradeLevels[0]?.grade_level_id || '')
    setFormStrand('')
    setFormHours(4)
    setFormError('')
  }

  const openAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (offering) => {
    setEditingId(offering.offering_id)
    setFormSubject(offering.subject)
    setFormGrade(offering.grade_level)
    setFormStrand(offering.strand || '')
    setFormHours(offering.hours_per_week)
    setFormError('')
    setShowForm(true)
  }

  const handleGradeChange = (val) => {
    setFormGrade(val)
    const grade = gradeById[Number(val)]
    if (grade?.education_level !== 'Senior High School') setFormStrand('')
  }

  const handleSave = async () => {
    setFormError('')

    if (!formSubject) {
      setFormError('Please select a subject.')
      return
    }
    if (!formGrade) {
      setFormError('Please select a grade level.')
      return
    }
    if (isSHS && !formStrand) {
      setFormError('Please select a strand for a Senior High School offering.')
      return
    }
    if (!formHours || formHours <= 0) {
      setFormError('Hours per week must be greater than 0.')
      return
    }

    setSaving(true)

    const payload = {
      subject: Number(formSubject),
      grade_level: Number(formGrade),
      strand: isSHS ? Number(formStrand) : null,
      hours_per_week: Number(formHours),
    }

    try {
      if (editingId) {
        await api.put(`/api/subject-offerings/${editingId}/`, payload)
      } else {
        await api.post('/api/subject-offerings/', payload)
      }
      setShowForm(false)
      await loadAll()
    } catch (saveError) {
      setFormError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const deleteOffering = async (offering) => {
    const subjectName = subjectNameById[offering.subject] || 'this offering'
    if (!window.confirm(`Delete the ${subjectName} offering?`)) return

    try {
      await api.delete(`/api/subject-offerings/${offering.offering_id}/`)
      await loadAll()
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || 'Unable to delete subject offering.')
    }
  }

  return (
    <div>
      <div className="tab-header">
        <div className="tab-header-text">
          <h3>Subject Offerings</h3>
          <p>Link subjects to grade levels and strands, with required weekly hours</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { showForm ? setShowForm(false) : openAdd() }}>
          <IconPlus /> Add Offering
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {showForm && (
        <div className="offering-form card card-body">
          <div className="offering-form-title">{editingId ? 'Edit Subject Offering' : 'New Subject Offering'}</div>

          {formError && <div className="form-error">{formError}</div>}

          <div className="offering-form-fields">
            <div className="field">
              <label className="field-label">Subject</label>
              <div className="select-wrap">
                <select value={formSubject} onChange={(e) => { setFormSubject(e.target.value) }}>
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                  ))}
                </select>
                <IconChevronDown />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Grade Level</label>
              <div className="select-wrap">
                <select value={formGrade} onChange={(e) => { handleGradeChange(e.target.value) }}>
                  {gradeLevels.map((g) => (
                    <option key={g.grade_level_id} value={g.grade_level_id}>{g.grade_name}</option>
                  ))}
                </select>
                <IconChevronDown />
              </div>
            </div>

            {isSHS && (
              <div className="field">
                <label className="field-label">Strand</label>
                <div className="select-wrap">
                  <select value={formStrand} onChange={(e) => { setFormStrand(e.target.value) }}>
                    <option value="">Select strand</option>
                    {strands.map((s) => (
                      <option key={s.strand_id} value={s.strand_id}>{s.strand_name}</option>
                    ))}
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
            <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false) }} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Offering'}
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
            {loading ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">Loading subject offerings…</td>
              </tr>
            ) : offerings.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">No subject offerings yet.</td>
              </tr>
            ) : (
              offerings.map((o) => {
                const grade = gradeById[o.grade_level]
                return (
                  <tr key={o.offering_id}>
                    <td className="td-name">{subjectNameById[o.subject] || '—'}</td>
                    <td>
                      <span className={offeringGradeBadge(grade?.education_level)}>
                        {grade?.grade_name || '—'}
                      </span>
                    </td>
                    <td className="td-muted">{strandNameById[o.strand] || '—'}</td>
                    <td className="td-mono">{o.hours_per_week}h</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon edit" onClick={() => openEdit(o)}><IconEdit /></button>
                        <button className="btn-icon del" onClick={() => deleteOffering(o)}><IconTrash /></button>
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
