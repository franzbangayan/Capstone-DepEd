import { NavLink, useNavigate } from "react-router-dom"
import '../styles/Sidebar.css'
import LogoMark from './LogoMark'
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

  const handleLogout = () => {
    navigate('/logout')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <LogoMark size={36} />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">TeachLoad</div>
          <div className="sidebar-logo-tag">Admin System</div>
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
          <div className="sidebar-avatar">P</div>
          <div>
            <div className="sidebar-user-name">Principal</div>
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