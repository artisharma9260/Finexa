import { useState } from 'react';
import NotificationList from './NotificationList';

export default function StudentDashboard({
  user,
  account,
  parentAccount,
  limit,
  spentStats,
  transactions,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRefreshNotifications,
  onTransfer,
  onDeposit,
  onViewAllTransactions,
  transferLoading,
}) {
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);

  const dailyLimit = limit?.dailyLimit ?? 100;
  const monthlyLimit = limit?.monthlyLimit ?? 500;
  const approvalAbove = limit?.approvalAbove ?? 50;

  const dailySpent = spentStats?.dailySpent ?? 0;
  const monthlySpent = spentStats?.monthlySpent ?? 0;
  const remainingDaily = Math.max(0, dailyLimit - dailySpent);
  const dailyPct = Math.min(100, (dailySpent / (dailyLimit || 1)) * 100);
  const monthlyPct = Math.min(100, (monthlySpent / (monthlyLimit || 1)) * 100);

  // Filter pending requests sent by this student
  const currentAccountId = account?._id || account?.id;
  const pendingRequests = transactions.filter((tx) => {
    const isSender = (tx.from?._id || tx.from) === currentAccountId;
    return isSender && tx.status === 'pending';
  });

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!toAccountId || !amount) return;
    const success = await onTransfer(toAccountId.trim(), Number(amount));
    if (success) {
      setToAccountId('');
      setAmount('');
      setShowTransferForm(false);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* 1. BALANCE & QUICK ACTION CARD */}
      <div className="card balance-card">
        <div className="card-header-simple">
          <span className="card-label">Student Account Balance</span>
          <span className="badge-pill role-pill-student">Student</span>
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
            {showTransferForm ? 'Cancel Transfer' : '↗ Send Money'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onDeposit(100)}
            title="Add mock funds for testing"
          >
            + Add $100
          </button>
        </div>
      </div>

      {/* 2. REMAINING DAILY LIMIT CARD */}
      <div className="card limit-card">
        <div className="card-header-simple">
          <span className="card-label">Spending Limits</span>
          <span className="badge-pill badge-info">Parent Controlled</span>
        </div>

        <div className="limit-highlight-box">
          <div className="limit-highlight-title">Remaining Daily Limit</div>
          <div className="limit-highlight-amount">
            ${remainingDaily.toFixed(2)}
          </div>
          <span className="limit-subtext">
            of ${dailyLimit.toFixed(2)} daily allowance
          </span>
        </div>

        {/* Daily Progress */}
        <div className="limit-bar-group">
          <div className="limit-bar-labels">
            <span>Daily: ${dailySpent.toFixed(2)} spent</span>
            <span>{dailyPct.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${dailySpent >= dailyLimit ? 'fill-exceeded' : ''}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="limit-bar-group">
          <div className="limit-bar-labels">
            <span>Monthly: ${monthlySpent.toFixed(2)} of ${monthlyLimit.toFixed(2)}</span>
            <span>{monthlyPct.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${monthlySpent >= monthlyLimit ? 'fill-exceeded' : ''}`}
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
        </div>

        <div className="approval-threshold-banner">
          <span>⚠️ Transfers over <strong>${approvalAbove.toFixed(2)}</strong> require parent approval.</span>
        </div>
      </div>

      {/* COLLAPSIBLE TRANSFER FORM */}
      {showTransferForm && (
        <div className="card full-width transfer-panel">
          <div className="panel-title">New Transfer</div>
          {parentAccount && (
            <div className="quick-select-row">
              <span className="quick-label">Quick select:</span>
              <button
                type="button"
                className="chip-btn"
                onClick={() => setToAccountId(parentAccount.id)}
              >
                Parent: {user.parentId?.name || 'Parent'} (${parentAccount.balance?.toFixed(2) || '0.00'})
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitTransfer} className="transfer-form-grid">
            <div className="form-group">
              <label htmlFor="student-to-acc">Recipient Account ID</label>
              <input
                id="student-to-acc"
                type="text"
                placeholder="Paste destination account ID"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="student-amount">Amount ($)</label>
              <input
                id="student-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={transferLoading}
            >
              {transferLoading ? 'Processing...' : 'Confirm Transfer'}
            </button>
          </form>
        </div>
      )}

      {/* 3. PENDING REQUESTS CARD */}
      <div className="card full-width pending-card">
        <div className="card-header-row">
          <div>
            <h3>Pending Requests</h3>
            <p className="card-desc">
              Transfers waiting for your parent&apos;s approval. No money leaves your account until approved.
            </p>
          </div>
          <span className="badge-count amber">
            {pendingRequests.length} Pending
          </span>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <span className="table-primary-text">
                        {req.to?.userId?.name || 'Account ' + (req.to?._id || req.to)}
                      </span>
                      <span className="table-sub-text">
                        {req.to?.userId?.email || ''}
                      </span>
                    </td>
                    <td className="amount-col negative">
                      ${req.amount.toFixed(2)}
                    </td>
                    <td className="table-time">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="status-badge pending">
                        Pending Approval
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-box">
            <span className="empty-icon">✓</span>
            <p>No pending transfer requests right now.</p>
            <span className="empty-hint">
              Transfers over ${approvalAbove.toFixed(2)} will appear here until reviewed by your parent.
            </span>
          </div>
        )}
      </div>

      {/* 4. RECENT TRANSACTIONS */}
      <div className="card full-width">
        <div className="card-header-row">
          <div>
            <h3>Recent Transactions</h3>
            <p className="card-desc">Latest transfers to and from your account</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onViewAllTransactions}
          >
            View All in History →
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const isSender = (tx.from?._id || tx.from) === currentAccountId;
                  return (
                    <tr key={tx._id}>
                      <td>
                        <span className={`direction-badge ${isSender ? 'sent' : 'received'}`}>
                          {isSender ? 'SENT' : 'RECEIVED'}
                        </span>
                      </td>
                      <td>
                        <span className="table-primary-text">
                          {isSender
                            ? tx.to?.userId?.name || 'Account ' + (tx.to?._id || tx.to)
                            : tx.from?.userId?.name || 'Account ' + (tx.from?._id || tx.from)}
                        </span>
                      </td>
                      <td className={`amount-col ${isSender ? 'negative' : 'positive'}`}>
                        {isSender ? '-' : '+'}${tx.amount.toFixed(2)}
                      </td>
                      <td>
                        <span className={`status-badge ${tx.status?.toLowerCase()}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="table-time">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-box">
            <p>No transactions yet.</p>
          </div>
        )}
      </div>

      {/* 5. IN-APP NOTIFICATIONS */}
      <NotificationList
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onRefresh={onRefreshNotifications}
      />

      {/* PARENT CONNECTION FOOTER */}
      <div className="card full-width connection-info-card">
        <div className="connection-info-content">
          <span className="connection-label">Connected Parent:</span>
          {user.parentId ? (
            <span className="connection-value">
              <strong>{user.parentId.name}</strong> ({user.parentId.email})
            </span>
          ) : (
            <span className="connection-value text-muted">
              Not linked yet. Share your email <code>{user.email}</code> with your parent to link.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
