// src/notion_api/notionRouter.ts
import express, { Request, Response } from 'express';
import type { PartialBlockObjectResponse, BlockObjectResponse, DatabaseObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import axios from 'axios';
import { Client } from '@notionhq/client';
import { adminDb } from '../db';
import { database } from 'firebase-admin';

function isChildDatabaseBlock(
  block: PartialBlockObjectResponse | BlockObjectResponse
): block is BlockObjectResponse & { type: 'child_database', child_database: { title: string } } {
  return (
    'type' in block &&
    block.type === 'child_database' &&
    'child_database' in block &&
    typeof block.child_database?.title === 'string'
  );
}
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
// router.post('/sync', async (req: Request, res: Response) => {
//   try {
//     const { email, pageId, courses, assignments } = req.body;
    
//     // Validate input
//     if (!email || typeof email !== 'string' || !pageId) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Valid email and page ID are required' 
//       });
//     }

//     // Get user data
//     const userData = await getUserByEmail(adminDb, email);
//     if (!userData?.accessToken) {
//       return res.status(403).json({ 
//         success: false, 
//         error: 'Notion integration not connected' 
//       });
//     }

//     // Initialize Notion client
//     const notion = new Client({ auth: userData.accessToken });
//     const courseDatabases = new Map<number, string>();

//     // Verify parent page access first
//     try {
//       await notion.pages.retrieve({ page_id: pageId });
//     } catch (error) {
//       return res.status(403).json({
//         success: false,
//         error: `No access to parent page (${pageId}). Share it with your integration via Notion's page connections.`
//       });
//     }

//     const childrenResponse = await notion.blocks.children.list({
//       block_id: pageId,
//     });

//     // Create course databases under the selected parent
//     for (const course of courses) {

//       const courseName = course.name;

//       const databaseAlreadyExists = childrenResponse.results.some(child => {
//         if ("type" in child && child.type === "child_database") {
//           return child.child_database?.title === courseName;
//         }
//         return false;
//       });

//       if (databaseAlreadyExists) {
//         console.log(`database for ${courseName} already exists.`);
//         continue;
//       }


//       try {
//         const newDb = await notion.databases.create({
//           parent: { type: "page_id", page_id: pageId },
//           title: [{ type: "text", text: { content: course.name } }],
//           is_inline: true,
//           properties: {
//             Name: { title: {} },
//             DueDate: { date: {} },
//             Points: { number: {} },
//             URL: { url: {} },
//             Status: {
//               select: {
//                 options: [
//                   { name: "Not Started", color: "red" },
//                   { name: "In Progress", color: "yellow" },
//                   { name: "Completed", color: "green" }
//                 ]
//               }
//             }
//           }
//         });
//         courseDatabases.set(course.id, newDb.id);
//       } catch (error) {
//         console.error(`Failed to create database for ${course.name}:`, error);
//         continue; // Skip this course but continue with others
//       }
//     }

//     // Create assignments in their respective databases
//     const assignmentResults = [];
//     for (const assignment of assignments) {
//       const databaseId = courseDatabases.get(assignment.courseId);
//       if (!databaseId) {
//         assignmentResults.push({
//           assignment: assignment.name,
//           success: false,
//           error: 'Parent database not found'
//         });
//         continue;
//       }

//       try {
//         const dueDate = assignment.due_at ? 
//           { date: { start: new Date(assignment.due_at).toISOString() } } : 
//           { date: null };

//         await notion.pages.create({
//           parent: { database_id: databaseId },
//           properties: {
//             Name: { title: [{ text: { content: assignment.name } }] },
//             DueDate: dueDate,
//             Points: { number: assignment.points_possible || 0 },
//             URL: { url: assignment.html_url },
//             Status: { select: { name: "Not Started" } }
//           }
//         });
//         assignmentResults.push({ assignment: assignment.name, success: true });
//       } catch (error) {
//         assignmentResults.push({
//           assignment: assignment.name,
//           success: false,
//         });
//       }
//     }

//     res.json({
//       success: true,
//       message: 'Sync completed with partial results',
//       results: {
//         courses: courses.length,
//         assignments: assignmentResults
//       }
//     });

//   } catch (error: any) {
//     console.error('Sync error:', error);
//     res.status(500).json({
//       success: false,
//       error: error.code === 'object_not_found' 
//         ? 'Verify page sharing with your Notion integration' 
//         : error.message
//     });
//   }
// });

router.post('/sync', async (req: Request, res: Response) => {
  
  try {

    /*########## extracts canvas request data ##########*/
    const { email, pageId, courses, assignments } = req.body;
    console.log("First assignment object:", assignments[0]);
    /*########################################################################################################*/


    /*########## ensures pageID and email are present and valid ##########*/
    if (!email || typeof email !== 'string' || !pageId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email and page ID are required' 
      });
    }
    /*########################################################################################################*/


    /*########## gets user data and access token from firebase ##########*/
    const userData = await getUserByEmail(adminDb, email); //
    if (!userData?.accessToken) {
      return res.status(403).json({ 
        success: false, 
        error: 'Notion integration not connected' 
      });
    }

    // initialize notion client using token
    const notion = new Client({ auth: userData.accessToken });
    /*########################################################################################################*/


    /*########## are we able to connect to the specified parent page? ##########*/
    try {
      await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: `No access to parent page (${pageId}). Share it with your integration via Notion's page connections.`
      });
    }
    /*##############################################################################################################################*/


    /*########## get all child blocks in parent page hierarchy ##########*/
    const childrenResponse = await notion.blocks.children.list({ block_id: pageId });
    /*########################################################################################################*/


    /*########## check to see if the Courses and Assignments DBs already exist ##########*/
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
    /*########################################################################################################*/


    /*########## create Courses and Assignments DB ##########*/
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
    /*##############################################################################################################################*/


    /*########## only add courses that aren't in the Courses DB ##########*/
    const existingCourseNames = new Set<string>(); // save all courses in the Courses DB here

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
        } else {
          // console.warn(`Could not find Notion page ID for existing course "${course.name}"`);
        }

        continue;
      }

      const coursePage = await notion.pages.create({
        parent: { database_id: coursesDbId },
        properties: {
          Name: { title: [{ text: { content: course.name } }] }
        }
      });
      coursePageIds.set(course.name, coursePage.id);
    }
    /*##############################################################################################################################*/


    // Create Assignment entries
    const assignmentResults = [];
    for (const assignment of assignments) {
      const courseName = courses.find((c: { id: string; name: string }) => c.id === assignment.courseId)?.name;
      const coursePageId = coursePageIds.get(courseName);

      if (!coursePageId) {
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

        assignmentResults.push({ assignment: assignment.name, success: true });

      } catch (error) {
        assignmentResults.push({
          assignment: assignment.name,
          success: false,
          error: 'Failed to create assignment'
        });
      }
    }

    res.json({
      success: true,
      message: 'Sync completed',
      results: {
        coursesCreated: courses.length,
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

router.get('/disconnect', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Get users reference
    const usersRef = adminDb.ref('users');
    
    // Find user by email
    const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, connected: false, error: 'User not found' });
    }

    const userEntries = Object.entries(snapshot.val());
    if (userEntries.length === 0) {
      return res.status(404).json({ success: false, connected: false, error: 'User data not found' });
    }

    // Get the user's ID and data
    const [userId, userData] = userEntries[0] as [string, UserData];

    // Check if accessToken exists and is non-empty
    const connected = !!userData.accessToken;

    if (connected) {
      // Remove the accessToken to disconnect the user
      const userRef = adminDb.ref(`users/${userId}/accessToken`);
      await userRef.remove();
      
      return res.json({ success: true, connected: false, message: 'User disconnected successfully' });
    }

    res.json({ success: true, connected, message: 'User is already disconnected' });
  } catch (error) {
    console.error('Error during disconnect:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/compare', async (req: Request, res: Response) => {
  try {
    // Log the entire incoming payload
    console.log('--- /compare endpoint called ---');
    console.log('Received payload:', JSON.stringify(req.body, null, 2));

    const { email, pageId, courses, assignments } = req.body;

    // Step 1: Validate input
    if (!email || !pageId || !Array.isArray(courses) || !Array.isArray(assignments)) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    console.log('Step 1: Payload validated');

    // Step 2: Get user data and access token
    const userData = await getUserByEmail(adminDb, email);
    if (!userData?.accessToken) {
      console.log('Notion integration not connected for user:', email);
      return res.status(403).json({ success: false, error: 'Notion integration not connected' });
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
        canvasAssignments.map(a => ({ name: a.name, id: a.id })));

      // All Notion assignment names for this course
      const notionAssignments = notionAssignmentsByCourse[course.id] || [];
      console.log(`Step 6: Notion assignments for courseId ${course.id}:`, notionAssignments);

      // Find Canvas assignments not present in Notion (by name)
      const onlyInCanvas = canvasAssignments.filter(
        (a: any) => !notionAssignments.includes(a.name)
      );
      console.log(`Step 6: Assignments only in Canvas for courseId ${course.id}:`, 
        onlyInCanvas.map(a => ({ name: a.name, id: a.id })));

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
    
    res.json({
      success: true,
      comparison
    });
  } catch (error: any) {
    console.error('Compare endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;