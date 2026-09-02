// src/controllers/contactControllers.ts
// Ported from backend/netlify/functions/contact.ts.
//
// Differences from the Netlify version (all intentional):
//   * Multipart parsing is done by `multer` (memoryStorage) on the router
//     instead of the hand-rolled `parseMultipartFormSimple` / busboy fallback.
//   * Uploaded files stay in memory (Buffer) - no `/tmp` writes and no
//     `fs.unlinkSync` cleanup. nodemailer attachments use `content: buffer`
//     instead of `path`.
//   * Both `multipart/form-data` and `application/json` bodies are accepted:
//     for JSON the global `express.json()` fills `req.body`; for multipart
//     `multer` fills `req.body` (text fields) and `req.files`.
//
// Everything else - rate limiting, validation/sanitisation, spam checks, file
// validation, the email template and recipient - is kept identical.
import { Request, Response } from 'express';
import * as nodemailer from 'nodemailer';
import * as validator from 'validator';

interface UploadedFile {
  filename: string;
  content: Buffer;
  size: number;
  mimetype: string;
}

// Rate limiting store. Module scope so it survives warm invocations (matches
// the Netlify function).
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (ip: string): { allowed: boolean; resetTime?: number } => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Max 5 emails per 15 minutes per IP

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, resetTime: record.resetTime };
  }

  record.count++;
  rateLimitStore.set(ip, record);
  return { allowed: true };
};

// Input validation and sanitization
const validateAndSanitizeInput = (data: any) => {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!data.email || !validator.isEmail(data.email)) {
    errors.push('Valid email address is required');
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  if (
    !data.inquiry ||
    !['general', 'support', 'feature', 'bug', 'billing', 'partnership'].includes(data.inquiry)
  ) {
    errors.push('Valid inquiry type is required');
  }

  const sanitized = {
    name: validator.escape(data.name?.trim() || ''),
    email: validator.normalizeEmail(data.email || '') || '',
    message: validator.escape(data.message?.trim() || ''),
    inquiry: data.inquiry || 'general',
  };

  const spamKeywords = [
    'viagra',
    'casino',
    'lottery',
    'prize',
    'winner',
    'urgent',
    'click here',
    'act now',
  ];
  const messageText = data.message?.toLowerCase() || '';
  const hasSpamKeywords = spamKeywords.some((keyword) => messageText.includes(keyword));

  if (hasSpamKeywords) {
    errors.push('Message content appears to be spam');
  }

  const linkCount = (messageText.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) {
    errors.push('Too many links in message');
  }

  return { sanitized, errors };
};

// File validation
const validateFiles = (files: UploadedFile[]): { valid: boolean; errors: string[] } => {
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
    'image/gif',
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

// Email sending function with attachments (in-memory buffers)
const sendContactEmail = async (data: any, files: UploadedFile[] = []): Promise<void> => {
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
    partnership: 'Partnership',
  };

  const attachments = files.map((file) => ({
    filename: file.filename || 'attachment',
    content: file.content,
    contentType: file.mimetype || 'application/octet-stream',
  }));

  const attachmentInfo =
    files.length > 0
      ? `<div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
         <h4 style="color: #0369a1; margin-top: 0;">Attachments (${files.length})</h4>
         <ul style="margin: 0; padding-left: 20px;">
           ${files
             .map((file) => `<li>${file.filename} (${(file.size / 1024).toFixed(1)} KB)</li>`)
             .join('')}
         </ul>
       </div>`
      : '';

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: 'canvastonotioninfo@gmail.com',
    subject: `[Contact Form] ${
      inquiryTypeMap[data.inquiry as keyof typeof inquiryTypeMap]
    } - ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #4f46e5; margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Inquiry Type:</strong> ${
            inquiryTypeMap[data.inquiry as keyof typeof inquiryTypeMap]
          }</p>
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
    attachments,
  };

  await transporter.sendMail(mailOptions);
};

export const handleContact = async (req: Request, res: Response): Promise<void> => {
  try {
    // Client IP for rate limiting.
    const forwarded = req.headers['x-forwarded-for'];
    const clientIP =
      (typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined) ||
      (req.headers['x-real-ip'] as string | undefined) ||
      req.ip ||
      'unknown';

    // Rate limit check.
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      const resetTime = rateLimitResult.resetTime || Date.now();
      const minutesLeft = Math.ceil((resetTime - Date.now()) / (60 * 1000));

      res
        .status(429)
        .set('Retry-After', (minutesLeft * 60).toString())
        .json({ error: `Too many requests. Please try again in ${minutesLeft} minutes.` });
      return;
    }

    // Fields: multer populates req.body text fields for multipart; express.json
    // populates it for JSON requests.
    const fields = req.body || {};

    // Files: multer memoryStorage. `.any()` puts every file in req.files as an
    // array regardless of field name.
    const rawFiles: any[] = Array.isArray(req.files) ? req.files : [];
    const files: UploadedFile[] = rawFiles.map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      size: f.size,
      mimetype: f.mimetype,
    }));

    // Validate and sanitize input.
    const { sanitized, errors } = validateAndSanitizeInput(fields);
    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(', ') });
      return;
    }

    // Validate files if any.
    if (files.length > 0) {
      const fileValidation = validateFiles(files);
      if (!fileValidation.valid) {
        res.status(400).json({ error: fileValidation.errors.join(', ') });
        return;
      }
    }

    // Email service configured?
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Email service not configured');
      res.status(500).json({ error: 'Email service temporarily unavailable' });
      return;
    }

    await sendContactEmail(sanitized, files);

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully!',
    });
  } catch (error) {
    console.error('Contact form error:', error);

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

    res.status(500).json({ error: errorMessage });
  }
};
