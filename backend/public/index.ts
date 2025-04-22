// src/server.ts - Main application file
import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import databaseRoutes from './routes/database';
import userRoutes from './routes/users';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use(express.static('public'));
app.use('/api/auth', authRoutes);
app.use('/api/db', databaseRoutes);
app.use('/api/user', userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.use(cors({
  origin: 'http://localhost:3000', // or whatever port your frontend uses
  credentials: true
}));
export default app;