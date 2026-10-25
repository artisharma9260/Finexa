# Finexa — Family & Student Financial Platform

Finexa is a full-stack MERN financial platform designed to teach financial responsibility to students under parental supervision. It provides role-based accounts (Parent and Student), account linking, atomic money transfers, customizable spending limits, a multi-tier transfer approval workflow, and in-app notifications.

---

## Tech Stack

- **Backend**: Node.js (ES modules), Express 5, MongoDB, Mongoose 9, JSON Web Tokens (JWT), bcryptjs, Dotenv, CORS
- **Frontend**: React 19, Vite 8, Modern CSS (Responsive Grid, Custom Components)
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert`)
- **Database**: MongoDB (supports both standalone installations and replica-set deployments with atomic transactions)

---

## Features

### 1. Authentication & Role-Based Access Control
- Secure user registration and login with bcrypt password hashing (salt rounds: 10).
- Stateless authentication using JWT tokens (7-day expiration).
- Protected endpoints guarded by `authenticateToken` and `authorizeRole('parent' | 'student')` middleware.
- Dedicated dashboards rendered automatically based on user role.

### 2. Parent-Student Account Linking
- Parents can invite students by email (`POST /api/parent/invite`).
- If the student is already registered, accounts link immediately.
- If the student is new, a pending invitation is stored; upon registration, the student account automatically links to the parent.
- Parents can review all linked students, see pending invites, and cancel or unlink connections at any time.

### 3. Accounts & Money Transfers
- An `Account` is automatically provisioned for every registered user with a starter balance.
- Atomic balance transfers between any two accounts.
- Standalone MongoDB compatibility: gracefully executes transfers using atomic conditional operators (`findOneAndUpdate` with `{ balance: { $gte: amount } }`) when replica-set sessions are unavailable.
- Prevents transfers to self, transfers with zero or negative amounts, and transfers exceeding available balance.

### 4. Per-Student Spending Limits
- Parents can configure limits per student via `POST /api/parent/limits/:studentId`:
  - **`dailyLimit`**: Maximum total dollar amount the student can spend in a single day.
  - **`monthlyLimit`**: Maximum total dollar amount the student can spend in the current calendar month.
  - **`approvalAbove`**: Threshold above which transfers require parent approval.
- Before executing a student transfer, the system calculates current day and month completed spending:
  - If the transfer exceeds either limit, the transfer is blocked (HTTP 403), balances are untouched, and a transaction is recorded with `status: 'Blocked'`.

### 5. Transfer Approval Workflow
- When a student submits a transfer with an amount exceeding `approvalAbove`:
  - The transfer is saved with `status: 'pending'` (HTTP 202 Accepted).
  - **No funds are debited or credited** at request time.
  - An in-app notification is created for the parent.
- Parents review requests in an **Approval Queue**:
  - **Approve (`POST /api/parent/approvals/:txId/approve`)**: Balances are updated atomically, transaction status changes to `completed`, and `approvedBy` records the parent ID.
  - **Reject (`POST /api/parent/approvals/:txId/reject`)**: Transaction status changes to `Rejected`, `rejectedBy` records the parent ID, and no money leaves the student account.

### 6. In-App Notifications
- Stored in a dedicated `Notification` model with read/unread tracking.
- Parents are automatically notified when a student submits a transfer that needs approval.
- Students are automatically notified when their transfer is approved or rejected by the parent.
- Both dashboards feature an In-App Notifications card with unread counters, type icons, and a "Mark Read" action.
- The navigation bar displays unread notification badges.

### 7. Dual React Dashboards
- **Student Dashboard**:
  - Available balance hero card with quick test-deposit button.
  - **Remaining Daily Limit** card with visual progress bar, used/remaining stats, and approval threshold notice.
  - **Pending Requests** table displaying transfers waiting for parental review.
  - Recent transactions list with direct link to the full ledger.
  - Connected parent info card.
  - In-app notification center.
  - Collapsible transfer form with recipient quick-select.
- **Parent Dashboard**:
  - Parent balance and family overview statistics (linked students count, pending approvals count).
  - **Approval Queue** displaying student name, recipient, amount, request time, and one-click **✓ Approve** and **✕ Reject** buttons.
  - **Form to Set Limits** with student picker, inputs for daily, monthly, and approval limits, and instant update feedback.
  - **Linked Students Grid** showing each student's balance, active limits, and options to configure or unlink.
  - Student invitation form with pending invitations management.
  - In-app notification center.
- **Transaction History Page**:
  - Comprehensive ledger showing every transaction.
  - Filter tabs: **All**, **Completed**, **Pending**, **Blocked**, and **Rejected** with live counters.
  - Live search by counterparty name, email, account ID, or amount.
  - Audit trail displaying approver or rejecter details.

---

## Project Structure

```text
Finexa/
├── backend/
│   ├── config/
│   │   └── db.js                     # MongoDB connection via Mongoose
│   ├── controllers/
│   │   ├── authController.js         # Register, Login, and GetMe profile handlers
│   │   ├── parentController.js       # Invite, list, unlink students, limits, approve/reject
│   │   ├── accountController.js      # Account balance, transfer with limit check, deposit, transactions
│   │   ├── notificationController.js # Notification retrieval and mark-read handlers
│   │   └── healthController.js       # Health check handler
│   ├── middleware/
│   │   └── authMiddleware.js         # authenticateToken & authorizeRole guards
│   ├── models/
│   │   ├── User.js                   # User model (name, email, password, role, parentId)
│   │   ├── Account.js                # Account model (userId, balance)
│   │   ├── Limit.js                  # Spending limits (studentId, parentId, dailyLimit, monthlyLimit, approvalAbove)
│   │   ├── Transaction.js            # Transactions (from, to, amount, status, approvedBy, rejectedBy)
│   │   ├── Notification.js           # In-app notifications (userId, message, type, read, transactionId)
│   │   └── Invitation.js             # Pending student invitations
│   ├── routes/
│   │   ├── authRoutes.js             # /api/auth routes
│   │   ├── parentRoutes.js           # /api/parent routes
│   │   ├── accountRoutes.js          # /api/accounts routes
│   │   ├── notificationRoutes.js     # /api/notifications routes
│   │   └── healthRoutes.js           # /api/health route
│   ├── tests/
│   │   ├── limits.test.js            # Tests for daily/monthly limits and blocking
│   │   └── approvals.test.js         # Tests for approval threshold, approval, rejection, notifications
│   ├── utils/
│   │   └── generateToken.js          # JWT signing utility
│   ├── .env                          # Environment variables
│   ├── package.json
│   └── server.js                     # Express app configuration and entry point
├── frontend/                         # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation, role pill, view switcher, notification badges
│   │   │   ├── StudentDashboard.jsx  # Student balance, remaining limit, pending requests, recent transfers
│   │   │   ├── ParentDashboard.jsx   # Parent balance, approval queue, limit form, linked students
│   │   │   ├── NotificationList.jsx  # Reusable in-app notification center
│   │   │   ├── TransactionHistory.jsx# Transaction history with status filters (Completed, Pending, Blocked, Rejected)
│   │   │   └── AuthView.jsx          # Sign In & Registration forms
│   │   ├── App.jsx                   # Root application state & API coordination
│   │   ├── App.css                   # Responsive CSS styling
│   │   └── main.jsx                  # React DOM root
│   ├── index.html
│   ├── package.json
│   └── vite.config.js                # Vite configuration with API proxy to port 5000
└── README.md
```

---

## Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher; v20+ recommended)
- [MongoDB](https://www.mongodb.com/) running locally on port `27017` (or a remote MongoDB Atlas connection URI)

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/finexa
   JWT_SECRET=finexa_super_secret_jwt_key_2026_secure
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://127.0.0.1:5000`.

