import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom"
import '../styles/Header.css'
import api from '../api.js';

const SCREEN_TITLES = {
  dashboard:  { title: 'Dashboard',        sub: 'Overview and quick actions' },
  teachers:   { title: 'Teachers',         sub: 'Manage faculty records and loading capacity' },
  curriculum: { title: 'Curriculum Setup', sub: 'Grade levels, subjects, sections, and school year configuration' },
  scheduling: { title: 'Load Generation',  sub: 'Configure and generate teacher-subject-section assignments' },
  reports:    { title: 'Reports',          sub: 'Generated loads, summaries, and export tools' },
}

const Header = () => {
  const location = useLocation()
  // "/" -> "dashboard", "/teachers" -> "teachers", "/curriculum" -> "curriculum", etc.
  const screen = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1)
  const info = SCREEN_TITLES[screen] ?? SCREEN_TITLES.dashboard
  const [schoolName, setSchoolName] = useState("SCHOOL NAME");
  const [schoolYear, setSchoolYear] = useState("S.Y. 2024–2025");

  useEffect(() => {

    const fetchData = async () => {
      try {
        const response = await api.get("/api/schools/");
        const data = response.data;
        const schoolId = localStorage.getItem("school_id");
        const activeSchool = data.find(school => school.school_id === Number(schoolId));
        if (activeSchool) {
          setSchoolName(activeSchool.school_name);
        }
        
        const schoolYearResponse = await api.get("/api/school-years/");
        const activeSchoolYear = schoolYearResponse.data.find(year => year.is_active);
        const schoolYearData = activeSchoolYear || null;
        setSchoolYear(schoolYearData ? `${schoolYearData.year_start}-${schoolYearData.year_end}` : "S.Y. 2024–2025");

      } catch (err) {
        console.error(err)
      }
    }

    fetchData()

  }, [])

  return (
    <header className="header">
      <div>
        <div className="header-title">{info.title}</div>
        <div className="header-sub">{info.sub}</div>
      </div>
      <div className="header-right">
        <div className="header-school">
          <div className="header-school-name">{schoolName}</div>
          <div className="header-school-year">{schoolYear}</div>
        </div>
        <div className="header-divider" />
        <div className="header-status">
          <div className="header-status-dot" />
          <span className="header-status-label">Active</span>
        </div>
      </div>
    </header>
  )
}

export default Header