export default function AuthView({
  activeTab,
  setActiveTab,
  loginData,
  setLoginData,
  registerData,
  setRegisterData,
  onLogin,
  onRegister,
  loading,
}) {
  return (
    <div className="auth-box">
      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          Create Account
        </button>
      </div>

      {activeTab === 'login' ? (
        <form onSubmit={onLogin} className="auth-form">
          <div className="auth-header-text">
            <h2>Welcome to Finexa</h2>
            <p className="form-subtitle">Enter your credentials to access your account</p>
          </div>

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
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={onRegister} className="auth-form">
          <div className="auth-header-text">
            <h2>Join Finexa</h2>
            <p className="form-subtitle">Register as a Student or Parent</p>
          </div>

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
            <label htmlFor="reg-role">Account Type</label>
            <select
              id="reg-role"
              value={registerData.role}
              onChange={(e) =>
                setRegisterData({ ...registerData, role: e.target.value })
              }
            >
              <option value="student">Student Account</option>
              <option value="parent">Parent Account</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
      )}
    </div>
  );
}
