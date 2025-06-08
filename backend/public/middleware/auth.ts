// src/middleware/auth.ts - Token verification middleware
import { Response, NextFunction } from 'express';
import axios from 'axios';
import firebaseConfig from '../config/firebase';
import { AuthenticatedRequest, FirebaseUser } from '../types';

export const verifyToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // First check for a session cookie
    const sessionCookie = req.cookies?.sessionid;
    
    // Then check for Authorization header as fallback
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.split('Bearer ')[1];
    
    // Use cookie token if available, otherwise use header token
    const idToken = sessionCookie || headerToken;
    
    if (!idToken) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }
    
    const response = await axios.post<{ users: FirebaseUser[] }>(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      { idToken }
    );
    
    if (response.data && response.data.users && response.data.users.length > 0) {
      req.user = response.data.users[0];
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
