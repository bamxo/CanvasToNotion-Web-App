// src/server.ts - Main application file
import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import databaseRoutes from './routes/database';
import userRoutes from './routes/users';
import notionRouter from './notion_api/notionRouter';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notion', notionRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- /api/auth/*');
  console.log('- /api/database/*');
  console.log('- /api/users/*');
  console.log('- /api/notion/*');
});

export default app;
