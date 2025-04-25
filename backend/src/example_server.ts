import cors from 'cors';
import * as fs from 'node:fs';
import 'dotenv/config';
import express, {Response, Request, response} from 'express';
import { Client } from '@notionhq/client';
import {DatabaseObject} from './notion_api/interfaces.js'
import { cwd } from 'node:process';
import { ServerResponse } from 'node:http';
import * as functions from '';

const notion = new Client({ auth: process.env.NOTION_KEY })

const page = process.env.NOTION_PAGE_ID;
const app = express();

app.use(express.json());

const databaseHandler = async function (pageId:string, title:string) {
    //const pageId = (process.env.NOTION_PAGE_ID) ? process.env.NOTION_PAGE_ID : null;
    //const body = req.body; 
    //const title = (body == null) ? null : body.dbID;
    if (!pageId || !title) {
      return {status: 500};
    }
    // question -> how do we handle errors ? 
    try {
      const newDb = await notion.databases.create({
        
          parent: {
            type: "page_id",
            page_id: pageId,
          },
          title: [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ],
          properties: {
            Name: {
              title: {},
            },
          },
        
      });
        return { status: 200, message: "success!", data: newDb };
    } catch(error) {
      if (error instanceof Error) {
        return{ status: null, message: 'error', error: error.message };
      } else {
        return {status: null, message: 'unknown error', error };
      } 
    }
}
// Create new database. The page ID is set in the environment variables.
// ok.. wait. in 186, we had some like, typechecking to verify that objects were properly formatted.
// how do we do that in this case?


// ok, lets have some static 
app.post('/', async function (request: Request, response:Response) {
  // local cache

  if (page == undefined) {
    response.status(500).send();
    return;
  }
  const curr_dir: string = process.cwd();
  const myfile: string = '/localCache.json';
  //fs.writeFile(curr_dir + myfile, JSON.stringify(request.body), ()=>{console.log(curr_dir)});
  const {courses, assignment} = request.body;
  
  /*const formatted_assignment = assignment.map((elem: any)=>{
    return {'canvas_id': elem.id, 'name': elem.name, 'courseName': elem.courseName, 'description': elem.description};
  });*/
  /*for (int i = courses.length())*/
  const formatted_course = courses.map((elem: any) => {
    console.log(page, elem.name);
    let obj: any = databaseHandler(page, elem.name);
    if (obj.status != 200) {
      response.json(obj);
      return;
    }
  });
  response.status(200).send();
});

// Create new page. The database ID is provided in the web form.
async function pageHandler(request: Request, response: Response) {
    const { dbID, pageName, header } = request.body
  
    try {
      const newPage = await notion.pages.create({
        parent: {
          type: "database_id",
          database_id: dbID,
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: pageName,
                },
              },
            ],
          },
        },
        children: [
          {
            object: "block",
            heading_2: {
              rich_text: [
                {
                  text: {
                    content: header,
                  },
                },
              ],
            },
          },
        ],
      })
      response.json({ message: "success!", data: newPage })
    } catch (error) {
      response.json({ message: "error", error })
    }
  }
  
  // Create new block (page content). The page ID is provided in the web form.
  app.post("/blocks", async function (request, response) {
    const { pageID, content } = request.body
  
    try {
      const newBlock = await notion.blocks.children.append({
        block_id: pageID, // a block ID can be a page ID
        children: [
          {
            // Use a paragraph as a default but the form or request can be updated to allow for other block types: https://developers.notion.com/reference/block#keys
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: content,
                  },
                },
              ],
            },
          },
        ],
      })
      response.json({ message: "success!", data: newBlock })
    } catch (error) {
      response.json({ message: "error", error })
    }
  });
  
  // Create new page comments. The page ID is provided in the web form.
  app.post("/comments", async function (request, response) {
    const { pageID, comment } = request.body
  
    try {
      const newComment = await notion.comments.create({
        parent: {
          page_id: pageID,
        },
        rich_text: [
          {
            text: {
              content: comment,
            },
          },
        ],
      })
      response.json({ message: "success!", data: newComment })
    } catch (error) {
      response.json({ message: "error", error })
    }
  });



const listener = app.listen(8000, function () {
    console.log("Your app is listening on port 8000")
});