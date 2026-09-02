import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { getFirebaseAdmin } from './firebase-admin';

dotenv.config();

if (!admin.apps.length) {
  getFirebaseAdmin();
}

const allowedOrigins = [
  'https://bamxo.github.io',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Module-level rate limit store — persists across invocations within a warm Lambda instance
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 30;
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= max) return false;
  record.count++;
  return true;
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);

  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Too many requests, please try again later.' })
    };
  }

  try {
    const snapshot = await admin.database().ref('users').once('value');
    const count = snapshot.numChildren();
    return { statusCode: 200, headers, body: JSON.stringify({ count }) };
  } catch (error) {
    console.error('Error fetching user count:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch user count' }) };
  }
};