5. Run automated tests:
   ```bash
   npm test
   ```

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:5173`.
   All `/api` requests are automatically proxied to `http://127.0.0.1:5000`.

4. Build for production:
   ```bash
   npm run build
   ```

---

## API Endpoints Reference

### Health Check (`/api/health`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns API health status |

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user (`name`, `email`, `password`, `role`: `'parent'` or `'student'`) |
| `POST` | `/api/auth/login` | Public | Login with `email` and `password`, returns JWT token and user profile |
| `GET` | `/api/auth/me` | Protected | Returns user profile, account, and (for students) active `limit` and `spentStats` |
| `GET` | `/api/auth/parent-only` | Role: Parent | Protected route verifying parent role |
| `GET` | `/api/auth/student-only` | Role: Student | Protected route verifying student role |

### Parent Management & Approvals (`/api/parent`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/parent/invite` | Role: Parent | Invite a student by email (links existing student or records pending invite) |
| `GET` | `/api/parent/students` | Role: Parent | Returns linked students (with balances and active limits) & pending invites |
| `POST` | `/api/parent/unlink/:studentId` | Role: Parent | Unlinks a student from the authenticated parent |
| `DELETE` | `/api/parent/invite/:inviteId` | Role: Parent | Cancels a pending invitation |
| `GET` | `/api/parent/limits/:studentId` | Role: Parent | Retrieves spending limits for a linked student |
| `POST` | `/api/parent/limits/:studentId` | Role: Parent | Sets or updates `dailyLimit`, `monthlyLimit`, and `approvalAbove` |
| `GET` | `/api/parent/approvals` | Role: Parent | Lists all pending transfer requests submitted by linked students |
| `POST` | `/api/parent/approvals/:txId/approve` | Role: Parent | Approves transfer: moves money atomically, sets status `completed` & `approvedBy` |
| `POST` | `/api/parent/approvals/:txId/reject` | Role: Parent | Rejects transfer: sets status `Rejected` & `rejectedBy`, moves no funds |

