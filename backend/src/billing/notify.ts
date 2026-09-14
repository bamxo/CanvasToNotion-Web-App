// backend/src/billing/notify.ts
//
// Glue between the Stripe webhook handler and the branded billing emails: turn
// Stripe's raw cents / epoch timestamps into display strings, and resolve a
// uid to the address we mail. Kept out of billingEmails.ts so the templates
// stay free of formatting and Firebase.
import { admin } from '../config/firebaseAdmin';

/** Cents -> "$10.00". Returns null when the amount is absent. */
export function formatUsd(cents: number | null | undefined): string | null {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

/** Epoch seconds -> "March 14, 2026" (UTC). Returns null when absent. */
export function formatDate(epochSeconds: number | null | undefined): string | null {
  if (typeof epochSeconds !== 'number' || Number.isNaN(epochSeconds)) return null;
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The address to send billing mail to for a user. Reads the Firebase Auth
 * record rather than the Realtime DB, which does not store the email. Never
 * throws - a missing account or a lookup error yields null so the webhook can
 * carry on (a failed email must not make Stripe retry the whole event).
 */
export async function getRecipientEmail(uid: string): Promise<string | null> {
  try {
    const record = await admin.auth().getUser(uid);
    return record.email ?? null;
  } catch (err) {
    console.warn(`[billing] getRecipientEmail: could not resolve email for ${uid}:`, (err as Error)?.message);
    return null;
  }
}
