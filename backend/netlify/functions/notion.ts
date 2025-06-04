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
          status: 'pending',
          startedAt: new Date().toISOString(),
          totalAssignments: assignments.length,
          totalCourses: courses.length
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
            info: {
              totalAssignments: assignments.length,
              totalCourses: courses.length,
              syncStatus: 'pending',
              startedAt: new Date().toISOString()
            }
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
        
        const syncStatus = syncStatusSnapshot.val();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            syncStatus: {
              ...syncStatus,
              // Add formatted message for client display
              message: formatSyncStatusMessage(syncStatus)
            }
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

    // Step 3: Find the Assignments database
    const childrenResponse = await notion.blocks.children.list({ block_id: pageId });
    console.log('Step 3: Pulled Notion children blocks');

    const existingAssignmentsDb = childrenResponse.results.find(child =>
      "type" in child && 
      child.type === "child_database" &&
      child.child_database?.title === "Assignments"
    );

    // If assignments database doesn't exist, return all Canvas assignments as needing sync
    if (!existingAssignmentsDb) {
      console.log('Assignments database not found - returning all Canvas assignments');
      
      const comparison: Record<string, { onlyInCanvas: any[] }> = {};
      
      for (const course of courses) {
        const canvasAssignments = assignments.filter((a: any) => a.courseId === course.id);
        comparison[course.name] = { 
          onlyInCanvas: assignments.filter((a: any) => a.courseId === course.id)
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

    const assignmentsDbId = existingAssignmentsDb.id;
    console.log('Step 3: Found Assignments database:', assignmentsDbId);

    // Step 4: Get all assignment URLs from Notion
    const notionAssignments = await notion.databases.query({ database_id: assignmentsDbId });
    console.log('Step 4: Found', notionAssignments.results.length, 'assignments in Notion');

    const notionUrls = new Set<string>();
    
    for (const assignment of notionAssignments.results) {
      if ('properties' in assignment && 'URL' in assignment.properties) {
        let url = '';
        if ('url' in assignment.properties.URL && assignment.properties.URL.url) {
          url = assignment.properties.URL.url.trim();
        }
        
        if (url) {
          notionUrls.add(url);
        }
      }
    }
    
    console.log('Step 4: Found', notionUrls.size, 'unique URLs in Notion');
    console.log('Debug - First few Notion URLs:', Array.from(notionUrls).slice(0, 3));

    // Step 5: Find Canvas assignments that need to be synced to Notion
    const comparison: Record<string, { onlyInCanvas: any[] }> = {};

    for (const course of courses) {
      console.log(`Step 5: Processing course "${course.name}" (ID: ${course.id})`);
      
      // All Canvas assignments for this course
      const canvasAssignments = assignments.filter((a: any) => a.courseId === course.id);
      console.log(`Canvas assignments for "${course.name}":`, canvasAssignments.length);

      // Find Canvas assignments not present in Notion (by URL)
      const onlyInCanvas = canvasAssignments.filter(
        (a: any) => {
          const canvasUrl = a.html_url?.trim();
          const isInNotion = notionUrls.has(canvasUrl);
          
          // Debug: Log first few comparisons
          if (canvasAssignments.indexOf(a) < 3) {
            console.log(`Debug - Assignment "${a.name}": Canvas URL="${canvasUrl}", In Notion: ${isInNotion}`);
          }
          
          return !isInNotion;
        }
      );

      comparison[course.name] = { onlyInCanvas };
      
      console.log(`Comparison result for "${course.name}":`, {
        onlyInCanvas: onlyInCanvas.length
      });
    }

    console.log('Final comparison results:');
    Object.entries(comparison).forEach(([courseName, data]) => {
      console.log(`Course "${courseName}": ${data.onlyInCanvas.length} assignments only in Canvas`);
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

// Helper function to format sync status message
function formatSyncStatusMessage(syncStatus: any): string {
  if (!syncStatus) return 'No sync information available';
  
  switch (syncStatus.status) {
    case 'pending':
      return 'Sync in progress...';
    case 'complete':
      if (syncStatus.results) {
        const { newAssignmentsCreated, skippedAssignments, totalAssignments } = syncStatus.results;
        return `Sync completed: ${newAssignmentsCreated} assignments created, ${skippedAssignments} already existed.`;
      }
      return 'Sync completed successfully';
    case 'error':
      return `Sync failed: ${syncStatus.error || 'Unknown error'}`;
    default:
      return `Sync status: ${syncStatus.status}`;
  }
} 