// src/utils/passwordResetEmail.ts
//
// Sends the branded "reset your password" email. Kept separate from the auth
// controller so the controller stays thin and this file owns everything about
// the message: the nodemailer transport, the HTML template and the inline logo
// attachment.
//
// Transport reuses the same Gmail credentials already configured for the
// contact form (GMAIL_USER / GMAIL_APP_PASSWORD) - no new env vars.
import * as nodemailer from 'nodemailer';
import { C2N_LOGO_PNG_BASE64 } from '../assets/c2nLogo';

const LOGO_CID = 'c2n-logo';

// Brand colours (matches c2n-logo-dark.svg).
const BG = '#0d0d0d';
const CARD = '#161616';
const BORDER = '#2a2a2a';
const ACCENT = '#F05323';
const TEXT = '#ffffff';
const MUTED = '#9a9a9a';

const buildHtml = (resetUrl: string): string => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:0; background-color:${BG}; color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG}; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:${CARD}; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:40px 40px 24px 40px;">
              <img src="cid:${LOGO_CID}" width="140" alt="Canvas to Notion" style="display:block; border:0; outline:none; text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <h1 style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:24px; line-height:1.3; color:${TEXT};">Reset your password</h1>
              <p style="margin:0 0 28px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:${MUTED};">
                We got a request to reset your Canvas to Notion password. Click the button below to choose a new one. This link expires in one hour.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:${ACCENT};">
                    <a href="${resetUrl}" style="display:inline-block; padding:14px 32px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:10px;">Reset Password</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:${MUTED};">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 32px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; word-break:break-all;">
                <a href="${resetUrl}" style="color:${ACCENT}; text-decoration:none;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 40px 40px; border-top:1px solid ${BORDER};">
              <p style="margin:24px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:${MUTED};">
                If you didn't request this, you can safely ignore this email &mdash; your password won't change.
              </p>
              <p style="margin:12px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:${MUTED};">
                Canvas to Notion
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const buildText = (resetUrl: string): string =>
  `Reset your Canvas to Notion password\n\n` +
  `We got a request to reset your password. Open this link to choose a new one ` +
  `(expires in one hour):\n\n${resetUrl}\n\n` +
  `If you didn't request this, you can safely ignore this email.\n\nCanvas to Notion`;

/**
 * Send the branded password-reset email.
 *
 * @param to        recipient address
 * @param resetUrl  fully-qualified link to the app's /reset-password page,
 *                   already carrying the ?oobCode=... query param
 */
export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: `Canvas to Notion <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Reset your Canvas to Notion password',
    text: buildText(resetUrl),
    html: buildHtml(resetUrl),
    attachments: [
      {
        filename: 'c2n-logo.png',
        content: Buffer.from(C2N_LOGO_PNG_BASE64, 'base64'),
        contentType: 'image/png',
        cid: LOGO_CID
      }
    ]
  });
};
