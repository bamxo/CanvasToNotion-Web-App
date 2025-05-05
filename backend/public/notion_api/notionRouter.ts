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
    return false
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

    // Get accessible resources
    const searchResponse = await notion.search({});
    const accessibleResources = searchResponse.results.map(item => ({
      id: item.id,
      type: item.object,
      title: 'title' in item ? item.title : 'Untitled'
    }));

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
//tanvi template modify
// Apply the existing token verification middleware to the sync endpoint
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // Get Notion token and page ID from the request body
    const { notionAccessToken, pageId, courses, assignments } = req.body;
    
    // Initialize Notion client with the user's Notion access token
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

    res.json({ success: true });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

export default router;