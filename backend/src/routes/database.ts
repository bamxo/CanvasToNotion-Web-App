// src/routes/database.ts - Database operation routes
import express from 'express';
import * as databaseController from '../controllers/databaseControllers';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Database routes - all require authentication
router.put('/:path', verifyToken, databaseController.updateData);
router.get('/:path', verifyToken, databaseController.readData);
router.delete('/:path', verifyToken, databaseController.deleteData);

export default router;
