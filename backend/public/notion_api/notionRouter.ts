// src/notion_api/notionRouter.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import { Client } from '@notionhq/client';
import { adminDb } from '../db';
import { database } from 'firebase-admin';

const router = express.Router();

interface UserData {
  accessToken?: string;
  workspaceId?: string;
  pageIDs?: any[];
  lastUpdated?: string;
}

// Helper function to get user data by email
const getUserByEmail = async (
  db: database.Database,
  email: string
): Promise<UserData | null> => {
  try {
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [_, userData] = userEntries[0];
        return userData as UserData;
      }
    }
    console.log(`No user found with email: ${email}`);
    return null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

const updateUserByEmail = async (
  db: database.Database,
  email: string,
  userData: UserData
): Promise<boolean> => {
  try {
    const usersRef = db.ref('users');

    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [userId] = userEntries[0];
        const userRef = db.ref(`users/${userId}`);
        await userRef.update(userData);
        console.log(`Updated user with email: ${email}`);
        return true;
      }
    } else {
      console.log(`No user found with email: ${email}`);
      return false;
    }
  } catch (error) {
    console.error("Error updating user by email:", error);
    throw error;
  }
  return false;
};

router.post('/token', async (req: Request, res: Response) => {
  try {
    const { code, email } = req.body;
    
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI!
      }),
      {
        auth: {
          username: process.env.NOTION_CLIENT_ID!,
          password: process.env.NOTION_CLIENT_SECRET!
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, workspace_id } = tokenResponse.data;
    const notion = new Client({ auth: access_token });
    
    // Get accessible resources with correct title extraction
    const searchResponse = await notion.search({});
    const accessibleResources = searchResponse.results.map(item => {
      let title = 'Untitled';
      
      if (item.object === 'page') {
        // For pages, title is in properties.title if it exists
        if ('properties' in item && item.properties.title) {
          if ('title' in item.properties.title && Array.isArray(item.properties.title.title) && item.properties.title.title.length > 0) {
            title = item.properties.title.title.map(textObj => textObj.plain_text).join('');
          }
        } else if ('parent' in item && item.parent.type === 'database_id') {
          // If it's a database page, use a different approach to find the title
          const titleProperty = Object.values(item.properties).find(
            prop => ('rich_text' in prop && prop.rich_text.length > 0) || 
                   ('title' in prop && prop.title.length > 0)
          );
          
          if (titleProperty) {
            if ('rich_text' in titleProperty) {
              title = titleProperty.rich_text.map(textObj => textObj.plain_text).join('');
            } else if ('title' in titleProperty) {
              title = titleProperty.title.map(textObj => textObj.plain_text).join('');
            }
          }
        }
      } else if (item.object === 'database') {
        // For databases, title is in title array
        if ('title' in item && Array.isArray(item.title) && item.title.length > 0) {
          title = item.title.map(textObj => textObj.plain_text).join('');
        }
      }
      
      return {
        id: item.id,
        type: item.object,
        title
      };
    });
    
    // Update the user's data in Firebase
    const userData = {
      accessToken: access_token,
      workspaceId: workspace_id,
      pageIDs: accessibleResources,
      lastUpdated: new Date().toISOString()
    };
    
    const updated = await updateUserByEmail(adminDb, email, userData);
    
    res.json({
      success: true,
      updated: updated,
      accessToken: access_token,
      workspaceId: workspace_id,
      accessibleResources
    });
  } catch (error: any) {
    console.error('Notion API Error:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});
// Modified sync endpoint to use email instead of token in the request
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // Get user email and page ID from the request body
    const { email, pageId, courses, assignments } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }

    // Get the user's data from Firebase including Notion access token
    const userData = await getUserByEmail(adminDb, email);
    
    if (!userData || !userData.accessToken) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found or Notion access token not available' 
      });
    }

    const notionAccessToken = userData.accessToken;
    
    // Initialize Notion client with the retrieved access token
    const notion = new Client({ auth: notionAccessToken });

    // Create databases and pages
    const courseDatabases = new Map<number, string>();
    
    // Create course databases
    for (const course of courses) {
      const newDb = await notion.databases.create({
        parent: { type: "page_id", page_id: pageId },
        title: [{ type: "text", text: { content: course.name } }],
        properties: {
          Name: { title: {} },
          DueDate: { date: {} },
          Points: { number: {} },
          URL: { url: {} },
          Status: {
            select: {
              options: [
                { name: "Not Started", color: "red" },
                { name: "In Progress", color: "yellow" },
                { name: "Completed", color: "green" }
              ]
            }
          }
        }
      });
      courseDatabases.set(course.id, newDb.id);
    }

    // Create assignments
    for (const assignment of assignments) {
      const databaseId = courseDatabases.get(assignment.courseId);
      if (!databaseId) continue;

      const dueDate = assignment.due_at ? 
        { date: { start: new Date(assignment.due_at).toISOString() } } : 
        { date: null };

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: { title: [{ text: { content: assignment.name } }] },
          DueDate: dueDate,
          Points: { number: assignment.points_possible },
          URL: { url: assignment.html_url },
          Status: { select: { name: "Not Started" } }
        }
      });
    }

    res.json({ 
      success: true, 
      message: 'Canvas data successfully synced to Notion'
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data || error.message || 'Sync failed' 
    });
  }
});

// src/notion_api/notionRouter.ts
router.get('/pages', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const usersRef = adminDb.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (snapshot.exists()) {
      const userData = Object.values(snapshot.val())[0] as any;
      const pages = userData.pageIDs?.map((page: any) => ({
        id: page.id,
        title: page.title,
      })) || [];

      res.json({ pages });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;  