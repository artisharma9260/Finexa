import { useState, useEffect } from 'react';
import NotificationList from './NotificationList';

export default function ParentDashboard({
  user,
  account,
  linkedStudents = [],
  approvals = [],
  pendingInvites = [],
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRefreshNotifications,
  onApprove,
  onReject,
  onSetLimits,
  onInvite,
  onUnlink,
  onCancelInvite,
  onTransfer,
  onDeposit,
  onRefreshApprovals,
  onRefreshStudents,
  transferLoading,
}) {
  // Selected student for limit configuration
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dailyLimit, setDailyLimit] = useState(100);
  const [monthlyLimit, setMonthlyLimit] = useState(500);
  const [approvalAbove, setApprovalAbove] = useState(50);
  const [savingLimits, setSavingLimits] = useState(false);

  // Invite student state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Transfer state
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);

  // When linked students load or change, default to first student if none selected
  useEffect(() => {
    if (linkedStudents.length > 0) {
      if (!selectedStudentId || !linkedStudents.some((s) => s._id === selectedStudentId)) {
        const first = linkedStudents[0];
        setSelectedStudentId(first._id);
        setDailyLimit(first.limit?.dailyLimit ?? 100);
        setMonthlyLimit(first.limit?.monthlyLimit ?? 500);
        setApprovalAbove(first.limit?.approvalAbove ?? 50);
      }
    }
  }, [linkedStudents, selectedStudentId]);

  // Handle student selection change in limits form
  const handleSelectStudent = (id) => {
    setSelectedStudentId(id);
    const st = linkedStudents.find((s) => s._id === id);
    if (st) {
      setDailyLimit(st.limit?.dailyLimit ?? 100);
      setMonthlyLimit(st.limit?.monthlyLimit ?? 500);
      setApprovalAbove(st.limit?.approvalAbove ?? 50);
    }
  };

  const handleSubmitLimits = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setSavingLimits(true);
    await onSetLimits(selectedStudentId, {
      dailyLimit: Number(dailyLimit),
      monthlyLimit: Number(monthlyLimit),
      approvalAbove: Number(approvalAbove),
    });
    setSavingLimits(false);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    const success = await onInvite(inviteEmail);
    if (success) {
      setInviteEmail('');
    }
    setInviting(false);
  };

  const handleSendTransfer = async (e) => {
    e.preventDefault();
    if (!toAccountId || !transferAmount) return;
    const success = await onTransfer(toAccountId.trim(), Number(transferAmount));
    if (success) {
      setToAccountId('');
      setTransferAmount('');
      setShowTransferForm(false);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* 1. BALANCE & OVERVIEW CARD */}
      <div className="card balance-card">
        <div className="card-header-simple">
          <span className="card-label">Parent Account Balance</span>
          <span className="badge-pill role-pill-parent">Parent</span>
        </div>
        <div className="balance-hero">
          <span className="currency-sign">$</span>
          <span className="balance-value">
            {account ? account.balance.toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="account-meta">
          <span className="meta-label">Account ID:</span>
          <code className="account-code" title={account?._id}>
            {account ? account._id : 'Loading...'}
          </code>
        </div>
        <div className="card-actions-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowTransferForm(!showTransferForm)}
          >
            {showTransferForm ? 'Cancel' : '↗ Transfer to Student'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onDeposit(100)}
            title="Add test funds"
          >
            + Add $100
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARD */}
      <div className="card stats-summary-card">
        <div className="card-header-simple">
          <span className="card-label">Family Overview</span>
        </div>
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-number">{linkedStudents.length}</span>
            <span className="stat-label">Linked Students</span>
          </div>
          <div className="stat-box">
            <span className={`stat-number ${approvals.length > 0 ? 'highlight-amber' : ''}`}>
              {approvals.length}
            </span>
            <span className="stat-label">Pending Approvals</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{pendingInvites.length}</span>
            <span className="stat-label">Pending Invites</span>
          </div>
        </div>
      </div>

      {/* QUICK TRANSFER FORM (IF OPEN) */}
      {showTransferForm && (
        <div className="card full-width transfer-panel">
          <div className="panel-title">Transfer Funds to Student</div>
          {linkedStudents.length > 0 && (
            <div className="quick-select-row">
              <span className="quick-label">Select student recipient:</span>
              {linkedStudents.map((st) => (
                <button
                  key={st._id}
                  type="button"
                  className="chip-btn"
                  onClick={() => setToAccountId(st.account?.id || '')}
                >
                  {st.name} (${st.account?.balance?.toFixed(2) || '0.00'})
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendTransfer} className="transfer-form-grid">
            <div className="form-group">
              <label htmlFor="parent-to-acc">Destination Account ID</label>
              <input
                id="parent-to-acc"
                type="text"
                placeholder="Student account ID"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="parent-amount">Amount ($)</label>
              <input
                id="parent-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="50.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={transferLoading}
            >
              {transferLoading ? 'Processing...' : 'Send Transfer'}
            </button>
          </form>
        </div>
      )}

      {/* 3. APPROVAL QUEUE CARD (WITH APPROVE AND REJECT BUTTONS) */}
      <div className="card full-width approval-card">
        <div className="card-header-row">
          <div>
            <h3>Approval Queue</h3>
            <p className="card-desc">
              Student transfers that exceed their approval threshold. Review and approve or reject.
            </p>
          </div>
          <div className="header-actions">
            <span className={`badge-count ${approvals.length > 0 ? 'amber' : 'neutral'}`}>
              {approvals.length} Pending
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={onRefreshApprovals}
            >
              Refresh
            </button>
          </div>
        </div>

        {approvals.length > 0 ? (
          <div className="approval-items-container">
            {approvals.map((req) => {
              const studentName = req.from?.userId?.name || 'Student';
              const recipientName = req.to?.userId?.name || 'Recipient';
              return (
                <div key={req._id} className="approval-queue-item">
                  <div className="approval-main-info">
                    <div className="approval-parties">
                      <span className="party-from">{studentName}</span>
                      <span className="party-arrow">→</span>
                      <span className="party-to">{recipientName}</span>
                    </div>
                    <div className="approval-sub">
                      <span>Acc: {req.to?.userId?.email || (req.to?._id || req.to)}</span>
                      <span className="sep">•</span>
                      <span>{new Date(req.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="approval-amount-badge">
                    ${req.amount.toFixed(2)}
                  </div>

                  <div className="approval-buttons">
                    <button
                      type="button"
                      className="btn btn-sm btn-approve"
                      onClick={() => onApprove(req._id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-reject"
                      onClick={() => onReject(req._id)}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-box">
            <span className="empty-icon">✓</span>
            <p>Approval queue is empty.</p>
            <span className="empty-hint">
              When a student requests a transfer exceeding their approval threshold, it will appear here.
            </span>
          </div>
        )}
      </div>

      {/* 4. IN-APP NOTIFICATIONS */}
      <NotificationList
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onRefresh={onRefreshNotifications}
      />

      {/* 5. FORM TO SET LIMITS */}
      <div className="card full-width limit-form-card">
        <div className="card-header-row">
          <div>
            <h3>Set Spending Limits</h3>
            <p className="card-desc">
              Define daily & monthly spending caps, and set the threshold above which transfers require your approval.
            </p>
          </div>
        </div>

        {linkedStudents.length > 0 ? (
          <form onSubmit={handleSubmitLimits} className="limit-configuration-form">
            <div className="form-group full">
              <label htmlFor="limit-student-select">Select Student</label>
              <select
                id="limit-student-select"
                value={selectedStudentId}
                onChange={(e) => handleSelectStudent(e.target.value)}
                required
              >
                {linkedStudents.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name} ({st.email}) — Balance: ${st.account?.balance?.toFixed(2) || '0.00'}
                  </option>
                ))}
              </select>
            </div>

            <div className="limit-inputs-row">
              <div className="form-group">
                <label htmlFor="daily-limit-input">
                  Daily Limit ($)
                  <span className="help-text">Max total spent per day</span>
                </label>
                <input
                  id="daily-limit-input"
                  type="number"
                  min="0"
                  step="1"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="monthly-limit-input">
                  Monthly Limit ($)
                  <span className="help-text">Max total spent per month</span>
                </label>
                <input
                  id="monthly-limit-input"
                  type="number"
                  min="0"
                  step="1"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="approval-threshold-input">
                  Approval Above ($)
                  <span className="help-text">Transfers over this require approval</span>
                </label>
                <input
                  id="approval-threshold-input"
                  type="number"
                  min="0"
                  step="1"
                  value={approvalAbove}
                  onChange={(e) => setApprovalAbove(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-actions-right">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingLimits}
              >
                {savingLimits ? 'Saving...' : 'Save Limits'}
              </button>
            </div>
          </form>
        ) : (
          <div className="empty-box">
            <p>No students linked yet.</p>
            <span className="empty-hint">
              Invite and link a student below to configure spending limits.
            </span>
          </div>
        )}
      </div>

      {/* 5. LINKED STUDENTS LIST */}
      <div className="card full-width">
        <div className="card-header-row">
          <div>
            <h3>Linked Students</h3>
            <p className="card-desc">All students currently linked to your parental account</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onRefreshStudents}
          >
            Refresh
          </button>
        </div>

        {linkedStudents.length > 0 ? (
          <div className="student-cards-grid">
            {linkedStudents.map((student) => {
              const lim = student.limit;
              const isSelected = student._id === selectedStudentId;
              return (
                <div
                  key={student._id}
                  className={`student-card-item ${isSelected ? 'active-selection' : ''}`}
                >
                  <div className="student-card-header">
                    <div>
                      <span className="student-card-name">{student.name}</span>
                      <span className="student-card-email">{student.email}</span>
                    </div>
                    <div className="student-balance-chip">
                      ${student.account?.balance?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  <div className="student-limits-pills">
                    <span className="limit-pill">
                      Daily: <strong>${lim?.dailyLimit ?? 100}</strong>
                    </span>
                    <span className="limit-pill">
                      Monthly: <strong>${lim?.monthlyLimit ?? 500}</strong>
                    </span>
                    <span className="limit-pill highlight">
                      Approval &gt; <strong>${lim?.approvalAbove ?? 50}</strong>
                    </span>
                  </div>

                  <div className="student-card-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleSelectStudent(student._id)}
                    >
                      Configure Limits
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger-outline"
                      onClick={() => onUnlink(student._id, student.name)}
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-box">
            <p>No students linked to your account yet.</p>
          </div>
        )}
      </div>

      {/* 6. INVITE STUDENT & PENDING INVITATIONS */}
      <div className="card full-width">
        <div className="card-header-row">
          <div>
            <h3>Invite Student</h3>
            <p className="card-desc">
              Send an invitation to connect a student account by their email address
            </p>
          </div>
        </div>

        <form onSubmit={handleSendInvite} className="invite-form-row">
          <input
            type="email"
            placeholder="student@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={inviting}
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>

        {pendingInvites.length > 0 && (
          <div className="pending-invites-section">
            <div className="sub-title">Pending Invitations</div>
            <div className="pending-invites-list">
              {pendingInvites.map((inv) => (
                <div key={inv._id} className="pending-invite-item">
                  <div className="invite-info">
                    <span className="invite-email">{inv.studentEmail}</span>
                    <span className="badge-pill badge-neutral">Waiting for Sign Up</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger-outline"
                    onClick={() => onCancelInvite(inv._id)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
