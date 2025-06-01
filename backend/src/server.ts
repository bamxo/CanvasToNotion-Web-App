// src/server.ts
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Notion OAuth Configuration
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI;

// Token Exchange Endpoint
// In your server.ts file (or equivalent)
app.post('/api/notion/token', async (req, res) => {
  try {
    // Hardcoded authorization code for testing
    const code = '0397bf5d-1b2a-47e4-8613-3fca96f34da8';

    // Create URLSearchParams with type-safe values
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.NOTION_REDIRECT_URI ?? ''
    });

    const response = await axios.post(
      'https://api.notion.com/v1/oauth/token',
      params,
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

    res.json({
      success: true,
      accessToken: response.data.access_token,
      workspaceId: response.data.workspace_id
    });

  } catch (error) {
    console.error('Token exchange failed:', error.response?.data);
    res.status(400).json({
      success: false,
      error: 'Failed to authenticate with Notion'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
