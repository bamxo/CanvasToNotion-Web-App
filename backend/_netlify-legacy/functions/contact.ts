import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import * as nodemailer from 'nodemailer';
import * as validator from 'validator';

import * as fs from 'fs';
import * as path from 'path';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CORS headers
const getCorsHeaders = (origin?: string) => {
  const allowedOrigins = [
    'https://canvastonotion.netlify.app',
    'https://canvastonotion.io',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const allowedOrigin = allowedOrigins.includes(origin || '') ? origin || allowedOrigins[0] : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '86400',
  };
};

// Rate limiting function
const checkRateLimit = (ip: string): { allowed: boolean; resetTime?: number } => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Max 5 emails per 15 minutes per IP

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(ip, record);
  return { allowed: true };
};

// Input validation and sanitization
const validateAndSanitizeInput = (data: any) => {
  const errors: string[] = [];

  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!data.email || !validator.isEmail(data.email)) {
    errors.push('Valid email address is required');
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  if (!data.inquiry || !['general', 'support', 'feature', 'bug', 'billing', 'partnership'].includes(data.inquiry)) {
    errors.push('Valid inquiry type is required');
  }

  // Sanitize inputs
  const sanitized = {
    name: validator.escape(data.name?.trim() || ''),
    email: validator.normalizeEmail(data.email || '') || '',
    message: validator.escape(data.message?.trim() || ''),
    inquiry: data.inquiry || 'general'
  };

  // Additional spam checks
  const spamKeywords = ['viagra', 'casino', 'lottery', 'prize', 'winner', 'urgent', 'click here', 'act now'];
  const messageText = data.message?.toLowerCase() || '';
  const hasSpamKeywords = spamKeywords.some(keyword => messageText.includes(keyword));

  if (hasSpamKeywords) {
    errors.push('Message content appears to be spam');
  }

  // Check for excessive links
  const linkCount = (messageText.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) {
    errors.push('Too many links in message');
  }

  return { sanitized, errors };
};

// File validation
const validateFiles = (files: Array<{ filename: string; path: string; size: number; mimetype: string }>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 5;
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif'
  ];

  if (files.length > maxFiles) {
    errors.push(`Too many files. Maximum ${maxFiles} files allowed.`);
  }

  files.forEach((file, index) => {
    if (file.size > maxFileSize) {
      errors.push(`File ${index + 1} (${file.filename}) is too large. Maximum size is 10MB.`);
    }

    if (!allowedTypes.includes(file.mimetype || '')) {
      errors.push(`File ${index + 1} (${file.filename}) has unsupported file type.`);
    }
  });

  return { valid: errors.length === 0, errors };
};

// Email sending function with attachments
const sendContactEmail = async (data: any, files: Array<{ filename: string; path: string; size: number; mimetype: string }> = []) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const inquiryTypeMap = {
    general: 'General Question',
    support: 'Technical Support',
    feature: 'Feature Request',
    bug: 'Bug Report',
    billing: 'Billing',
    partnership: 'Partnership'
  };

  // Prepare attachments
  const attachments = files.map(file => ({
    filename: file.filename || 'attachment',
    path: file.path,
    contentType: file.mimetype || 'application/octet-stream'
  }));

  const attachmentInfo = files.length > 0 
    ? `<div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
         <h4 style="color: #0369a1; margin-top: 0;">Attachments (${files.length})</h4>
         <ul style="margin: 0; padding-left: 20px;">
           ${files.map(file => `<li>${file.filename} (${(file.size / 1024).toFixed(1)} KB)</li>`).join('')}
         </ul>
       </div>`
    : '';

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: 'canvastonotioninfo@gmail.com',
    subject: `[Contact Form] ${inquiryTypeMap[data.inquiry as keyof typeof inquiryTypeMap]} - ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #4f46e5; margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Inquiry Type:</strong> ${inquiryTypeMap[data.inquiry as keyof typeof inquiryTypeMap]}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Message</h3>
          <div style="white-space: pre-wrap; line-height: 1.6;">${data.message}</div>
        </div>
        
        ${attachmentInfo}
        
        <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Reply Instructions:</strong> Please respond directly to ${data.email}
          </p>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
          <p>This email was sent from the CanvasToNotion contact form.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    `,
    replyTo: data.email,
    attachments: attachments
  };

  await transporter.sendMail(mailOptions);

  // Clean up temporary files
  files.forEach(file => {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Error cleaning up file:', file.path, error);
    }
  });
};

