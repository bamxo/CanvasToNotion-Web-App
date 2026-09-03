// src/scripts/backfillLegacyTier.ts
//
// One-off, idempotent migration: give every pre-existing user `tier: 'legacy'`.
//
// Run it once when launching the pricing model:
//   npm run backfill:legacy-tier -- --dry-run   # preview, writes nothing
//   npm run backfill:legacy-tier                # apply
//
// It only touches users that have NO tier yet, so re-running it is safe and
// users created after the signup change (tier: 'free') are never overwritten.
//
// Connects with the same credentials the server uses:
//   FIREBASE_SERVICE_ACCOUNT  - service-account JSON
//   FIREBASE_DATABASE_URL     - Realtime Database URL  <-- be sure this is the
//                               database you actually mean to migrate.
import dotenv from 'dotenv';
import { getDatabase } from '../config/firebaseAdmin';
import { computeLegacyBackfill } from '../utils/backfillLegacyTier';

dotenv.config();

async function main(): Promise<void> {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const db = getDatabase();

  console.log(`[backfill-legacy-tier] database: ${process.env.FIREBASE_DATABASE_URL ?? '(unset)'}`);
  console.log(`[backfill-legacy-tier] mode: ${dryRun ? 'DRY RUN (no writes)' : 'APPLY'}`);

  const snapshot = await db.ref('users').once('value');
  const users = snapshot.val() as Record<string, { tier?: unknown } | null> | null;

  const totalUsers = users ? Object.keys(users).length : 0;
  const updates = computeLegacyBackfill(users);
  const toUpdate = Object.keys(updates).length;
  const skipped = totalUsers - toUpdate;

  console.log(`[backfill-legacy-tier] users scanned: ${totalUsers}`);
  console.log(`[backfill-legacy-tier] to set legacy: ${toUpdate}`);
  console.log(`[backfill-legacy-tier] already tiered / skipped: ${skipped}`);

  const sample = Object.keys(updates).slice(0, 10);
  if (sample.length) {
    console.log(`[backfill-legacy-tier] sample paths:\n  ${sample.join('\n  ')}`);
  }

  if (dryRun) {
    console.log('[backfill-legacy-tier] dry run complete - nothing written.');
    return;
  }

  if (toUpdate === 0) {
    console.log('[backfill-legacy-tier] nothing to do.');
    return;
  }

  await db.ref().update(updates);
  console.log(`[backfill-legacy-tier] done - ${toUpdate} user(s) set to legacy.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill-legacy-tier] failed:', err);
    process.exit(1);
  });
