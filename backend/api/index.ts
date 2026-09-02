// backend/api/index.ts
// Vercel serverless entrypoint. The whole Express app is compiled by
// @vercel/node into a single function; the catch-all rewrite in vercel.json
// sends every path here.
import app from '../public/index';

export default app;
