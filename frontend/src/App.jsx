import { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [token, setToken] = useState(localStorage.getItem('finexa_token') || '');
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [parentAccount, setParentAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Transfer state
  const [transferData, setTransferData] = useState({ toAccountId: '', amount: '' });
  const [transferLoading, setTransferLoading] = useState(false);

  // Parent screen state
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Auth form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });

  // State for testing middleware endpoints
  const [testResult, setTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState('');

  const handleLogout = useCallback(() => {
    localStorage.removeItem('finexa_token');
    setToken('');
    setUser(null);
    setAccount(null);
    setParentAccount(null);
    setTransactions([]);
    setLinkedStudents([]);
    setPendingInvites([]);
    setTestResult(null);
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
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/parent/students', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setLinkedStudents(data.students || []);
        setPendingInvites(data.pendingInvites || []);
      }
    } catch (err) {
      console.error('Failed to fetch linked students', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [token]);

  // Check token on mount or token change
  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
      fetchAccount();
      fetchTransactions();
    } else {
      setUser(null);
    }
  }, [token, fetchUserProfile, fetchAccount, fetchTransactions]);

  // If user is a parent, fetch their linked students
  useEffect(() => {
    if (user && user.role === 'parent') {
      fetchLinkedStudents();
    }
  }, [user, fetchLinkedStudents]);

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
      setMessage({ text: 'Login successful!', type: 'success' });
      setLoginData({ email: '', password: '' });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
      setMessage({ text: 'Account created successfully!', type: 'success' });
      setRegisterData({ name: '', email: '', password: '', role: 'student' });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Money Transfer Action (Protected by MongoDB Transaction)
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.toAccountId || !transferData.amount) return;

    setTransferLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toAccountId: transferData.toAccountId.trim(),
          amount: Number(transferData.amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      setMessage({
        text: `Transfer of $${Number(transferData.amount).toFixed(2)} completed successfully!`,
        type: 'success',
      });

      // Clear input and reload account balances & history
      setTransferData({ toAccountId: '', amount: '' });
      fetchAccount();
      fetchTransactions();
      if (user?.role === 'parent') {
        fetchLinkedStudents();
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setTransferLoading(false);
    }
  };

  // Add mock funds for testing
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
        setMessage({ text: `Added $${amount} to your balance!`, type: 'success' });
        fetchAccount();
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Parent Action: Send invite / Link student
  const handleInviteStudent = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/parent/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send invitation');
      }

      setMessage({ text: data.message, type: 'success' });
      setInviteEmail('');
      fetchLinkedStudents();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setInviteLoading(false);
    }
  };

  // Parent Action: Unlink student
  const handleUnlinkStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to unlink ${studentName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/parent/unlink/${studentId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to unlink student');
      }

      setMessage({ text: data.message, type: 'success' });
      fetchLinkedStudents();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Parent Action: Cancel invite
  const handleCancelInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/parent/invite/${inviteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel invitation');
      }

      setMessage({ text: data.message, type: 'success' });
      fetchLinkedStudents();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  // Test endpoints helper
  const testRoute = async (endpoint, label) => {
    setTestingEndpoint(label);
    setTestResult(null);
    try {
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setTestResult({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data,
      });
    } catch (err) {
      setTestResult({
        status: 500,
        statusText: 'Network Error',
        ok: false,
        data: { message: err.message },
      });
    }
  };

  return (
    <div className="finexa-container">
      <header className="finexa-header">
        <div className="logo-badge">Finexa</div>
        <p className="subtitle">Family & Student Financial Platform</p>
      </header>

      {message.text && (
        <div className={`alert-banner ${message.type}`}>
          {message.text}
          <button
            type="button"
            className="alert-close"
            onClick={() => setMessage({ text: '', type: '' })}
          >
            ×
          </button>
        </div>
      )}

      {token && user ? (
        // Logged-in Dashboard
        <main className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Hello, {user.name}</h2>
              <p className="user-email-sub">{user.email}</p>
            </div>
            <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>
          </div>

          {/* ACCOUNT & BALANCE CARD */}
          <div className="account-balance-card">
            <div className="balance-info">
              <span className="balance-label">Available Balance</span>
              <div className="balance-amount">
                ${account ? account.balance.toFixed(2) : '0.00'}
              </div>
              <div className="account-id-row">
                <span className="id-label">Account ID:</span>
                <code className="account-id-code" title={account?._id}>
                  {account ? account._id : 'Loading...'}
                </code>
              </div>
            </div>
            <div className="balance-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleDeposit(100)}
                title="Deposit $100 for testing transfers"
              >
                + Add $100
              </button>
            </div>
          </div>

          {/* MONEY TRANSFER CARD */}
          <div className="section-card transfer-card">
            <div className="section-header-row">
              <h3>Transfer Money</h3>
              <span className="tx-secure-tag">MongoDB Transaction Safe</span>
            </div>
            <p className="section-desc">
              Send money directly to any account ID. Both balances update atomically.
            </p>

            {/* Quick target chips */}
            {user.role === 'parent' && linkedStudents.length > 0 && (
              <div className="quick-transfer-chips">
                <span className="chip-label">Quick select student:</span>
                {linkedStudents.map((st) => (
                  <button
                    key={st._id}
                    type="button"
                    className="chip-btn"
                    onClick={() =>
                      setTransferData({
                        ...transferData,
                        toAccountId: st.account?.id || '',
                      })
                    }
                  >
                    {st.name} (${st.account?.balance?.toFixed(2) || '0.00'})
                  </button>
                ))}
              </div>
            )}

            {user.role === 'student' && parentAccount && (
              <div className="quick-transfer-chips">
                <span className="chip-label">Quick select parent:</span>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    setTransferData({
                      ...transferData,
                      toAccountId: parentAccount.id,
                    })
                  }
                >
                  {user.parentId?.name} (${parentAccount.balance?.toFixed(2) || '0.00'})
                </button>
              </div>
            )}

            <form onSubmit={handleTransfer} className="transfer-form">
              <div className="form-group">
                <label htmlFor="to-acc-id">Recipient Account ID</label>
                <input
                  id="to-acc-id"
                  type="text"
                  placeholder="e.g. 6ac77ea0ef645ab8b633cce8"
                  value={transferData.toAccountId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      toAccountId: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="transfer-amt">Amount ($)</label>
                <input
                  id="transfer-amt"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="50.00"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      amount: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={transferLoading}
              >
                {transferLoading ? 'Processing Transfer...' : 'Send Money'}
              </button>
            </form>
          </div>

          {/* PARENT SPECIFIC VIEW: INVITE & LINKED STUDENTS */}
          {user.role === 'parent' ? (
            <div className="parent-screen-section">
              <div className="section-card invite-card">
                <h3>Invite & Link Student</h3>
                <p className="section-desc">
                  Invite your student by email. Existing student accounts link
                  immediately; new ones will link automatically upon sign up.
                </p>

                <form onSubmit={handleInviteStudent} className="invite-form">
                  <div className="invite-input-row">
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-invite"
                      disabled={inviteLoading}
                    >
                      {inviteLoading ? 'Sending...' : 'Send Invite'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Linked Students List */}
              <div className="section-card">
                <div className="section-header-row">
                  <h3>Your Linked Students</h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={fetchLinkedStudents}
                    disabled={loadingStudents}
                  >
                    Refresh
                  </button>
                </div>

                {loadingStudents ? (
                  <p className="muted-text">Loading students...</p>
                ) : linkedStudents.length > 0 ? (
                  <div className="student-list">
                    {linkedStudents.map((student) => (
                      <div key={student._id || student.id} className="student-item">
                        <div className="student-info">
                          <span className="student-name">{student.name}</span>
                          <span className="student-email">{student.email}</span>
                          <span className="student-account-tag">
                            Acc: {student.account?.id} • Balance: $
                            {student.account?.balance?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="student-item-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() =>
                              setTransferData({
                                ...transferData,
                                toAccountId: student.account?.id || '',
                              })
                            }
                          >
                            Transfer
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger-outline"
                            onClick={() =>
                              handleUnlinkStudent(student._id || student.id, student.name)
                            }
                          >
                            Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No students linked to your account yet.</p>
                    <p className="empty-sub">
                      Use the form above to invite and connect your student.
                    </p>
                  </div>
                )}
              </div>

              {/* Pending Invites List */}
              {pendingInvites.length > 0 && (
                <div className="section-card">
                  <h3>Pending Invitations</h3>
                  <p className="section-desc">
                    These students haven&apos;t registered yet. Accounts will link when
                    they sign up.
                  </p>
                  <div className="student-list">
                    {pendingInvites.map((invite) => (
                      <div key={invite._id} className="student-item pending-item">
                        <div className="student-info">
                          <span className="student-email">{invite.studentEmail}</span>
                          <span className="pending-badge">Pending Registration</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger-outline"
                          onClick={() => handleCancelInvite(invite._id)}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // STUDENT SPECIFIC VIEW
            <div className="student-screen-section">
              <div className="section-card">
                <h3>Parent Connection</h3>
                {user.parentId ? (
                  <div className="linked-parent-box">
                    <span className="badge-connected">Connected</span>
                    <p>
                      <strong>Linked Parent:</strong> {user.parentId.name} (
                      {user.parentId.email})
                    </p>
                    {parentAccount && (
                      <p className="parent-acc-detail">
                        Parent Account ID: <code>{parentAccount.id}</code>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Not linked to a parent account yet.</p>
                    <p className="empty-sub">
                      Your parent can link you by sending an invite to your email:
                      <br />
                      <strong>{user.email}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RECENT TRANSACTIONS HISTORY */}
          <div className="section-card">
            <div className="section-header-row">
              <h3>Recent Transfers</h3>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={fetchTransactions}
              >
                Refresh
              </button>
            </div>

            {transactions.length > 0 ? (
              <div className="transaction-list">
                {transactions.map((tx) => {
                  const isSender =
                    (tx.from?._id || tx.from) === (account?._id || account?.id);
                  return (
                    <div key={tx._id} className="tx-item">
                      <div className="tx-main">
                        <span
                          className={`tx-type-badge ${isSender ? 'sent' : 'received'}`}
                        >
                          {isSender ? 'SENT' : 'RECEIVED'}
                        </span>
                        <div className="tx-details">
                          <span className="tx-counterparty">
                            {isSender
                              ? `To: ${tx.to?.userId?.name || 'Account ' + (tx.to?._id || tx.to)}`
                              : `From: ${tx.from?.userId?.name || 'Account ' + (tx.from?._id || tx.from)}`}
                          </span>
                          <span className="tx-time">
                            {new Date(tx.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="tx-amount-col">
                        <span className={`tx-amount ${isSender ? 'minus' : 'plus'}`}>
                          {isSender ? '-' : '+'}${tx.amount.toFixed(2)}
                        </span>
                        <span className="tx-status-badge">{tx.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No transfers yet.</p>
                <p className="empty-sub">
                  Transfers sent or received will appear here with full transaction
                  records.
                </p>
              </div>
            )}
          </div>

          {/* Middleware Tester */}
          <div className="middleware-tester">
            <h3>Test Middleware & Endpoints</h3>
            <div className="button-group">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  testRoute('/api/accounts/my-account', 'Account Check (/my-account)')
                }
              >
                Test /my-account
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  testRoute('/api/parent/students', 'Parent Students Route')
                }
              >
                Test /parent/students
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => testRoute('/api/auth/student-only', 'Student Only Route')}
              >
                Test /auth/student-only
              </button>
            </div>

            {testResult && (
              <div className={`result-box ${testResult.ok ? 'success' : 'forbidden'}`}>
                <div className="result-header">
                  <strong>{testingEndpoint}</strong>
                  <span className="status-badge">
                    HTTP {testResult.status} ({testResult.statusText})
                  </span>
                </div>
                <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="actions">
            <button type="button" className="btn btn-danger" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </main>
      ) : (
        // Auth Forms (Login / Register)
        <main className="auth-box">
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setMessage({ text: '', type: '' });
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setMessage({ text: '', type: '' });
              }}
            >
              Register
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="form-card">
              <h2>Welcome to Finexa</h2>
              <p className="form-subtitle">Enter your credentials to access your account</p>

              <div className="form-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form-card">
              <h2>Create an Account</h2>
              <p className="form-subtitle">Register as a Parent or Student</p>

              <div className="form-group">
                <label htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Jane Doe"
                  required
                  value={registerData.name}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, password: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-role">I am a:</label>
                <select
                  id="reg-role"
                  value={registerData.role}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, role: e.target.value })
                  }
                >
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
