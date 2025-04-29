// src/notion_api/notionRouter.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import { Client } from '@notionhq/client';

const router = express.Router();

router.post('/token', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    // 1. Exchange code for access token
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

    // 2. Initialize Notion Client
    const notion = new Client({ auth: access_token });

    // 3. Get accessible resources (pages + databases)
    const searchResponse = await notion.search({});
    const accessibleResources = searchResponse.results.map(item => ({
      id: item.id,
      type: item.object, // 'page' or 'database'
      title: 'title' in item ? item.title : 'Untitled'
    }));

    res.json({
      success: true,
      accessToken: access_token,
      workspaceId: workspace_id,
      accessibleResources
    });

  } catch (error: any) {
    console.error('Notion API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message || 'Notion API request failed'
    });
  }
});

export default router;
/* test curl command in powershell
$body = @{ code = "03f51416-fae3-4cbc-a28e-771521728525" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/notion/token" -Method POST -ContentType "application/json" -Body $body
*/