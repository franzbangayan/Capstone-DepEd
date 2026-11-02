import { NavLink, useNavigate } from "react-router-dom"
import '../styles/Sidebar.css'
import { IconGrid, IconUsers, IconBook, IconZap, IconBarChart, IconLogOut } from './Icons'

const NAV_ITEMS = [
  { path: '/',            label: 'Dashboard',        Icon: IconGrid },
  { path: '/teachers',    label: 'Teachers',          Icon: IconUsers },
  { path: '/curriculum',  label: 'Curriculum Setup',  Icon: IconBook },
  { path: '/scheduling',  label: 'Load Generation',   Icon: IconZap },
  { path: '/reports',     label: 'Reports',           Icon: IconBarChart },
]

const Sidebar = () => {
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || 'User'
  const avatarInitial = username.trim().charAt(0).toUpperCase() || 'U'

  const handleLogout = () => {
    navigate('/logout')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img className="sidebar-deped-logo" src="/assets/deped-logo.jpg" alt="Department of Education logo" />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">Schedura</div>
          <div className="sidebar-logo-tag">Teacher Loading System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => isActive ? 'nav-btn active' : 'nav-btn'}
          >
            <span className="nav-icon">
              <item.Icon />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{avatarInitial}</div>
          <div>
            <div className="sidebar-user-name">{username}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <IconLogOut />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
