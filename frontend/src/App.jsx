import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StudentDashboard from './components/StudentDashboard';
import ParentDashboard from './components/ParentDashboard';
import TransactionHistory from './components/TransactionHistory';
import AuthView from './components/AuthView';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'transactions'
  const [token, setToken] = useState(localStorage.getItem('finexa_token') || '');
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [parentAccount, setParentAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Student specific state
  const [limit, setLimit] = useState(null);
  const [spentStats, setSpentStats] = useState(null);

  // Parent specific state
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [approvals, setApprovals] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  // Auth form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const handleLogout = useCallback(() => {
    localStorage.removeItem('finexa_token');
    setToken('');
    setUser(null);
    setAccount(null);
    setParentAccount(null);
    setTransactions([]);
    setLinkedStudents([]);
    setPendingInvites([]);
    setApprovals([]);
    setNotifications([]);
    setLimit(null);
    setSpentStats(null);
    setActiveView('dashboard');
    setMessage({ text: 'Logged out successfully', type: 'success' });
  }, []);

  const fetchUserProfile = useCallback(
    async (authToken) => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          if (data.account) setAccount(data.account);
          if (data.parentAccount) setParentAccount(data.parentAccount);
          if (data.limit) setLimit(data.limit);
          if (data.spentStats) setSpentStats(data.spentStats);
        } else {
          handleLogout();
          setMessage({ text: 'Session expired. Please log in again.', type: 'error' });
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    },
    [handleLogout]
  );

  const fetchAccount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/accounts/my-account', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAccount(data.account);
      }
    } catch (err) {
      console.error('Failed to fetch account', err);
    }
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/accounts/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  }, [token]);

  const fetchLinkedStudents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/parent/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLinkedStudents(data.students || []);
        setPendingInvites(data.pendingInvites || []);
      }
    } catch (err) {
      console.error('Failed to fetch linked students', err);
    }
  }, [token]);

  const fetchApprovals = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/parent/approvals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setApprovals(data.approvals || []);
      }
    } catch (err) {
      console.error('Failed to fetch approvals', err);
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [token]);

  const handleMarkNotificationRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  // Check token on mount or token change
  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
      fetchAccount();
      fetchTransactions();
      fetchNotifications();
    } else {
      setUser(null);
    }
  }, [token, fetchUserProfile, fetchAccount, fetchTransactions, fetchNotifications]);

  // If user is a parent, fetch their linked students and approval queue
  useEffect(() => {
    if (user && user.role === 'parent') {
      fetchLinkedStudents();
      fetchApprovals();
    }
  }, [user, fetchLinkedStudents, fetchApprovals]);

  // Auth: Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('finexa_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setMessage({ text: `Welcome back, ${data.user.name}!`, type: 'success' });
      setLoginData({ email: '', password: '' });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Auth: Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('finexa_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setMessage({ text: `Welcome to Finexa, ${data.user.name}!`, type: 'success' });
      setRegisterData({ name: '', email: '', password: '', role: 'student' });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Action: Transfer Money
  const handleTransfer = async (toAccountId, amount) => {
    setTransferLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toAccountId, amount }),
      });

      const data = await res.json();

      if (res.status === 202) {
        // Pending approval
        setMessage({
          text: data.message,
          type: 'info',
        });
        fetchTransactions();
        fetchNotifications();
        return true;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      setMessage({
        text: `Transfer of $${amount.toFixed(2)} completed successfully!`,
        type: 'success',
      });

      fetchAccount();
      fetchTransactions();
      fetchUserProfile(token);
      fetchNotifications();
      if (user?.role === 'parent') {
        fetchLinkedStudents();
      }
      return true;
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
      return false;
    } finally {
      setTransferLoading(false);
    }
  };

  // Action: Deposit Mock Funds
  const handleDeposit = async (amount) => {
    try {
      const res = await fetch('/api/accounts/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Added $${amount.toFixed(2)} to your balance!`, type: 'success' });
        fetchAccount();
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Action: Parent Approves Transfer
  const handleApprove = async (txId) => {
    try {
      const res = await fetch(`/api/parent/approvals/${txId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');
      setMessage({ text: data.message, type: 'success' });
      fetchApprovals();
      fetchLinkedStudents();
      fetchAccount();
      fetchTransactions();
      fetchNotifications();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Action: Parent Rejects Transfer
  const handleReject = async (txId) => {
    try {
      const res = await fetch(`/api/parent/approvals/${txId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');
      setMessage({ text: data.message, type: 'success' });
      fetchApprovals();
      fetchTransactions();
      fetchNotifications();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Action: Parent Sets Limits
  const handleSetLimits = async (studentId, limits) => {
    try {
      const res = await fetch(`/api/parent/limits/${studentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(limits),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set limits');
      setMessage({ text: data.message || 'Limits updated successfully', type: 'success' });
      fetchLinkedStudents();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Action: Parent Invites Student
  const handleInviteStudent = async (email) => {
    try {
      const res = await fetch('/api/parent/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send invite');
      setMessage({ text: data.message, type: 'success' });
      fetchLinkedStudents();
      return true;
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
      return false;
    }
  };

  // Action: Parent Unlinks Student
  const handleUnlinkStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to unlink ${studentName}?`)) return;
    try {
      const res = await fetch(`/api/parent/unlink/${studentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to unlink student');
      setMessage({ text: data.message, type: 'success' });
      fetchLinkedStudents();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Action: Parent Cancels Invite
  const handleCancelInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/parent/invite/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel invitation');
      setMessage({ text: data.message, type: 'success' });
      fetchLinkedStudents();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Student's pending count (requests waiting for parent approval)
  const studentPendingCount = transactions.filter((tx) => {
    const isSender = (tx.from?._id || tx.from) === (account?._id || account?.id);
    return isSender && tx.status === 'pending';
  }).length;

  return (
    <div className="finexa-app">
      {token && user ? (
        <>
          <Navbar
            user={user}
            activeView={activeView}
            setActiveView={setActiveView}
            onLogout={handleLogout}
            approvalsCount={approvals.length}
            pendingCount={studentPendingCount}
            unreadNotifsCount={notifications.filter((n) => !n.read).length}
          />

          <div className="main-wrapper">
            {message.text && (
              <div className={`alert-banner ${message.type}`}>
                <span>{message.text}</span>
                <button
                  type="button"
                  className="alert-close"
                  onClick={() => setMessage({ text: '', type: '' })}
                >
                  ×
                </button>
              </div>
            )}

            {activeView === 'transactions' ? (
              <TransactionHistory
                transactions={transactions}
                currentAccountId={account?._id || account?.id}
                onRefresh={fetchTransactions}
                onBackToDashboard={() => setActiveView('dashboard')}
              />
            ) : user.role === 'parent' ? (
              <ParentDashboard
                user={user}
                account={account}
                linkedStudents={linkedStudents}
                approvals={approvals}
                pendingInvites={pendingInvites}
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationRead}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
                onRefreshNotifications={fetchNotifications}
                onApprove={handleApprove}
                onReject={handleReject}
                onSetLimits={handleSetLimits}
                onInvite={handleInviteStudent}
                onUnlink={handleUnlinkStudent}
                onCancelInvite={handleCancelInvite}
                onTransfer={handleTransfer}
                onDeposit={handleDeposit}
                onRefreshApprovals={fetchApprovals}
                onRefreshStudents={fetchLinkedStudents}
                transferLoading={transferLoading}
              />
            ) : (
              <StudentDashboard
                user={user}
                account={account}
                parentAccount={parentAccount}
                limit={limit}
                spentStats={spentStats}
                transactions={transactions}
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationRead}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
                onRefreshNotifications={fetchNotifications}
                onTransfer={handleTransfer}
                onDeposit={handleDeposit}
                onViewAllTransactions={() => setActiveView('transactions')}
                transferLoading={transferLoading}
              />
            )}
          </div>
        </>
      ) : (
        <div className="auth-container">
          <div className="auth-brand">
            <span className="auth-logo">Finexa</span>
            <p className="auth-subtitle">Family & Student Financial Platform</p>
          </div>

          {message.text && (
            <div className={`alert-banner ${message.type}`}>
              <span>{message.text}</span>
              <button
                type="button"
                className="alert-close"
                onClick={() => setMessage({ text: '', type: '' })}
              >
                ×
              </button>
            </div>
          )}

          <AuthView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loginData={loginData}
            setLoginData={setLoginData}
            registerData={registerData}
            setRegisterData={setRegisterData}
            onLogin={handleLogin}
            onRegister={handleRegister}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}

export default App;