// Simple multipart parser for Netlify Functions
const parseMultipartFormSimple = (event: HandlerEvent): { fields: any; files: Array<{ filename: string; content: Buffer; size: number; mimetype: string }> } => {
  const fields: any = {};
  const files: Array<{ filename: string; content: Buffer; size: number; mimetype: string }> = [];

  // Get the boundary from content-type header
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in content-type header');
  }
  
  const boundary = '--' + boundaryMatch[1];
  console.log('Boundary:', boundary);

  // Convert the event body to a buffer
  let body: Buffer;
  if (event.isBase64Encoded) {
    body = Buffer.from(event.body || '', 'base64');
  } else {
    body = Buffer.from(event.body || '', 'utf8');
  }
  console.log('Body buffer created, length:', body.length);

  // Split the body by boundary
  const parts = body.toString('binary').split(boundary);
  console.log('Found', parts.length - 2, 'parts'); // -2 because first and last are empty/end markers

  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part.trim()) continue;

    // Find the double CRLF that separates headers from content
    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headerSection = part.substring(0, headerEndIndex);
    const contentSection = part.substring(headerEndIndex + 4);

    // Parse the Content-Disposition header
    const dispositionMatch = headerSection.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    if (filename) {
      // This is a file
      const contentTypeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
      const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';

      // Convert content back to buffer (it was converted to string with 'binary' encoding)
      const fileContent = Buffer.from(contentSection.substring(0, contentSection.length - 2), 'binary'); // -2 to remove trailing \r\n

      files.push({
        filename: filename,
        content: fileContent,
        size: fileContent.length,
        mimetype: mimeType
      });

      console.log('File parsed:', filename, 'size:', fileContent.length, 'type:', mimeType);
    } else {
      // This is a regular field
      const fieldValue = contentSection.substring(0, contentSection.length - 2).trim(); // -2 to remove trailing \r\n
      fields[fieldName] = fieldValue;
      console.log('Field parsed:', fieldName, '=', fieldValue);
    }
  }

  return { fields, files };
};

// Parse multipart form data using busboy (fallback to simple parser if busboy fails)
const parseMultipartForm = async (event: HandlerEvent): Promise<{ fields: any; files: Array<{ filename: string; path: string; size: number; mimetype: string }> }> => {
  try {
    console.log('Attempting simple multipart parsing...');
    const { fields, files: simpleFiles } = parseMultipartFormSimple(event);
    
    // Convert simple files to file objects with temp paths
    const files: Array<{ filename: string; path: string; size: number; mimetype: string }> = [];
    
    for (const file of simpleFiles) {
      const safeName = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const tempPath = path.join('/tmp', `upload-${Date.now()}-${Math.random().toString(36)}-${safeName}`);
      
      // Write file to temp location
      fs.writeFileSync(tempPath, file.content);
      
      files.push({
        filename: file.filename,
        path: tempPath,
        size: file.size,
        mimetype: file.mimetype
      });
      
      console.log('File saved to:', tempPath);
    }
    
    return { fields, files };
  } catch (error) {
    console.error('Simple multipart parsing failed:', error);
    throw error;
  }
};

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get client IP for rate limiting
    const clientIP = event.headers['x-forwarded-for'] || 
                    event.headers['x-real-ip'] || 
                    context.clientContext?.ip || 
                    'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      const resetTime = rateLimitResult.resetTime || Date.now();
      const minutesLeft = Math.ceil((resetTime - Date.now()) / (60 * 1000));
      
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'Retry-After': (minutesLeft * 60).toString(),
        },
        body: JSON.stringify({ 
          error: `Too many requests. Please try again in ${minutesLeft} minutes.` 
        }),
      };
    }

    let formData: { fields: any; files: Array<{ filename: string; path: string; size: number; mimetype: string }> };
    
    // Check if this is multipart form data or JSON
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    console.log('Content-Type:', contentType);
    console.log('Event body length:', event.body?.length || 0);
    console.log('Is base64 encoded:', event.isBase64Encoded);
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart form data...');
      try {
        // Parse multipart form data
        formData = await parseMultipartForm(event);
        console.log(`Parsed form data: ${formData.files.length} files, fields:`, Object.keys(formData.fields));
      } catch (parseError) {
        console.error('Error parsing multipart form data:', parseError);
        throw parseError;
      }
    } else {
      console.log('Processing JSON data...');
      // Parse JSON data (for backward compatibility)
      const body = JSON.parse(event.body || '{}');
      formData = { fields: body, files: [] };
    }

    // Validate and sanitize input
    const { sanitized, errors } = validateAndSanitizeInput(formData.fields);

    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: errors.join(', ') }),
      };
    }

    // Validate files if any
    if (formData.files.length > 0) {
      const fileValidation = validateFiles(formData.files);
      if (!fileValidation.valid) {
        // Clean up uploaded files
        formData.files.forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (error) {
            console.error('Error cleaning up file:', file.path, error);
          }
        });

        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: fileValidation.errors.join(', ') }),
        };
      }
    }

    // Check if email service is configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Email service not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service temporarily unavailable' }),
      };
    }

    // Send email with attachments
    console.log(`Sending email with ${formData.files.length} attachments...`);
    await sendContactEmail(sanitized, formData.files);
    console.log('Email sent successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Your message has been sent successfully!' 
      }),
    };

  } catch (error) {
    console.error('Contact form error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      event: {
        httpMethod: event.httpMethod,
        headers: event.headers,
        bodyLength: event.body?.length || 0,
        isBase64Encoded: event.isBase64Encoded
      }
    });
    
    // Provide more specific error messages for common issues
    let errorMessage = 'Failed to send message. Please try again later.';
    
    if (error instanceof Error) {
      if (error.message.includes('Email service')) {
        errorMessage = 'Email service is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('parse') || error.message.includes('multipart')) {
        errorMessage = 'Invalid file format. Please check your attachments and try again.';
      }
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage
      }),
    };
  }
}; 