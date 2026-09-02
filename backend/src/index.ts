// src/index.ts - Express application (target Vercel backend)
//
// Deployed to Vercel as a zero-config Express app. Vercel auto-detects this
// file (`src/index.ts`) as the serverless entry, runs the whole Express app
// as a single function, and routes every request to the exported `default`
// app. No `api/` directory, no catch-all rewrite (see backend/vercel.json).
import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import databaseRoutes from './routes/database';
import userRoutes from './routes/users';
import notionRouter from './notion_api/notionRouter';
import cookieStateRoutes from './routes/cookieState';
import contactRoutes from './routes/contact';
import usercountRoutes from './routes/usercount';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://canvastonotion.io',
  'https://canvastonotion.netlify.app',
  'https://api.canvastonotion.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser / same-origin requests (no Origin header).
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cookieParser());
// Global JSON body parser. It is a no-op for non-JSON content types, so the
// contact router's multipart uploads (handled by multer on that router) are
// unaffected.
app.use(express.json());

// Request logging - disabled in production to keep function logs quiet.
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
function mountRoutes(prefix: string): void {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/db`, databaseRoutes);
  app.use(`${prefix}/notion`, notionRouter);
  app.use(`${prefix}/cookie-state`, cookieStateRoutes);
  app.use(`${prefix}/contact`, contactRoutes);
  app.use(`${prefix}/usercount`, usercountRoutes);
}

// Primary mount points.
mountRoutes('');
// Compatibility aliases - some older config / clients use the /api/ prefix.
mountRoutes('/api');

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Local server - never runs on Vercel (or under the test runner).
// ---------------------------------------------------------------------------
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
export default app;