### Accounts & Money Transfers (`/api/accounts`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/accounts/my-account` | Protected | Returns the logged-in user's account details and balance |
| `POST` | `/api/accounts/transfer` | Protected | Transfer money to another account ID. Enforces daily/monthly limits and approval threshold |
| `POST` | `/api/accounts/deposit` | Protected | Top up funds in own account (useful for testing) |
| `GET` | `/api/accounts/transactions` | Protected | Returns transaction history for the user's account |

### In-App Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Protected | Returns in-app notifications for the authenticated user and unread count |
| `PATCH` | `/api/notifications/:id/read` | Protected | Marks a single notification as read |
| `POST` | `/api/notifications/mark-all-read` | Protected | Marks all notifications for the authenticated user as read |

---

## Testing

The project includes integration tests using Node.js's native test runner (`node:test` and `node:assert`):

```bash
cd backend
npm test
```

### Test Coverage
- **[`limits.test.js`](file:///c:/Users/ashmi/OneDrive/Desktop/Finexa/backend/tests/limits.test.js)**:
  1. Parent sets student spending limits (`dailyLimit`, `monthlyLimit`, `approvalAbove`).
  2. Student transfer within limits succeeds immediately.
  3. Student transfer exceeding daily limit is blocked with HTTP 403, recorded as `Blocked`, balance untouched.
  4. Parent raises daily limit, and the same transfer subsequently succeeds.
  5. Student transfer exceeding monthly limit is blocked with HTTP 403, balance untouched.
- **[`approvals.test.js`](file:///c:/Users/ashmi/OneDrive/Desktop/Finexa/backend/tests/approvals.test.js)**:
  1. Student transfer above `approvalAbove` returns HTTP 202 Accepted, status `pending`, no funds moved.
  2. Parent receives in-app notification of the pending request.
  3. Parent retrieves the pending request from `GET /api/parent/approvals`.
  4. Parent approves the transfer: funds move atomically, status set to `completed`, `approvedBy` recorded, student receives approval notification.
  5. Cannot re-approve an already completed transaction (HTTP 400).
  6. Parent rejects a pending transfer: status set to `Rejected`, `rejectedBy` recorded, no funds moved, student receives rejection notification.
