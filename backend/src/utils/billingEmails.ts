// src/utils/billingEmails.ts
//
// Branded transactional emails for the billing lifecycle: Pro upgrade, Lifetime
// purchase, subscription cancellation, payment failure and Lifetime refund.
//
// Mirrors passwordResetEmail.ts on purpose - same nodemailer Gmail transport
// (GMAIL_USER / GMAIL_APP_PASSWORD), same inline-logo attachment and the same
// dark card shell - so every message the user gets from us looks like one product.
//
// The senders take pre-formatted strings (amounts, dates, URLs). Formatting from
// Stripe's raw cents/timestamps lives in billing/notify.ts, next to the call
// sites in the webhook handler. Amount/date fields are optional: when Stripe's
// payload doesn't carry one, the copy falls back to pointing at billing settings
// rather than printing a blank.
import * as nodemailer from 'nodemailer';
import { C2N_LOGO_PNG_BASE64 } from '../assets/c2nLogo';

const LOGO_CID = 'c2n-logo';

// Brand colours (matches c2n-logo-dark.svg / passwordResetEmail.ts).
const BG = '#0d0d0d';
const CARD = '#161616';
const BORDER = '#2a2a2a';
const ACCENT = '#F05323';
const TEXT = '#ffffff';
const MUTED = '#9a9a9a';

const FONT = 'Arial, Helvetica, sans-serif';

type Cta = { label: string; url: string };

type LayoutParts = {
  heading: string;
  paragraphs: string[];
  cta?: Cta;
  footerNote?: string;
};

const paragraph = (html: string): string =>
  `<p style="margin:0 0 16px 0; font-family:${FONT}; font-size:15px; line-height:1.6; color:${MUTED};">${html}</p>`;

const ctaBlock = (cta: Cta): string => `
          <tr>
            <td align="center" style="padding:8px 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:${ACCENT};">
                    <a href="${cta.url}" style="display:inline-block; padding:14px 32px; font-family:${FONT}; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:10px;">${cta.label}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

const buildHtml = ({ heading, paragraphs, cta, footerNote }: LayoutParts): string => `
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
              <h1 style="margin:0 0 12px 0; font-family:${FONT}; font-size:24px; line-height:1.3; color:${TEXT};">${heading}</h1>
              ${paragraphs.map(paragraph).join('\n              ')}
            </td>
          </tr>
          ${cta ? ctaBlock(cta) : ''}
          <tr>
            <td style="padding:24px 40px 40px 40px; border-top:1px solid ${BORDER};">
              ${footerNote ? `<p style="margin:24px 0 0 0; font-family:${FONT}; font-size:12px; line-height:1.6; color:${MUTED};">${footerNote}</p>` : ''}
              <p style="margin:12px 0 0 0; font-family:${FONT}; font-size:12px; color:${MUTED};">
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

const buildText = (heading: string, lines: string[], cta?: Cta, footerNote?: string): string => {
  const parts = [heading, '', ...lines];
  if (cta) parts.push('', `${cta.label}: ${cta.url}`);
  if (footerNote) parts.push('', footerNote);
  parts.push('', 'Canvas to Notion');
  return parts.join('\n');
};

const sendBillingEmail = async (
  to: string,
  subject: string,
  heading: string,
  lines: string[],
  cta?: Cta,
  footerNote?: string
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `Canvas to Notion <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: buildText(heading, lines, cta, footerNote),
    html: buildHtml({ heading, paragraphs: lines, cta, footerNote }),
    attachments: [
      {
        filename: 'c2n-logo.png',
        content: Buffer.from(C2N_LOGO_PNG_BASE64, 'base64'),
        contentType: 'image/png',
        cid: LOGO_CID,
      },
    ],
  });
};

/**
 * "You're on Pro" - sent when a Pro subscription checkout completes.
 *
 * @param amount           formatted price, e.g. "$5.00" (optional)
 * @param interval         billing interval word, e.g. "month" (optional)
 * @param nextBillingDate  formatted date the card is next charged (optional)
 * @param manageUrl        link to the app's billing settings
 */
export const sendProUpgradeEmail = (
  to: string,
  { amount, interval, nextBillingDate, manageUrl }: {
    amount?: string | null;
    interval?: string | null;
    nextBillingDate?: string | null;
    manageUrl: string;
  }
): Promise<void> => {
  const billingLine =
    amount && interval && nextBillingDate
      ? `You're being charged ${amount} per ${interval}. Your next payment is on ${nextBillingDate}.`
      : `You can see your plan price and next payment date anytime in your billing settings.`;
  return sendBillingEmail(
    to,
    "You're on Canvas to Notion Pro",
    'Welcome to Pro',
    [
      `Your payment went through and Pro is active. You now have unlimited class syncs and every Pro feature unlocked.`,
      billingLine,
      `You can update your card, switch plans or cancel anytime from your billing settings.`,
    ],
    { label: 'Manage billing', url: manageUrl }
  );
};

