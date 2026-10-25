import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

let serverInstance = null;
if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { serverInstance };
export default app;
