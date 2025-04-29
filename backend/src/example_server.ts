import cors from 'cors';
import * as fs from 'node:fs';
import 'dotenv/config';
import express, {Response, Request, response, NextFunction} from 'express';
import { Client } from '@notionhq/client';
import {DatabaseObject, StorageObject} from './notion_api/interfaces.js'
import { cwd } from 'node:process';
import { ServerResponse } from 'node:http';
import * as openapi from 'express-openapi-validator';
import {load} from 'js-yaml';
import axios from 'axios';

const notion = new Client({ auth: process.env.NOTION_KEY })

const apiSpec = __dirname + 'api_spec/apiSpec.yaml';
const apiDoc = load(apiSpec); 

const page = process.env.NOTION_PAGE_ID;
const app = express();

app.use(openapi.middleware({apiSpec: apiSpec, 
                            validateRequests: true,
                            validateResponses: true
}));

app.use(express.json());
app.use();

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

const cache_data = async function (formatted_data: StorageObject) {
  // this is where we're supposed to cache our data

}
const redirect_handler = async function (req: Request, res: Response, next: NextFunction) {
  // get authentication code from params
  const auth = req.query.code;

  
}
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

app.get('/redirect', [redirect_handler]);

const listener = app.listen(8000, function () {
    console.log("Your app is listening on port 8000")
});