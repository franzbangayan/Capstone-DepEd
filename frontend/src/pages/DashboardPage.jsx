import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import api from "../api"
import { IconUsers, IconSchool, IconAlert, IconCalendar, IconZap } from '../components/Icons'
import '../styles/DashboardPage.css'
import '../styles/App.css'

const DashboardPage = () => {
  const navigate = useNavigate()
    const [teacherCount, setTeacherCount] = useState(null)  

  useEffect(() => {
    api.get("/api/teachers/")
      .then((res) => {
        setTeacherCount(res.data.length)
      })
      .catch((err) => {
        console.error(err)
      })
  }, [])

  return (
    <div className="screen stack">

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card blue">
          <div className="stat-icon blue">
            <IconUsers />
          </div>
          <div>
            <div className="stat-value">{teacherCount === null ? "--" : teacherCount}</div>
            <div className="stat-label">Total Teachers</div>
          </div>
        </div>

        <div className="stat-card indigo">
          <div className="stat-icon indigo">
            <IconSchool />
          </div>
          <div>
            <div className="stat-value">--</div>
            <div className="stat-label">Total Sections</div>
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon amber">
            <IconAlert />
          </div>
          <div>
            <div className="stat-value alert">--</div>
            <div className="stat-label">Unassigned Loads</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon green">
            <IconCalendar />
          </div>
          <div>
            <div className="stat-value">--</div>
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
          <div className="chart-empty-state">
            No workload data available. Generate a teaching load to see results here.
          </div>
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