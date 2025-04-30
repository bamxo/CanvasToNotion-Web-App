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
import axios, { AxiosResponse } from 'axios';
import { request_access_token } from './notion_api/juan_api.js';
import { error } from 'node:console';

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
/*
// this is example code
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
}*/
const redirect_handler = async function (req: Request<{}, {}, {}, {code: string}>, res: Response, next: NextFunction) {
  // get authentication code from params
  try {
    // this stuff is done to 
    if (process.env.OUR_REDIRECT_URI == undefined || process.env.AUTHORIZATION_KEY == undefined){
      throw error;
    }
    const code = req.query.code;
    if (typeof(code) !== typeof('')){
      throw error;
    }
    request_access_token(process.env.OUR_REDIRECT_URI, "https://api.notion.com/v1/oauth/token", code, process.env.AUTHORIZATION_KEY) 
    .then((notion_res: AxiosResponse) => {
      next(notion_res);
    });
  }
  catch{
    res.send(500);
  } 
}

const process_data = async function (res: AxiosResponse) {
  // how do i do this?
}


// ok, lets have some static 
app.get('/redirect', redirect_handler, process_data);

const listener = app.listen(8000, function () {
    console.log("Your app is listening on port 8000")
});