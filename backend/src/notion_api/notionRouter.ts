// src/notion_api/notionRouter.ts
import express, { NextFunction, query, Request, response, Response } from 'express';
import axios, {AxiosResponse} from 'axios';
import { Client } from '@notionhq/client';
import { admin } from '../config/firebase-admin';
import { error } from 'console';
import { HttpError, InternalServerError } from 'express-openapi-validator/dist/framework/types';
import { request } from 'https';
import * as accountKey from '../../serviceAccountKey.json'
const router = express.Router();


const request_access_token = async function (callbackuri: string, uri: string, myCode: string, authKey: string): Promise<AxiosResponse>{
  /**
   * used https://developers.notion.com/reference/create-a-token as reference for post request
   */
  const res: AxiosResponse = await axios.post(uri, {
      headers: {
        "Authorization": `Basic ${authKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      data: {
        "grant_type": "authorization_code",
        "code": myCode,
        "redirect_uri": callbackuri,
      }
  });
  return res;
}
 

const receive_backend =  async (req: Request, res: Response, next:NextFunction) => {
  try {
    const { code } = req.query;

    // 1. Exchange code for access token
    if (typeof(process.env.OUR_REDIRECT_URI) !== 'string' 
          || process.env.AUTHORIZATION_KEY !== 'string') {
      throw error;
    }
    if (typeof(code) !== 'string'){
      throw error;
    }
    const tokenResponse = await request_access_token(process.env.OUR_REDIRECT_URI,
      "https://api.notion.com/v1/oauth/token",
      code, process.env.AUTHORIZATION_KEY);

    const { access_token, workspace_id } = tokenResponse.data;

    // 2. Initialize Notion Client
    const notion = new Client({ auth: access_token });

    // note -> this should be a different function
    // 3. Get accessible resources (pages + databases)
    const searchResponse = await notion.search({});
    const accessibleResources = searchResponse.results.map(item => ({
      id: item.id,
      type: item.object, // 'page' or 'database'
      title: 'title' in item ? item.title : 'Untitled'
    }));
    // uncertain if this will throw / no typechecking

  // this is returning to the notion servers your information. you want to fwd this
  const chained_json = {
      success: true,
      accessToken: access_token,
      workspaceId: workspace_id,
      accessible: accessibleResources
    };
  
  } catch (error: any) {
    console.error('Notion API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message || 'Notion API request failed'
    });
  }
}

const post_fb = async (req: Request, res: Response, next: NextFunction) => {
  try{
    if (process.env.ROOT !== typeof('string')) {
      throw error;
    }
    const {
      success,
      accessToken,
      workspaceId,
      accessibleResources}
    = req.body;

    const info = {success, accessToken, workspaceId, accessibleResources};
    const db = admin.database();
    const ref = db.ref(process.env.ROOT);
    console.log(process.env.ROOT);
    const newRef = ref.push();
    return newRef.set(req.body);

    // how to properly order these request thingies
  } catch{
    res.send(500);
    return InternalServerError;
  }
  
}

router.post('/token',receive_backend, post_fb, (req: Request, res: Response)=>{
  // uhh do something here i think
});
/*
curl -d'{ "data": {"my_token" : "tokenVal"}, "val":"__some_valid_value__"} ' \
-H "Content-Type: application/json" \
localhost:3000/api/notion/set_fb > test.html
*/
router.post('/set_fb', async (req:Request, res:Response) =>{
  try {
    const {val}  = req.body;
    const {data}= req.body;
    //simple typechecking. note, currently
    // you can just query this to spam info
    // and vunerable to attacks like ../geteverything
    if (typeof(val) !== 'string'){
      res.status(404).json({ message: 'No data available' });
      return;
    };

    const db = admin.database();
    const ref = db.ref(`users/${val}`);
    ref.push(data);

    res.status(200).json({
      message: 'User added successfully',
    });
  } catch {
    res.status(500).json({message: "hey guys"});
  }

});
  
// curl -G -d "val=INSERT_VAL" localhost:3000/api/notion/get_fb
router.get('/get_fb', async (req:Request, res:Response) => {
  try{

    const {val} = req.query;
    //simple typechecking. note, currently
    // you can just query this to spam info
    // and vunerable to attacks like ../geteverything
    if (typeof(val) !== 'string'){
      res.status(404).json({ message: 'No data available' });
      return;
    };
    const db = admin.database();
    const ref = db.ref(`users/${val}`);

    const snapshot = await ref.once('value');
    if (snapshot.exists()) {
      res.status(200).json(snapshot.val());  // Respond with the data from Firebase
      return;
    } 
    res.status(404).json({ message: 'No data available' });
    
  }
  catch {
    res.send(500);
  }
});

export default router;
/* test curl command in powershell
$body = @{ code = "03f51416-fae3-4cbc-a28e-771521728525" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/notion/token" -Method POST -ContentType "application/json" -Body $body
*/