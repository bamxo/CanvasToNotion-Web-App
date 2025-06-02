import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';
import type { PartialBlockObjectResponse, BlockObjectResponse, DatabaseObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Client } from '@notionhq/client';
import fetch from 'node-fetch';

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
      
      try {
        // Basic validation
        const { email, pageId, courses, assignments } = body;
        
        if (!email || !pageId || !Array.isArray(courses) || !Array.isArray(assignments)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Missing required fields' 
            })
          };
        }
        
        // Get user data and verify connection
        const db = admin.database();
        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        
        if (!snapshot.exists()) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'User not found' 
            })
          };
        }
        
        // Get the user's ID and data
        const userEntries = Object.entries(snapshot.val());
        if (userEntries.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'User data not found' 
            })
          };
        }
        
        const [userId, userData] = userEntries[0] as [string, UserData];
        
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
        
        // Set the sync status to 'pending' in the user's data
        const syncStatusRef = db.ref(`users/${userId}/syncStatus`);
        await syncStatusRef.set({
          status: 'pending'
        });
        
        // Call the background function
        const functionUrl = `${process.env.URL || 'https://canvastonotion.netlify.app'}/.netlify/functions/notion-background`;
        
        console.log("Triggering background sync function");
        
        // Add userId to the body for the background function
        const backgroundBody = {
          ...body,
          userId
        };
        
        // Fire and forget - don't await the response
        fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(backgroundBody)
        }).catch(err => console.error('Error triggering background function:', err));
        
        // Return immediately with a success message
        return {
          statusCode: 202, // Accepted
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Sync process has started in the background',
            info: 'This may take several minutes to complete'
          })
        };
      } catch (error) {
        console.error('Error triggering sync:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }
    }
    // Handle sync-status endpoint
    else if (endpoint === 'sync-status' && event.httpMethod === 'GET') {
      const email = event.queryStringParameters?.email;
      
      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Email is required' })
        };
      }
      
      // Verify authorization
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'Authentication required' })
        };
      }
      
      try {
        // Get user ID from email
        const db = admin.database();
        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        
        if (!snapshot.exists()) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'User not found' })
          };
        }
        
        const userEntries = Object.entries(snapshot.val());
        if (userEntries.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'User data not found' })
          };
        }
        
        const [userId, userData] = userEntries[0];
        
        // Get sync status from user data
        const syncStatusRef = db.ref(`users/${userId}/syncStatus`);
        const syncStatusSnapshot = await syncStatusRef.once('value');
        
        if (!syncStatusSnapshot.exists()) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'No sync status found' })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            syncStatus: syncStatusSnapshot.val()
          })
        };
      } catch (error) {
        console.error('Error fetching sync status:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        };
      }
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

    // Step 3: Find the Courses and Assignments databases
    const childrenResponse = await notion.blocks.children.list({ block_id: pageId });
    console.log('Step 3: Pulled Notion children blocks');

    const existingCoursesDb = childrenResponse.results.find(child =>
      "type" in child && 
      child.type === "child_database" &&
      child.child_database?.title === "Courses"
    );

    const existingAssignmentsDb = childrenResponse.results.find(child =>
      "type" in child && 
      child.type === "child_database" &&
      child.child_database?.title === "Assignments"
    );

    // If databases don't exist yet, return all Canvas assignments as needing sync
    if (!existingCoursesDb || !existingAssignmentsDb) {
      console.log('Courses or Assignments database not found - returning all Canvas assignments');
      
      const comparison: Record<string, { onlyInCanvas: any[]; onlyInNotion: string[] }> = {};
      
      for (const course of courses) {
        const canvasAssignments = assignments.filter((a: any) => a.courseId === course.id);
        comparison[course.name] = { 
          onlyInCanvas: canvasAssignments, 
          onlyInNotion: [] 
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          comparison,
          message: 'No sync data found - all Canvas assignments need to be synced'
        })
      };
    }

    const coursesDbId = existingCoursesDb.id;
    const assignmentsDbId = existingAssignmentsDb.id;
    console.log('Step 3: Found databases - Courses:', coursesDbId, 'Assignments:', assignmentsDbId);

    // Step 4: Get all courses from Notion to create courseId -> pageId mapping
    const notionCourses = await notion.databases.query({ database_id: coursesDbId });
    const courseNameToPageId = new Map<string, string>();
    
    for (const page of notionCourses.results) {
      if (
        'properties' in page &&
        'Name' in page.properties &&
        'title' in page.properties.Name &&
        Array.isArray(page.properties.Name.title)
      ) {
        const courseName = page.properties.Name.title.map(t => t.plain_text).join('').trim();
        if (courseName) {
          courseNameToPageId.set(courseName, page.id);
        }
      }
    }
    console.log('Step 4: Course name to page ID mapping:', Object.fromEntries(courseNameToPageId));

    // Step 5: Get all assignments from Notion
    const notionAssignments = await notion.databases.query({ database_id: assignmentsDbId });
    console.log('Step 5: Found', notionAssignments.results.length, 'assignments in Notion');

    // Step 6: Group Notion assignments by course
    const notionAssignmentsByCourse: Record<string, string[]> = {};
    
    for (const assignment of notionAssignments.results) {
      if ('properties' in assignment) {
        // Get assignment name
        let assignmentName = '';
        if (
          'Name' in assignment.properties &&
          'title' in assignment.properties.Name &&
          Array.isArray(assignment.properties.Name.title)
        ) {
          assignmentName = assignment.properties.Name.title.map(t => t.plain_text).join('').trim();
        }

        // Get related course
        let relatedCourseName = '';
        if (
          'Course' in assignment.properties &&
          'relation' in assignment.properties.Course &&
          Array.isArray(assignment.properties.Course.relation) &&
          assignment.properties.Course.relation.length > 0
        ) {
          const coursePageId = assignment.properties.Course.relation[0].id;
          
          // Find course name by page ID
          for (const [courseName, pageId] of courseNameToPageId.entries()) {
            if (pageId === coursePageId) {
              relatedCourseName = courseName;
              break;
            }
          }
        }

        if (assignmentName && relatedCourseName) {
          if (!notionAssignmentsByCourse[relatedCourseName]) {
            notionAssignmentsByCourse[relatedCourseName] = [];
          }
          notionAssignmentsByCourse[relatedCourseName].push(assignmentName);
        }
      }
    }
    console.log('Step 6: Notion assignments by course:', notionAssignmentsByCourse);

    // Step 7: Compare Canvas assignments to Notion assignments by course
    const comparison: Record<string, { onlyInCanvas: any[]; onlyInNotion: string[] }> = {};

    for (const course of courses) {
      console.log(`Step 7: Processing course "${course.name}" (ID: ${course.id})`);
      
      // All Canvas assignments for this course
      const canvasAssignments = assignments.filter((a: any) => a.courseId === course.id);
      console.log(`Canvas assignments for "${course.name}":`, canvasAssignments.map(a => a.name));

      // All Notion assignment names for this course
      const notionAssignments = notionAssignmentsByCourse[course.name] || [];
      console.log(`Notion assignments for "${course.name}":`, notionAssignments);

      // Find Canvas assignments not present in Notion (by name, trimmed for comparison)
      const onlyInCanvas = canvasAssignments.filter(
        (a: any) => !notionAssignments.includes(a.name.trim())
      );

      // Find Notion assignment names not present in Canvas
      const canvasAssignmentNames = canvasAssignments.map((a: any) => a.name.trim());
      const onlyInNotion = notionAssignments.filter(
        (name: string) => !canvasAssignmentNames.includes(name.trim())
      );

      comparison[course.name] = { onlyInCanvas, onlyInNotion };
      
      console.log(`Comparison result for "${course.name}":`, {
        onlyInCanvas: onlyInCanvas.length,
        onlyInNotion: onlyInNotion.length
      });
    }

    console.log('Final comparison results:');
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