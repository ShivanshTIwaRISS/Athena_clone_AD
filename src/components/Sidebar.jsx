// src/components/Sidebar.jsx
import PropTypes from 'prop-types';

const ADMIN_NAV = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', icon: HomeIcon, label: 'Dashboard' },
      { id: 'analytics', icon: ChartIcon, label: 'Analytics' },
    ]
  },
  {
    label: 'Assessments',
    items: [
      { id: 'exams', icon: BookOpenIcon, label: 'Examinations' },
      { id: 'questions', icon: ListIcon, label: 'Question Bank' },
      { id: 'sessions', icon: ClipboardIcon, label: 'Sessions' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { id: 'users', icon: UsersIcon, label: 'Users' },
      { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    ]
  },
];

const CANDIDATE_NAV = [
  {
    label: 'My Account',
    items: [
      { id: 'candidate-dashboard', icon: HomeIcon, label: 'My Exams' },
      { id: 'history', icon: ClockIcon, label: 'Attempt History' },
      { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    ]
  }
];

export default function Sidebar({ currentUser, view, onNavigate }) {
  const isAdmin = currentUser?.role === 'admin';
  const navGroups = isAdmin ? ADMIN_NAV : CANDIDATE_NAV;

  return (
    <nav className="sidebar">
      {navGroups.map((group) => (
        <div key={group.label} className="sidebar-section">
          <div className="sidebar-section-label">{group.label}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${view === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className="sidebar-icon" />
                {item.label}
                {item.badge && <span className="sidebar-badge">{item.badge}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

Sidebar.propTypes = {
  currentUser: PropTypes.object,
  view: PropTypes.string,
  onNavigate: PropTypes.func.isRequired,
};

// ── Icon Components ─────────────────────────────────────────────────────────
function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ChartIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function BookOpenIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function ListIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function ClipboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function UsersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

HomeIcon.propTypes = ChartIcon.propTypes = BookOpenIcon.propTypes = ListIcon.propTypes =
ClipboardIcon.propTypes = UsersIcon.propTypes = SettingsIcon.propTypes = ClockIcon.propTypes = {
  className: PropTypes.string,
};
