import { useState, useMemo } from 'react';

export default function TransactionHistory({
  transactions = [],
  currentAccountId,
  onRefresh,
  onBackToDashboard,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize status for comparisons
  const normalizeStatus = (status) => {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === 'completed') return 'COMPLETED';
    if (s === 'pending') return 'PENDING';
    if (s === 'blocked') return 'BLOCKED';
    if (s === 'rejected') return 'REJECTED';
    return status.toUpperCase();
  };

  // Counts for each tab
  const counts = useMemo(() => {
    const res = { ALL: transactions.length, COMPLETED: 0, PENDING: 0, BLOCKED: 0, REJECTED: 0 };
    transactions.forEach((tx) => {
      const norm = normalizeStatus(tx.status);
      if (res[norm] !== undefined) {
        res[norm] += 1;
      }
    });
    return res;
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const norm = normalizeStatus(tx.status);
      if (statusFilter !== 'ALL' && norm !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const toName = tx.to?.userId?.name?.toLowerCase() || '';
        const toEmail = tx.to?.userId?.email?.toLowerCase() || '';
        const fromName = tx.from?.userId?.name?.toLowerCase() || '';
        const fromEmail = tx.from?.userId?.email?.toLowerCase() || '';
        const toAcc = (tx.to?._id || tx.to || '').toString().toLowerCase();
        const fromAcc = (tx.from?._id || tx.from || '').toString().toLowerCase();
        const amountStr = tx.amount?.toString() || '';

        return (
          toName.includes(query) ||
          toEmail.includes(query) ||
          fromName.includes(query) ||
          fromEmail.includes(query) ||
          toAcc.includes(query) ||
          fromAcc.includes(query) ||
          amountStr.includes(query)
        );
      }

      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  return (
    <div className="history-page">
      <div className="card full-width">
        <div className="history-header">
          <div>
            <h2>Transaction History</h2>
            <p className="card-desc">
              Complete ledger of all completed, pending, blocked, and rejected transfers
            </p>
          </div>
          <div className="history-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onRefresh}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onBackToDashboard}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* CONTROLS: TABS & SEARCH */}
        <div className="history-controls">
          <div className="status-tabs-row">
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({counts.ALL})
            </button>
            <button
              type="button"
              className={`filter-tab completed ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed ({counts.COMPLETED})
            </button>
            <button
              type="button"
              className={`filter-tab pending ${statusFilter === 'PENDING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending ({counts.PENDING})
            </button>
            <button
              type="button"
              className={`filter-tab blocked ${statusFilter === 'BLOCKED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('BLOCKED')}
            >
              Blocked ({counts.BLOCKED})
            </button>
            <button
              type="button"
              className={`filter-tab rejected ${statusFilter === 'REJECTED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('REJECTED')}
            >
              Rejected ({counts.REJECTED})
            </button>
          </div>

          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by counterparty, email, or account ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="history-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* TABLE VIEW */}
        {filteredTransactions.length > 0 ? (
          <div className="table-responsive">
            <table className="clean-table history-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Audit Details</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const isSender = (tx.from?._id || tx.from) === currentAccountId;
                  const normStatus = normalizeStatus(tx.status);

                  return (
                    <tr key={tx._id} className={`tx-row row-${normStatus.toLowerCase()}`}>
                      <td>
                        <span className={`direction-badge ${isSender ? 'sent' : 'received'}`}>
                          {isSender ? 'SENT' : 'RECEIVED'}
                        </span>
                      </td>
                      <td>
                        <div className="party-details">
                          <span className="party-name">
                            {isSender
                              ? tx.to?.userId?.name || 'Account ' + (tx.to?._id || tx.to)
                              : tx.from?.userId?.name || 'Account ' + (tx.from?._id || tx.from)}
                          </span>
                          <span className="party-sub">
                            {isSender
                              ? `To: ${tx.to?.userId?.email || (tx.to?._id || tx.to)}`
                              : `From: ${tx.from?.userId?.email || (tx.from?._id || tx.from)}`}
                          </span>
                        </div>
                      </td>
                      <td className={`amount-col ${isSender ? 'negative' : 'positive'}`}>
                        {isSender ? '-' : '+'}${tx.amount.toFixed(2)}
                      </td>
                      <td>
                        <span className={`status-badge ${normStatus.toLowerCase()}`}>
                          {normStatus}
                        </span>
                      </td>
                      <td>
                        <div className="audit-col">
                          {tx.approvedBy && (
                            <span className="audit-tag approved">
                              Approved by {tx.approvedBy.name || 'Parent'}
                            </span>
                          )}
                          {tx.rejectedBy && (
                            <span className="audit-tag rejected">
                              Rejected by {tx.rejectedBy.name || 'Parent'}
                            </span>
                          )}
                          {normStatus === 'PENDING' && (
                            <span className="audit-tag pending">
                              Waiting for parent review
                            </span>
                          )}
                          {normStatus === 'BLOCKED' && (
                            <span className="audit-tag blocked">
                              Limit exceeded
                            </span>
                          )}
                          {!tx.approvedBy && !tx.rejectedBy && normStatus === 'COMPLETED' && (
                            <span className="audit-tag direct">
                              Direct Transfer
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-time">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-box">
            <span className="empty-icon">🔍</span>
            <p>No transactions match your current filter.</p>
            {statusFilter !== 'ALL' || searchQuery ? (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
