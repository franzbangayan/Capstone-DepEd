import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import api from "../api"
import { IconUsers, IconSchool, IconAlert, IconCalendar, IconZap } from '../components/Icons'
import '../styles/DashboardPage.css'
import '../styles/App.css'
import { useSchool } from "../contexts/SchoolContext.jsx"

const ACTIVE_DATE = '9999-12-31'

const listData = (response) => (
  Array.isArray(response.data) ? response.data : response.data.results || []
)

const DashboardPage = () => {
  const navigate = useNavigate()
  const [teacherCount, setTeacherCount] = useState()
  const [sectionCount, setSectionCount] = useState()
  const [workload, setWorkload] = useState([])          // [{ name, assigned, max }]
  const [unassignedCount, setUnassignedCount] = useState(null)
  const { refresh, schoolYear } = useSchool();

  useEffect(() => {

    const fetchData = async () => {
      try {
        const [teachersRes, sectionsRes, loadLimitsRes, teachingLoadsRes, offeringsRes, logsRes] = await Promise.all([
          api.get("/api/teachers/"),
          api.get("/api/sections/"),
          api.get("/api/teacher-load-limits/"),
          api.get("/api/teaching-loads/"),
          api.get("/api/subject-offerings/"),
          api.get("/api/generation-logs/"),
        ])

        const teachers = listData(teachersRes)
        const sections = listData(sectionsRes)
        const loadLimits = listData(loadLimitsRes)
        const teachingLoads = listData(teachingLoadsRes)
        const offerings = listData(offeringsRes)
        const logs = listData(logsRes)

        setTeacherCount(teachers.length)
        setSectionCount(sections.length)

        // TeachingLoad only stores an offering id, not its hours - need
        // this map to know how many hours each assigned row is worth.
        const hoursByOfferingId = Object.fromEntries(
          offerings.map((o) => [o.offering_id, o.hours_per_week])
        )

        const computed = teachers
          .map((teacher) => {
            const activeLimit = loadLimits.find(
              (l) => Number(l.teacher) === Number(teacher.teacher_id) && l.date_ended === ACTIVE_DATE
            )
            const maxHours = activeLimit?.max_load_hours ?? 0

            // TEACHING_LOAD stores one row per scheduled period. Count each
            // teacher + section + offering assignment only once for weekly workload.
            const countedAssignments = new Set()
            const assignedHours = teachingLoads
              .filter((load) => Number(load.teacher) === Number(teacher.teacher_id))
              .reduce((sum, load) => {
                const key = `${load.section}-${load.offering}`
                if (countedAssignments.has(key)) return sum
                countedAssignments.add(key)
                return sum + (hoursByOfferingId[load.offering] || 0)
              }, 0)

            return {
              name: `${teacher.last_name}, ${teacher.first_name}`,
              assigned: assignedHours,
              max: maxHours,
            }
          })
          // Teachers with no active load limit on record can't be
          // meaningfully plotted against a max - skip them here rather
          // than show a bar with no scale.
          .filter((t) => t.max > 0)

        setWorkload(computed)

        // Unassigned Loads = skipped_count from the most recent
        // generation run, if any has happened yet.
        if (logs.length > 0) {
          const mostRecent = [...logs].sort(
            (a, b) => new Date(b.generated_at) - new Date(a.generated_at)
          )[0]
          setUnassignedCount(mostRecent.skipped_count)
        }
      } catch (err) {
        console.error(err)
      }
    }

    refresh();
    fetchData()

  }, [])

  const maxScale = Math.max(1, ...workload.map((t) => t.max))

  return (
    <div className="screen stack">

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <IconUsers />
          </div>
          <div>
            <div className="stat-value">{teacherCount == null ? "--" : teacherCount}</div>
            <div className="stat-label">Total Teachers</div>
          </div>
        </div>

        <div className="stat-card indigo">
          <div className="stat-icon indigo">
            <IconSchool />
          </div>
          <div>
            <div className="stat-value">{sectionCount == null ? "--" : sectionCount}</div>
            <div className="stat-label">Total Sections</div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon amber">
            <IconAlert />
          </div>
          <div>
            <div className="stat-value alert">{unassignedCount == null ? "--" : unassignedCount}</div>
            <div className="stat-label">Unassigned Loads</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon green">
            <IconCalendar />
          </div>
          <div>
            <div className="stat-value">{schoolYear === null ? "--" : schoolYear}</div>
            <div className="stat-label">School Year</div>
          </div>
        </div>
      </div>

      {/* Workload chart + actions */}
      <div className="grid-3-2">

        {/* Chart */}
        <div className="card chart-card">
          <div className="row-between">
            <div>
              <div className="section-title">Teacher Workload Preview</div>
              <div className="section-sub">Assigned hours vs. max load</div>
            </div>
            <div className="chart-legend">
              <span className="legend-dot assigned" /> Assigned
              <span className="legend-dot remaining" /> Remaining
            </div>
          </div>

          {workload.length === 0 ? (
            <div className="chart-empty-state">
              No workload data available. Generate a teaching load to see results here.
            </div>
          ) : (
            <div className="workload-bars">
              {workload.map((t, i) => {
                const assignedPct = Math.min(100, (t.assigned / maxScale) * 100)
                const maxPct = Math.min(100, (t.max / maxScale) * 100)
                const overLimit = t.assigned > t.max
                return (
                  <div key={i} className="workload-row">
                    <div className="workload-name" title={t.name}>{t.name}</div>
                    <div className="workload-track">
                      <div className="workload-track-max" style={{ width: `${maxPct}%` }} />
                      <div
                        className={overLimit ? "workload-track-assigned over" : "workload-track-assigned"}
                        style={{ width: `${assignedPct}%` }}
                      />
                    </div>
                    <div className="workload-figure">{t.assigned}/{t.max}h</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="stack">
          <div className="generate-card">
            <div className="generate-icon-wrap">
              <IconZap />
            </div>
            <div className="generate-title">Generate Teaching Load</div>
            <div className="generate-desc">
              Automatically assign teachers to subjects and sections based on DepEd constraints.
            </div>
            <button
              className="generate-btn"
              onClick={() => { navigate('/scheduling') }} 
            >
              Generate Teaching Load
            </button>
          </div>

          <div className="card card-body">
            <div className="section-title">Assignment Status</div>
            <div className="status-list">
              <div className="status-row">
                <div className="status-left">
                  <div className="status-dot green" />
                  <span className="status-text">Fully Assigned</span>
                </div>
                <span className="status-count">--</span>
              </div>
              <div className="status-row">
                <div className="status-left">
                  <div className="status-dot amber" />
                  <span className="status-text">Partially Assigned</span>
                </div>
                <span className="status-count">--</span>
              </div>
              <div className="status-row">
                <div className="status-left">
                  <div className="status-dot red" />
                  <span className="status-text">Unassigned</span>
                </div>
                <span className="status-count">--</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="card card-body">
        <div className="section-title">Recent Activity</div>
        <div className="empty-state">No recent activity.</div>
      </div>

    </div>
  )
}

export default DashboardPage