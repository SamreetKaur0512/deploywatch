import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderGit2, BarChart2, Bell,
  Users, Settings, LogOut, Zap, Wifi
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',       icon: FolderGit2,      label: 'Projects' },
  { to: '/analytics',      icon: BarChart2,        label: 'Analytics' },
  { to: '/notifications',  icon: Bell,             label: 'Notifications' },
];

const adminItems = [
  { to: '/admin/users',    icon: Users,            label: 'Users' },
];

const Sidebar = ({ unreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Zap size={20} className="logo-icon" />
        <span className="logo-text">DeployWatch</span>
        <span className={`conn-dot ${connected ? 'conn-dot--on' : 'conn-dot--off'}`} title={connected ? 'Live' : 'Offline'} />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Menu</span>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Icon size={16} />
            <span>{label}</span>
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <span className="nav-section-label" style={{ marginTop: '1rem' }}>Admin</span>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} />
              : <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
            }
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
