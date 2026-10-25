export default function NotificationList({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'transfer_request':
        return '🔔';
      case 'transfer_approved':
        return '✓';
      case 'transfer_rejected':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  const getTypeClass = (type) => {
    switch (type) {
      case 'transfer_request':
        return 'type-request';
      case 'transfer_approved':
        return 'type-approved';
      case 'transfer_rejected':
        return 'type-rejected';
      default:
        return 'type-info';
    }
  };

  return (
    <div className="card full-width notification-card">
      <div className="card-header-row">
        <div>
          <h3>In-App Notifications</h3>
          <p className="card-desc">
            Stay informed on transfer requests, approvals, and account updates
          </p>
        </div>
        <div className="notification-header-actions">
          {unreadCount > 0 && (
            <span className="badge-count amber">
              {unreadCount} Unread
            </span>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={onMarkAllAsRead}
            >
              Mark All Read
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onRefresh}
            title="Refresh notifications"
          >
            Refresh
          </button>
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`notification-item ${!item.read ? 'unread' : 'read'}`}
            >
              <div className={`notif-icon-badge ${getTypeClass(item.type)}`}>
                {getTypeIcon(item.type)}
              </div>

              <div className="notif-body">
                <p className="notif-message">{item.message}</p>
                <span className="notif-time">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="notif-actions">
                {!item.read && (
                  <button
                    type="button"
                    className="btn btn-sm btn-mark-read"
                    onClick={() => onMarkAsRead(item._id)}
                    title="Mark this notification as read"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-box">
          <span className="empty-icon">🔔</span>
          <p>No notifications yet.</p>
          <span className="empty-hint">
            You will be notified here whenever a transfer is requested, approved, or rejected.
          </span>
        </div>
      )}
    </div>
  );
}
