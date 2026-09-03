// src/scripts/auditOrphanedAccounts.ts
//
// Read-only census of auth accounts that googleAuth can leave behind when its
// provider-link step fails: the user record gets created, linking throws, and
// the request 500s before the profile write. Those accounts have no providers,
// have never signed in, and can never sign in again - every retry re-enters the
// same failing link path.
//
//   npm run audit:orphaned-accounts
//
// Writes nothing.
import dotenv from 'dotenv';
import { getDatabase, getFirebaseAdmin } from '../config/firebaseAdmin';

dotenv.config();

const LOG = '[audit-orphaned-accounts]';

async function main(): Promise<void> {
  const auth = getFirebaseAdmin().auth();
  const db = getDatabase();

  console.log(`${LOG} project: ${process.env.FIREBASE_DATABASE_URL ?? '(unset)'}`);

  const profiles = await db.ref('users').once('value');
  const hasProfile = (uid: string) => profiles.child(uid).exists();

  let total = 0;
  let noProviders = 0;
  const orphaned: string[] = [];
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);

    for (const user of page.users) {
      total += 1;

      if (user.providerData.length > 0) {
        continue;
      }
      noProviders += 1;

      // Never signed in and no profile row - consistent with the link step
      // throwing straight after createUser.
      if (!user.metadata.lastSignInTime && !hasProfile(user.uid)) {
        orphaned.push(
          `${user.uid}  ${user.email ?? '(no email)'}  created ${user.metadata.creationTime}`
        );
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`${LOG} total accounts: ${total}`);
  console.log(`${LOG} accounts with zero providers: ${noProviders}`);
  console.log(`${LOG} of those, never signed in AND no profile: ${orphaned.length}`);

  for (const row of orphaned.sort()) {
    console.log(`${LOG}   ${row}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`${LOG} failed:`, err);
    process.exit(1);
  });