/**
 * "Your Lifetime access" - sent when a one-time Lifetime payment completes.
 *
 * @param amount               formatted one-time price, e.g. "$10.00" (optional)
 * @param refundEligibleUntil  formatted date the 7-day refund window closes (optional)
 * @param manageUrl            link to the app's billing settings
 */
export const sendLifetimePurchaseEmail = (
  to: string,
  { amount, refundEligibleUntil, manageUrl }: {
    amount?: string | null;
    refundEligibleUntil?: string | null;
    manageUrl: string;
  }
): Promise<void> => {
  const chargeLine = amount
    ? `Thanks for going Lifetime. We charged a one-time ${amount} and your account now has every feature, for good - no renewals, no subscription.`
    : `Thanks for going Lifetime. Your account now has every feature, for good - no renewals, no subscription.`;
  const refundLine = refundEligibleUntil
    ? `If you change your mind, you can request a full refund from your billing settings until ${refundEligibleUntil}. After that the purchase is final.`
    : `If you change your mind, you can request a full refund from your billing settings within 7 days of your purchase. After that the purchase is final.`;
  return sendBillingEmail(
    to,
    'Your Canvas to Notion Lifetime access',
    'Lifetime access is yours',
    [chargeLine, refundLine],
    { label: 'Manage billing', url: manageUrl }
  );
};

/**
 * "Your Pro subscription is canceled" - sent when a Pro subscription is set to
 * cancel at period end.
 *
 * @param accessUntil     formatted date Pro access ends (optional)
 * @param resubscribeUrl  link to the app's billing settings
 */
export const sendSubscriptionCanceledEmail = (
  to: string,
  { accessUntil, resubscribeUrl }: { accessUntil?: string | null; resubscribeUrl: string }
): Promise<void> => {
  const untilPhrase = accessUntil ? `until ${accessUntil}` : `until the end of your current billing period`;
  return sendBillingEmail(
    to,
    'Your Pro subscription is canceled',
    'Your Pro subscription is canceled',
    [
      `This confirms your Pro subscription won't renew. You keep full Pro access ${untilPhrase}, and after that your account moves to the free plan.`,
      `Nothing else is required from you. If you change your mind, you can resubscribe anytime and pick up right where you left off.`,
    ],
    { label: 'Resubscribe', url: resubscribeUrl }
  );
};

/**
 * "Payment failed" - sent when an invoice payment fails and the subscription
 * enters its grace period.
 *
 * @param accessUntil       formatted date Pro access lapses if the card isn't fixed (optional)
 * @param updatePaymentUrl  link to the app's billing settings
 */
export const sendPaymentFailedEmail = (
  to: string,
  { accessUntil, updatePaymentUrl }: { accessUntil?: string | null; updatePaymentUrl: string }
): Promise<void> => {
  const graceLine = accessUntil
    ? `We'll keep retrying, and your Pro access stays on until ${accessUntil}. If the payment still hasn't cleared by then, your account drops to the free plan.`
    : `We'll keep retrying for a short grace period. If the payment still doesn't clear, your account drops to the free plan.`;
  return sendBillingEmail(
    to,
    'Payment failed — update your card to keep Pro',
    "We couldn't charge your card",
    [
      `Your latest Pro payment didn't go through. This usually means an expired card or a temporary hold from your bank.`,
      graceLine,
      `Updating your card now is the quickest way to avoid any interruption.`,
    ],
    { label: 'Update payment method', url: updatePaymentUrl }
  );
};

/**
 * "Your refund is on its way" - sent when a Lifetime purchase is refunded within
 * the 7-day window.
 *
 * @param amount   formatted refund amount, e.g. "$10.00" (optional)
 * @param newTier  the plan the account is on now: "pro" (subscription still
 *                 live) or "free"
 */
export const sendLifetimeRefundEmail = (
  to: string,
  { amount, newTier }: { amount?: string | null; newTier: string }
): Promise<void> => {
  const refundNoun = amount ? `a full refund of ${amount}` : `a full refund`;
  const planLine =
    newTier === 'pro'
      ? `Your Lifetime access has ended and your account is back on Pro for the rest of the billing period you'd already paid for.`
      : `Your Lifetime access has ended and your account is now on the free plan.`;
  const welcomeBack =
    newTier === 'pro'
      ? `You're welcome back on Pro or Lifetime whenever you want.`
      : `You're welcome back on any plan whenever you want.`;
  return sendBillingEmail(
    to,
    'Your Canvas to Notion refund is on its way',
    'Your refund is being processed',
    [
      `We've issued ${refundNoun} for your Lifetime purchase. It's processing now and should land back on your original payment method within about 10 business days, depending on your bank.`,
      planLine,
      welcomeBack,
    ]
  );
};
