// src/controllers/databaseController.ts - Database operation handlers
import { Response } from 'express';
import axios from 'axios';
import firebaseConfig from '../config/firebase';
import { AuthenticatedRequest, DatabasePathParams } from '../types';

// Create/Update data
export const updateData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { path } = req.params as DatabasePathParams;
    const data = req.body;
    
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    
    // Sanitize path to prevent directory traversal
    const sanitizedPath = path.replace(/\./g, '/');
    
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!authToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const response = await axios.put(
      `${firebaseConfig.databaseURL}/${sanitizedPath}.json?auth=${authToken}`,
      data
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Database write error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error || 'Failed to write data' : 
        'Failed to write data'
    });
  }
};

// Read data
export const readData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { path } = req.params as DatabasePathParams;
    
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    
    // Sanitize path to prevent directory traversal
    const sanitizedPath = path.replace(/\./g, '/');
    
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!authToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const response = await axios.get(
      `${firebaseConfig.databaseURL}/${sanitizedPath}.json?auth=${authToken}`
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Database read error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error || 'Failed to read data' : 
        'Failed to read data'
    });
  }
};

// Delete data
export const deleteData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { path } = req.params as DatabasePathParams;
    
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }
    
    // Sanitize path to prevent directory traversal
    const sanitizedPath = path.replace(/\./g, '/');
    
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!authToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    await axios.delete(
      `${firebaseConfig.databaseURL}/${sanitizedPath}.json?auth=${authToken}`
    );
    
    res.json({ message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Database delete error:', 
      axios.isAxiosError(error) ? error.response?.data : error);
    
    res.status(axios.isAxiosError(error) ? error.response?.status || 500 : 500).json({
      error: axios.isAxiosError(error) ? 
        error.response?.data?.error || 'Failed to delete data' : 
        'Failed to delete data'
    });
  }
};
