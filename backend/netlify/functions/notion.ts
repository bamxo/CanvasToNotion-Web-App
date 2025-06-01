import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';
import type { PartialBlockObjectResponse, BlockObjectResponse, DatabaseObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Client } from '@notionhq/client';

// Load environment variables
dotenv.config();

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  getFirebaseAdmin();
}

// Interface for user data
interface UserData {
  accessToken?: string;
  workspaceId?: string;
  lastUpdated?: string;
  email?: string;
}

// Helper function to get user data by email
const getUserByEmail = async (email: string): Promise<UserData | null> => {
  try {
    const db = admin.database();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [_, userData] = userEntries[0];
        return userData as UserData;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

// Helper function to check if a block is a child database
function isChildDatabaseBlock(
  block: PartialBlockObjectResponse | BlockObjectResponse
): block is BlockObjectResponse & { type: 'child_database', child_database: { title: string } } {
  return (
    'type' in block &&
    block.type === 'child_database' &&
    'child_database' in block &&
    typeof (block as any).child_database?.title === 'string'
  );
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers - note the specific origin instead of wildcard
  const allowedOrigins = [
    'https://canvastonotion.io',
    'https://canvastonotion.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = event.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS request (pre-flight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Parse the path to determine the endpoint
    const pathParts = event.path.split('/');
    const endpoint = pathParts[pathParts.length - 1];
    
    // Handle token exchange endpoint
    if (endpoint === 'token' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await handleTokenExchange(body, headers);
    } 
    // Handle connected endpoint
    else if (endpoint === 'connected' && event.httpMethod === 'GET') {
      const email = event.queryStringParameters?.email;
      
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Email is required' })
        };
      }
      
      // Get user data
      const userData = await getUserByEmail(email);
      
      if (!userData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, connected: false, error: 'User not found' })
        };
      }
      
      // Check if accessToken exists
      const connected = !!userData.accessToken;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, connected })
      };
    }
    // Handle pages endpoint
    else if (endpoint === 'pages' && event.httpMethod === 'GET') {
      const email = event.queryStringParameters?.email;
      
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Email is required' })
        };
      }
      
      return await handleGetPages(email, headers);
    }
    // Handle sync endpoint
    else if (endpoint === 'sync' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await handleSync(body, headers);
    }
    // Handle compare endpoint
    else if (endpoint === 'compare' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await handleCompare(body, headers);
    }
    // Handle disconnect endpoint
    else if (endpoint === 'disconnect' && event.httpMethod === 'GET') {
      const email = event.queryStringParameters?.email;
      
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Email is required' })
        };
      }
      
      return await handleDisconnect(email, headers);
    }
    else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
  } catch (error) {
    console.error('Error processing Notion request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Function to handle Notion token exchange
async function handleTokenExchange(body: any, headers: any) {
  try {
    const { code, email } = body;
    
    if (!code || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Code and email are required' })
      };
    }
    
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI!
      }).toString(),
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
    
    // Update the user's data in Firebase
    const db = admin.database();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    
    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [userId] = userEntries[0];
        const userRef = db.ref(`users/${userId}`);
        
        // Update user data with Notion token
        await userRef.update({
          accessToken: access_token,
          workspaceId: workspace_id,
          lastUpdated: new Date().toISOString()
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Notion token stored successfully'
          })
        };
      }
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'User not found' })
    };
  } catch (error) {
    console.error('Error exchanging Notion token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to exchange Notion token',
        details: error.response?.data || error.message
      })
    };
  }
}

