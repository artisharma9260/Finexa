# Finexa

Finexa is a MERN stack application featuring JWT authentication, role-based access control, Parent-Student account linking, and atomic money transfers with MongoDB transactions.

## Project Structure

```text
Finexa/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection using Mongoose
│   ├── controllers/
│   │   ├── authController.js     # Register, Login, and GetMe handlers
│   │   ├── parentController.js   # Invite, list, unlink students, cancel invites
│   │   ├── accountController.js  # Account balance, transfer, deposit, transactions
│   │   └── healthController.js   # Health check handler
│   ├── middleware/
│   │   └── authMiddleware.js     # authenticateToken & authorizeRole middlewares
│   ├── models/
│   │   ├── User.js               # User model with bcrypt password hashing & parentId
│   │   ├── Account.js            # Account model with balance for each user
│   │   ├── Transaction.js        # Transaction model (from, to, amount, status, approvedBy, createdAt)
│   │   └── Invitation.js         # Pending invitations model
│   ├── routes/
│   │   ├── authRoutes.js         # Auth routes (/register, /login, /me, role routes)
│   │   ├── parentRoutes.js       # Parent routes (/invite, /students, /unlink)
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
│   │   ├── App.jsx               # Auth + Parent Screen + Balance + Money Transfer + Transactions
│   │   ├── App.css               # Clean styling
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
| `POST` | `/api/accounts/transfer` | Protected | Transfer money to another account ID using a MongoDB transaction |
| `POST` | `/api/accounts/deposit` | Protected | Deposit funds into own account (testing top-up) |
| `GET` | `/api/accounts/transactions` | Protected | Returns transaction history for the user's account |

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register user (`name`, `email`, `password`, `role`: `parent` or `student`) |
| `POST` | `/api/auth/login` | Public | Login with `email` and `password`, returns JWT token |
| `GET` | `/api/auth/me` | Protected | Returns authenticated user profile with populated `parentId` and accounts |
| `GET` | `/api/auth/parent-only` | Role: Parent | Accessible only by users with role `parent` |
| `GET` | `/api/auth/student-only` | Role: Student | Accessible only by users with role `student` |

### Parent Management (`/api/parent`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/parent/invite` | Role: Parent | Send invitation to student by email (links existing or creates pending) |
| `GET` | `/api/parent/students` | Role: Parent | Returns only the logged-in parent's linked students & pending invites |
| `POST` | `/api/parent/unlink/:studentId` | Role: Parent | Unlinks a student from this parent |
| `DELETE` | `/api/parent/invite/:inviteId` | Role: Parent | Cancels a pending invitation |

### Health Check (`/api/health`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns API health status |

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
