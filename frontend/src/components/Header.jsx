import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom"
import { useSchool } from "../contexts/SchoolContext.jsx"
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
  const { schoolName, schoolYear } = useSchool();

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