// Function to handle getting Notion pages
async function handleGetPages(email: string, headers: any) {
  try {
    if (!email || typeof email !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Email is required' })
      };
    }

    // Get user's accessToken from database
    const userData = await getUserByEmail(email);
    
    if (!userData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'User not found' })
      };
    }

    const accessToken = userData.accessToken;
    
    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'User not connected to Notion' })
      };
    }

    // Initialize Notion client
    const notion = new Client({ auth: accessToken });

    // Get bot user ID
    const botUser = await notion.users.me({});
    const botId = botUser.id;

    // Perform the Notion search
    const searchResponse = await notion.search({});

    // Filter and map results
    const accessibleResources = searchResponse.results
      .filter(item => {
        // Handle databases
        if (item.object === 'database') {
          const db = item as DatabaseObjectResponse;
          return db?.created_by?.id !== botId;
        }
        
        // Handle pages
        if (item.object === 'page') {
          const page = item as PageObjectResponse;
          return page?.created_by?.id !== botId;
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
          // For pages, title is in properties.title if it exists
          if ('properties' in item && item.properties.title) {
            if ('title' in item.properties.title && Array.isArray(item.properties.title.title) && item.properties.title.title.length > 0) {
              title = item.properties.title.title.map(textObj => textObj.plain_text).join('');
            }
          } else if ('parent' in item && item.parent.type === 'database_id') {
            // If it's a database page, use a different approach to find the title
            const properties = (item as PageObjectResponse).properties;
            const titleProperty = Object.values(properties).find(
              (prop: any) => ('rich_text' in prop && prop.rich_text.length > 0) || 
                    ('title' in prop && prop.title.length > 0)
            );
            
            if (titleProperty) {
              if ('rich_text' in titleProperty) {
                title = titleProperty.rich_text.map((textObj: any) => textObj.plain_text).join('');
              } else if ('title' in titleProperty) {
                title = titleProperty.title.map((textObj: any) => textObj.plain_text).join('');
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
          icon
        };
      });

    // Update the user's pages in the database
    const db = admin.database();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    
    if (snapshot.exists()) {
      const userEntries = Object.entries(snapshot.val());
      if (userEntries.length > 0) {
        const [userId] = userEntries[0];
        const userRef = db.ref(`users/${userId}`);
        
        // Update user data with pages
        await userRef.update({
          pageIDs: accessibleResources,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ pages: accessibleResources })
    };
  } catch (error) {
    console.error('Error fetching Notion pages:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
}

// Function to handle disconnecting Notion integration
async function handleDisconnect(email: string, headers: any) {
  try {
    if (!email || typeof email !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Email is required' })
      };
    }

    // Get user data
    const db = admin.database();
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (!snapshot.exists()) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, connected: false, error: 'User not found' })
      };
    }

    const userEntries = Object.entries(snapshot.val());
    if (userEntries.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, connected: false, error: 'User data not found' })
      };
    }

    // Get the user's ID and data
    const [userId, userData] = userEntries[0] as [string, UserData];

    // Check if accessToken exists and is non-empty
    const connected = !!userData.accessToken;

    if (connected) {
      // Remove the accessToken to disconnect the user
      const userRef = db.ref(`users/${userId}/accessToken`);
      await userRef.remove();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, connected: false, message: 'User disconnected successfully' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, connected, message: 'User is already disconnected' })
    };
  } catch (error) {
    console.error('Error during disconnect:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
}

// Function to handle Notion sync with Canvas data
async function handleSync(body: any, headers: any) {
  try {
    const { email, pageId, courses, assignments } = body;
    
    // Validate input
    if (!email || typeof email !== 'string' || !pageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Valid email and page ID are required' 
        })
      };
    }

    // Get user data
    const userData = await getUserByEmail(email);
    if (!userData?.accessToken) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Notion integration not connected' 
        })
      };
    }

    // Initialize Notion client
    const notion = new Client({ auth: userData.accessToken });
    const courseDatabases = new Map<number, string>();

    // Verify parent page access first
    try {
      await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: `No access to parent page (${pageId}). Share it with your integration via Notion's page connections.`
        })
      };
    }

    const childrenResponse = await notion.blocks.children.list({
      block_id: pageId,
    });

    // Create course databases under the selected parent
    for (const course of courses) {
      const courseName = course.name;

      const existingDatabase = childrenResponse.results.find(child => {
        return isChildDatabaseBlock(child) && child.child_database.title === courseName;
      });

      if (existingDatabase && isChildDatabaseBlock(existingDatabase)) {
        console.log(`database for ${courseName} already exists.`);
        courseDatabases.set(course.id, existingDatabase.id);
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
    type AssignmentResult = {
      assignment: string;
      success: boolean;
      error?: string;
    };
    
    const assignmentResults: AssignmentResult[] = [];
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
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Sync completed with partial results',
        results: {
          courses: courses.length,
          assignments: assignmentResults
        }
      })
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? 
          (error.message === 'object_not_found' 
            ? 'Verify page sharing with your Notion integration' 
            : error.message) 
          : 'Unknown error'
      })
    };
  }
}

