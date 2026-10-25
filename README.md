# Finexa

Finexa is a MERN stack application featuring JWT authentication, role-based access control, Parent-Student account linking, atomic money transfers, and **per-student spending limits** enforced at the API level.

## Project Structure

```text
Finexa/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection using Mongoose
│   ├── controllers/
│   │   ├── authController.js     # Register, Login, and GetMe handlers
│   │   ├── parentController.js   # Invite, list, unlink students, set/get limits
│   │   ├── accountController.js  # Account balance, transfer (with limit enforcement), deposit, transactions
│   │   └── healthController.js   # Health check handler
│   ├── middleware/
│   │   └── authMiddleware.js     # authenticateToken & authorizeRole middlewares
│   ├── models/
│   │   ├── User.js               # User model with bcrypt password hashing & parentId
│   │   ├── Account.js            # Account model with balance for each user
│   │   ├── Transaction.js        # Transaction model (from, to, amount, status, approvedBy, createdAt)
│   │   ├── Invitation.js         # Pending invitations model
│   │   └── Limit.js              # Per-student spending limits (dailyLimit, monthlyLimit, approvalAbove)
│   ├── routes/
│   │   ├── authRoutes.js         # Auth routes (/register, /login, /me, role routes)
│   │   ├── parentRoutes.js       # Parent routes (/invite, /students, /unlink, /limits/:studentId)
│   │   ├── accountRoutes.js      # Account routes (/my-account, /transfer, /deposit, /transactions)
│   │   └── healthRoutes.js       # Health route (/api/health)
│   ├── utils/
│   │   └── generateToken.js      # JWT generation utility
│   ├── .env                      # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   ├── .env.example              # Environment variables template
│   ├── package.json
│   └── server.js                 # Backend entry point
├── frontend/                     # React + Vite application
│   ├── src/
│   │   ├── App.jsx               # Auth + Parent/Student dashboards, balance, transfers, limits UI
│   │   ├── App.css               # Clean styling including progress-bar limit cards
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js            # Vite config with API proxy
└── README.md
```

## API Endpoints

### Accounts & Money Transfer (`/api/accounts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/accounts/my-account` | Protected | Returns the logged-in user's account details and balance |
| `POST` | `/api/accounts/transfer` | Protected | Transfer money — checks student daily/monthly limits before executing |
| `POST` | `/api/accounts/deposit` | Protected | Deposit funds into own account (testing top-up) |
| `GET` | `/api/accounts/transactions` | Protected | Returns transaction history for the user's account |

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register user (`name`, `email`, `password`, `role`: `parent` or `student`) |
| `POST` | `/api/auth/login` | Public | Login with `email` and `password`, returns JWT token |
| `GET` | `/api/auth/me` | Protected | Returns user profile, account, and (for students) `limit` + `spentStats` |
| `GET` | `/api/auth/parent-only` | Role: Parent | Accessible only by users with role `parent` |
| `GET` | `/api/auth/student-only` | Role: Student | Accessible only by users with role `student` |

### Parent Management (`/api/parent`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/parent/invite` | Role: Parent | Send invitation to student by email (links existing or creates pending) |
| `GET` | `/api/parent/students` | Role: Parent | Returns linked students (with account + limit details) & pending invites |
| `POST` | `/api/parent/unlink/:studentId` | Role: Parent | Unlinks a student from this parent |
| `DELETE` | `/api/parent/invite/:inviteId` | Role: Parent | Cancels a pending invitation |
| `GET` | `/api/parent/limits/:studentId` | Role: Parent | Get current spending limits for a linked student |
| `POST` | `/api/parent/limits/:studentId` | Role: Parent | Set/update spending limits (`dailyLimit`, `monthlyLimit`, `approvalAbove`) |

### Health Check (`/api/health`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns API health status |

## Spending Limits

Parents can set per-student limits via `POST /api/parent/limits/:studentId`. When a student makes a transfer:

1. If `dailySpent + amount > dailyLimit` → blocked (HTTP 403), saved as `status: 'Blocked'`
2. If `monthlySpent + amount > monthlyLimit` → blocked (HTTP 403), saved as `status: 'Blocked'`
3. Otherwise → transfer executes atomically

The student dashboard shows a **Spending Limits** card with animated progress bars for daily and monthly usage. The parent dashboard shows each student's current limits inline with a collapsible **Set Limits** form.

## Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server runs on `http://127.0.0.1:5000`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173`.
All requests to `/api` are automatically proxied to the backend at `http://127.0.0.1:5000`.

