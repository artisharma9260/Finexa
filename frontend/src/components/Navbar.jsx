export default function Navbar({
  user,
  activeView,
  setActiveView,
  onLogout,
  approvalsCount = 0,
  pendingCount = 0,
  unreadNotifsCount = 0,
}) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">Finexa</span>
        <span className="navbar-tagline">Financial Hub</span>
      </div>

      <nav className="navbar-nav">
        <button
          type="button"
          className={`nav-tab ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          Dashboard
          {user?.role === 'parent' && approvalsCount > 0 && (
            <span className="nav-badge" title={`${approvalsCount} pending approvals`}>
              {approvalsCount}
            </span>
          )}
          {user?.role === 'student' && pendingCount > 0 && (
            <span className="nav-badge pending" title={`${pendingCount} pending requests`}>
              {pendingCount}
            </span>
          )}
          {unreadNotifsCount > 0 && (
            <span className="nav-badge notif" title={`${unreadNotifsCount} unread notifications`}>
              🔔 {unreadNotifsCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`nav-tab ${activeView === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveView('transactions')}
        >
          Transaction History
        </button>
      </nav>

      <div className="navbar-user">
        <div className="user-details">
          <span className="user-name">{user?.name}</span>
          <span className={`role-badge ${user?.role}`}>{user?.role?.toUpperCase()}</span>
        </div>
        <button type="button" className="btn btn-sm btn-logout" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </header>
  );
}
