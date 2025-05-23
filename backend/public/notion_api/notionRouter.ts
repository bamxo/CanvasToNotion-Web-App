// src/notion_api/notionRouter.ts
import express, { Request, Response } from 'express';
import type { DatabaseObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
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
    
     const botUser = await notion.users.me({});
    const botId = botUser.id;

    // Modified search logic with type-safe filtering
    const searchResponse = await notion.search({});
    const accessibleResources = searchResponse.results
      .filter(item => {
        // Handle databases
        if (item.object === 'database') {
          const db = item as DatabaseObjectResponse;
          return db.created_by?.id !== botId;
        }
        
        // Handle pages
        if (item.object === 'page') {
          const page = item as PageObjectResponse;
          return page.created_by?.id !== botId;
        }
        
        return true;
      }).map(item => {
        let title = 'Untitled';
        let icon: string | null = null;

        // Extract icon emoji if present
        if ('icon' in item && item.icon && item.icon.type === 'emoji') {
          icon = item.icon.emoji;
        }

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
          title,
          icon // <-- include the icon emoji here
        };
      })

    
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
    const { email, pageId, courses, assignments } = req.body;
    
    // Validate input
    if (!email || typeof email !== 'string' || !pageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email and page ID are required' 
      });
    }

    // Get user data
    const userData = await getUserByEmail(adminDb, email);
    if (!userData?.accessToken) {
      return res.status(403).json({ 
        success: false, 
        error: 'Notion integration not connected' 
      });
    }

    // Initialize Notion client
    const notion = new Client({ auth: userData.accessToken });
    const courseDatabases = new Map<number, string>();

    // Verify parent page access first
    try {
      await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: `No access to parent page (${pageId}). Share it with your integration via Notion's page connections.`
      });
    }

    const childrenResponse = await notion.blocks.children.list({
      block_id: pageId,
    });

    // Create course databases under the selected parent
    for (const course of courses) {

      const courseName = course.name;

      const databaseAlreadyExists = childrenResponse.results.some(child => {
        if ("type" in child && child.type === "child_database") {
          return child.child_database?.title === courseName;
        }
        return false;
      });

      if (databaseAlreadyExists) {
        console.log(`database for ${courseName} already exists.`);
        continue;
      }


      try {
        const newDb = await notion.databases.create({
          parent: { type: "page_id", page_id: pageId },
          title: [{ type: "text", text: { content: course.name } }],
          is_inline: true,
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
      } catch (error) {
        console.error(`Failed to create database for ${course.name}:`, error);
        continue; // Skip this course but continue with others
      }
    }

    // Create assignments in their respective databases
    const assignmentResults = [];
    for (const assignment of assignments) {
      const databaseId = courseDatabases.get(assignment.courseId);
      if (!databaseId) {
        assignmentResults.push({
          assignment: assignment.name,
          success: false,
          error: 'Parent database not found'
        });
        continue;
      }

      try {
        const dueDate = assignment.due_at ? 
          { date: { start: new Date(assignment.due_at).toISOString() } } : 
          { date: null };

        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Name: { title: [{ text: { content: assignment.name } }] },
            DueDate: dueDate,
            Points: { number: assignment.points_possible || 0 },
            URL: { url: assignment.html_url },
            Status: { select: { name: "Not Started" } }
          }
        });
        assignmentResults.push({ assignment: assignment.name, success: true });
      } catch (error) {
        assignmentResults.push({
          assignment: assignment.name,
          success: false,
        });
      }
    }

    res.json({
      success: true,
      message: 'Sync completed with partial results',
      results: {
        courses: courses.length,
        assignments: assignmentResults
      }
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.code === 'object_not_found' 
        ? 'Verify page sharing with your Notion integration' 
        : error.message
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

    // 1. Get user's accessToken from your database
    const usersRef = adminDb.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userKey = Object.keys(snapshot.val())[0];
    const userData = Object.values(snapshot.val())[0] as any;
    const accessToken = userData.accessToken;

    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'User not connected to Notion' });
    }

    // 2. Use accessToken to instantiate Notion client
    const notion = new Client({ auth: accessToken });

    // 3. Get bot user ID
    const botUser = await notion.users.me({});
    const botId = botUser.id;

    // 4. Perform the Notion search
    const searchResponse = await notion.search({});

    // 5. Filter and map results (same as in your /token endpoint)
    const accessibleResources = searchResponse.results
      .filter(item => {
        if (item.object === 'database') {
          const db = item as DatabaseObjectResponse;
          return db.created_by?.id !== botId;
        }
        if (item.object === 'page') {
          const page = item as PageObjectResponse;
          return page.created_by?.id !== botId;
        }
        return true;
      })
      .map(item => {
        let title = 'Untitled';
        let icon: string | null = null;

        // Extract icon emoji if present
        if ('icon' in item && item.icon && item.icon.type === 'emoji') {
          icon = item.icon.emoji;
        }

        if (item.object === 'page') {
          if ('properties' in item && item.properties.title) {
            if (
              'title' in item.properties.title &&
              Array.isArray(item.properties.title.title) &&
              item.properties.title.title.length > 0
            ) {
              title = item.properties.title.title.map(textObj => textObj.plain_text).join('');
            }
          } else if ('parent' in item && item.parent.type === 'database_id') {
            const titleProperty = Object.values(item.properties).find(
              prop =>
                ('rich_text' in prop && prop.rich_text.length > 0) ||
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
          if ('title' in item && Array.isArray(item.title) && item.title.length > 0) {
            title = item.title.map(textObj => textObj.plain_text).join('');
          }
        }

        return {
          id: item.id,
          type: item.object,
          title,
          icon,
        };
      });

    // 6. Update the user's pages in the database
    await adminDb.ref(`users/${userKey}/pageIDs`).set(accessibleResources);
    await adminDb.ref(`users/${userKey}/lastUpdated`).set(new Date().toISOString());

    // 7. Return the fresh data
    res.json({ pages: accessibleResources });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



router.get('/connected', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Use the existing helper to get user data
    const userData = await getUserByEmail(adminDb, email);

    if (!userData) {
      return res.status(404).json({ success: false, connected: false, error: 'User not found' });
    }

    // Check if accessToken exists and is non-empty
    const connected = !!userData.accessToken;

    res.json({ success: true, connected });
  } catch (error) {
    console.error('Error checking connection:', error);
    res.status(500).json({ success: false, connected: false, error: 'Internal server error' });
  }
});
export default router;  