// Function to handle Notion pages comparison
async function handleCompare(body: any, headers: any) {
  try {
    console.log('--- /compare endpoint called ---');
    console.log('Received payload:', JSON.stringify(body, null, 2));

    const { email, pageId, courses, assignments } = body;

    // Step 1: Validate input
    if (!email || !pageId || !Array.isArray(courses) || !Array.isArray(assignments)) {
      console.log('Missing required fields');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required fields' })
      };
    }
    console.log('Step 1: Payload validated');

    // Step 2: Get user data and access token
    const userData = await getUserByEmail(email);
    if (!userData?.accessToken) {
      console.log('Notion integration not connected for user:', email);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Notion integration not connected' })
      };
    }
    console.log('Step 2: Fetched Notion access token for user:', email);

    const notion = new Client({ auth: userData.accessToken });

    // Step 3: Get all child blocks under the page
    const children = await notion.blocks.children.list({ block_id: pageId });
    console.log('Step 3: Pulled Notion children blocks:', JSON.stringify(children.results, null, 2));

    // Step 4: Map course.id to Notion database id
    const courseDatabases = new Map<number, string>();
    for (const course of courses) {
      const dbBlock = children.results.find(block =>
        isChildDatabaseBlock(block) && block.child_database.title === course.name
      );
      if (dbBlock) {
        courseDatabases.set(course.id, dbBlock.id);
        console.log(`Matched Notion database for course "${course.name}" (id: ${course.id}):`, dbBlock.id);
      } else {
        console.log(`No Notion database found for course "${course.name}" (id: ${course.id})`);
      }
    }
    console.log('Step 4: Course to Notion database mapping:', Array.from(courseDatabases.entries()));

    // Step 5: For each course, fetch all assignment names from the corresponding Notion database
    const notionAssignmentsByCourse: Record<number, string[]> = {};
    for (const [courseId, dbId] of courseDatabases.entries()) {
      const pages = await notion.databases.query({ database_id: dbId });
      console.log(`Step 5: Notion database query result for courseId ${courseId}:`, JSON.stringify(pages.results, null, 2));
      
      // Enhanced debugging for property extraction
      console.log(`Step 5: Processing ${pages.results.length} pages for courseId ${courseId}`);
      const assignmentNames = pages.results.map((page, index) => {
        console.log(`Step 5: Processing page ${index + 1} properties:`, JSON.stringify((page as any).properties, null, 2));
        
        // Try different common property names
        const possibleNameProps = ['Name', 'Title', 'Assignment Name', 'Assignment', 'Task'];
        let extractedName = '';
        
        for (const propName of possibleNameProps) {
          const prop = (page as any).properties?.[propName];
          if (prop) {
            console.log(`Step 5: Found property "${propName}":`, JSON.stringify(prop, null, 2));
            if (prop.title && prop.title.length > 0) {
              extractedName = prop.title.map((t: any) => t.plain_text).join('');
              console.log(`Step 5: Extracted name from "${propName}":`, extractedName);
              break;
            }
          }
        }
        
        if (!extractedName) {
          console.log(`Step 5: No valid name property found for page ${index + 1}`);
        }
        
        return extractedName;
      }).filter((name: string) => !!name);
      
      notionAssignmentsByCourse[courseId] = assignmentNames;
      console.log(`Step 5: Final assignment names for courseId ${courseId}:`, notionAssignmentsByCourse[courseId]);
    }

    // Step 6: Compare Canvas assignments to Notion assignments by course
    const comparison: Record<
      string,
      { onlyInCanvas: any[]; onlyInNotion: string[] }
    > = {};

    for (const course of courses) {
      console.log(`\n--- Processing course: ${course.name} (ID: ${course.id}) ---`);
      
      // All Canvas assignments for this course
      const canvasAssignments = assignments
        .filter((a: any) => a.courseId === course.id);
      console.log(`Step 6: Canvas assignments for courseId ${course.id}:`, 
        canvasAssignments.map((a: any) => ({ name: a.name, id: a.id })));

      // All Notion assignment names for this course
      const notionAssignments = notionAssignmentsByCourse[course.id] || [];
      console.log(`Step 6: Notion assignments for courseId ${course.id}:`, notionAssignments);

      // Find Canvas assignments not present in Notion (by name)
      const onlyInCanvas = canvasAssignments.filter(
        (a: any) => !notionAssignments.includes(a.name)
      );
      console.log(`Step 6: Assignments only in Canvas for courseId ${course.id}:`, 
        onlyInCanvas.map((a: any) => ({ name: a.name, id: a.id })));

      // Find Notion assignment names not present in Canvas
      const canvasAssignmentNames = canvasAssignments.map((a: any) => a.name);
      const onlyInNotion = notionAssignments.filter(
        (name: string) => !canvasAssignmentNames.includes(name)
      );
      console.log(`Step 6: Assignments only in Notion for courseId ${course.id}:`, onlyInNotion);

      // Use course name as key instead of course ID
      comparison[course.name] = { onlyInCanvas, onlyInNotion };
      console.log(`Step 6: Comparison result for course "${course.name}":`, {
        onlyInCanvas: onlyInCanvas.length,
        onlyInNotion: onlyInNotion.length
      });
    }

    // Step 7: Respond with the comparison result
    console.log('Step 7: Final comparison result:', JSON.stringify(comparison, null, 2));
    
    // Add summary logging
    console.log('\n--- COMPARISON SUMMARY ---');
    Object.entries(comparison).forEach(([courseName, data]) => {
      console.log(`Course "${courseName}": ${data.onlyInCanvas.length} Canvas-only, ${data.onlyInNotion.length} Notion-only`);
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        comparison
      })
    };
  } catch (error: any) {
    console.error('Compare endpoint error:', error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ success: false, error: error.message }) 
    };
  }
} 