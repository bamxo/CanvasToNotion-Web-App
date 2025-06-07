import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';
import { Client } from '@notionhq/client';
import type { PartialBlockObjectResponse, BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

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
  pageIDs?: any[];
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
    console.log(`No user found with email: ${email}`);
    return null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

// Helper function to update user by email
const updateUserByEmail = async (
  email: string,
  userData: Partial<UserData>
): Promise<boolean> => {
  try {
    const db = admin.database();
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

// Background function handler for syncing Canvas data to Notion
export const handler: Handler = async (event, context) => {
  // Set CORS headers
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

  console.log("Background sync function started");
  
  try {
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const { email, pageId, courses, assignments, userId } = body;
    
    console.log(`Processing sync for email: ${email}, pageId: ${pageId}, userId: ${userId}`);
    console.log(`Courses: ${courses.length}, Assignments: ${assignments.length}`);
    
    // Validate input
    if (!email || typeof email !== 'string' || !pageId || !userId) {
      console.error("Missing required fields");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Valid email, pageId, and userId are required' 
        })
      };
    }
    
    // Get user data and access token
    const userData = await getUserByEmail(email);
    if (!userData?.accessToken) {
      console.error("No access token found for user:", email);
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

    // Verify parent page access
    try {
      await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
      console.error(`No access to parent page (${pageId}):`, error);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: `No access to parent page (${pageId}). Share it with your integration via Notion's page connections.`
        })
      };
    }

    // Get all child blocks in parent page hierarchy
    const childrenResponse = await notion.blocks.children.list({ block_id: pageId });

    // Check to see if the Courses and Assignments DBs already exist
    const existingCoursesDb = childrenResponse.results.find(child =>
        "type" in child && 
        child.type === "child_database" &&
        child.child_database?.title == "Courses"
    );
    const existingAssignmentsDb = childrenResponse.results.find(child =>
        "type" in child && 
        child.type === "child_database" &&
        child.child_database?.title == "Assignments"
    );

    // Create Courses and Assignments DB if they don't exist
    let coursesDbId = existingCoursesDb?.id;
    if (!coursesDbId) {
      console.log("courses database dne: ", existingCoursesDb);
      const newCoursesDb = await notion.databases.create({
        parent: { type: "page_id", page_id: pageId },
        is_inline: false,
        title: [{ type: "text", text: { content: "Courses" } }],
        properties: {
          Name: { title: {} }
        }
      });
      coursesDbId = newCoursesDb.id;
    }

    let assignmentsDbId = existingAssignmentsDb?.id;
    if (!assignmentsDbId) {
      console.log("assignments database dne: ", existingAssignmentsDb);
      const newAssignmentsDb = await notion.databases.create({
        parent: { type: "page_id", page_id: pageId },
        is_inline: true,
        title: [{ type: "text", text: { content: "Assignments" } }],
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
                { name: "Done", color: "green" }
              ]
            }
          },
          Course: {
            relation: {
              database_id: coursesDbId,
              type: "single_property",
              single_property: {}
            }
          }
        }
      });
      assignmentsDbId = newAssignmentsDb.id;
    }

    // Only add courses that aren't in the Courses DB
    const existingCourseNames = new Set<string>();

    if (coursesDbId) {
      const existingPages = await notion.databases.query({
        database_id: coursesDbId
      });

      for (const page of existingPages.results) {
        if (
          'properties' in page &&
          'Name' in page.properties &&
          'title' in page.properties.Name &&
          Array.isArray(page.properties.Name.title)
        ) {
          const titleText = page.properties.Name.title.map(t => t.plain_text).join('').trim();
          if (titleText) {
            existingCourseNames.add(titleText);
          }
        }
      }
    }

    const coursePageIds = new Map<string, string>();
    for (const course of courses) {
      if (existingCourseNames.has(course.name)) {
        console.log(`Course "${course.name}" already exists. Finding existing page ID.`);

        // Query for the page matching this course name
        const search = await notion.databases.query({
          database_id: coursesDbId,
          filter: {
            property: "Name",
            title: {
              equals: course.name
            }
          }
        });

        if (search.results.length > 0) {
          const existingPage = search.results[0];
          coursePageIds.set(course.name, existingPage.id);
        }
        continue;
      }

      console.log(`Creating course: ${course.name}`);
      const coursePage = await notion.pages.create({
        parent: { database_id: coursesDbId },
        properties: {
          Name: { title: [{ text: { content: course.name } }] }
        }
      });
      coursePageIds.set(course.name, coursePage.id);
    }

    // Get existing assignment URLs to avoid duplicates
    let notionAssignmentUrls = new Set<string>();
    
    if (assignmentsDbId) {
      const notionAssignments = await notion.databases.query({ database_id: assignmentsDbId });
      
      for (const assignment of notionAssignments.results) {
        if ('properties' in assignment && 'URL' in assignment.properties) {
          let url = '';
          if ('url' in assignment.properties.URL && assignment.properties.URL.url) {
            url = assignment.properties.URL.url.trim();
          }
          
          if (url) {
            notionAssignmentUrls.add(url);
          }
        }
      }
      
      console.log(`Found ${notionAssignmentUrls.size} existing assignments in Notion database`);
    }

    // Create Assignment entries only for assignments not already in Notion
    type AssignmentResult = {
      assignment: string;
      success: boolean;
      status?: string;
      message?: string;
      error?: string;
    };
    
    const assignmentResults: AssignmentResult[] = [];
    let newAssignmentsCount = 0;
    let skippedAssignmentsCount = 0;
    
    console.log(`Processing ${assignments.length} assignments`);
    
    for (const assignment of assignments) {
      const canvasUrl = assignment.html_url?.trim();
      
      // Skip if this assignment already exists in Notion
      if (notionAssignmentUrls.has(canvasUrl)) {
        assignmentResults.push({
          assignment: assignment.name,
          success: true,
          status: 'skipped',
          message: 'Assignment already exists in Notion'
        });
        skippedAssignmentsCount++;
        continue;
      }
      
      const courseName = courses.find((c: { id: string; name: string }) => c.id === assignment.courseId)?.name;
      const coursePageId = coursePageIds.get(courseName);

      if (!coursePageId) {
        console.log(`Course not found for assignment: ${assignment.name}`);
        assignmentResults.push({
          assignment: assignment.name,
          success: false,
          error: 'Related course not found'
        });
        continue;
      }

      try {
        const dueDate = assignment.due_at
          ? { date: { start: new Date(assignment.due_at).toISOString() } }
          : { date: null };

        console.log(`Creating assignment: ${assignment.name}`);
        await notion.pages.create({
          parent: { database_id: assignmentsDbId },
          properties: {
            Name: { title: [{ text: { content: assignment.name } }] },
            DueDate: dueDate,
            Points: { number: assignment.points_possible || 0 },
            URL: { url: assignment.html_url },
            Status: { select: { name: "Not Started" } },
            Course: { relation: [{ id: coursePageId }] }
          }
        });

        assignmentResults.push({ 
          assignment: assignment.name, 
          success: true,
          status: 'created'
        });
        newAssignmentsCount++;
      } catch (error) {
        console.error(`Error creating assignment ${assignment.name}:`, error);
        assignmentResults.push({
          assignment: assignment.name,
          success: false,
          error: 'Failed to create assignment'
        });
      }
    }

    // Record sync results in the user's syncStatus field in Firebase
    try {
      const db = admin.database();
      const syncStatusRef = db.ref(`users/${userId}/syncStatus`);
      await syncStatusRef.set({
        status: 'complete',
        results: {
          coursesCreated: coursePageIds.size - existingCourseNames.size,
          totalAssignments: assignments.length,
          newAssignmentsCreated: newAssignmentsCount,
          skippedAssignments: skippedAssignmentsCount
        },
        completedAt: new Date().toISOString()
      });
    } catch (dbError) {
      console.error("Error saving sync results to database:", dbError);
    }

    // Clean up Firebase connections
    try {
      await admin.app().delete();
    } catch (cleanupError) {
      console.error("Error cleaning up Firebase app:", cleanupError);
    }

    console.log("Background sync completed successfully");
    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Sync completed in background',
        results: {
          coursesCreated: coursePageIds.size - existingCourseNames.size,
          totalAssignments: assignments.length,
          newAssignmentsCreated: newAssignmentsCount,
          skippedAssignments: skippedAssignmentsCount,
          assignments: assignmentResults
        }
      })
    };
  } catch (error) {
    console.error('Background sync error:', error);
    
    // Update the sync status to error
    try {
      const body = JSON.parse(event.body || '{}');
      const { userId } = body;
      
      if (userId) {
        const db = admin.database();
        const syncStatusRef = db.ref(`users/${userId}/syncStatus`);
        await syncStatusRef.set({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorAt: new Date().toISOString()
        });
      }
    } catch (statusError) {
      console.error("Error updating sync status to error:", statusError);
    }
    
    // Clean up Firebase connections even on error
    try {
      await admin.app().delete();
    } catch (cleanupError) {
      console.error("Error cleaning up Firebase app:", cleanupError);
    }
    
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
}; 