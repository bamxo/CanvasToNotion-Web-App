// src/scripts/inspectGoogleAuthUser.ts
//
// Read-only diagnostic for "Google authentication failed" (500) reports that
// only affect a single user. Dumps everything the googleAuth handler looks at
// so you can tell which of its steps would fail for that account.
//
//   npm run inspect:google-user -- someone@example.com
//
// Writes nothing. Connects with the same credentials the server uses:
//   FIREBASE_SERVICE_ACCOUNT  - service-account JSON
//   FIREBASE_DATABASE_URL     - Realtime Database URL
import dotenv from 'dotenv';
import { admin, getDatabase, getFirebaseAdmin } from '../config/firebaseAdmin';

dotenv.config();

// getFirebaseAdmin() initialises lazily, so go through it rather than
// admin.auth() - the latter looks for a default app that does not exist yet.
const auth = () => getFirebaseAdmin().auth();

const LOG = '[inspect-google-user]';

async function findAccountsClaimingEmail(email: string): Promise<void> {
  // A second account holding this address on one of its providers is what makes
  // the handler's getUserByEmail / provider-link / signInWithIdp steps diverge.
  const target = email.toLowerCase();
  const matches: string[] = [];
  let pageToken: string | undefined;

  do {
    const page = await auth().listUsers(1000, pageToken);

    for (const user of page.users) {
      const providerHit = user.providerData.find(
        (provider) => provider.email?.toLowerCase() === target
      );

      if (user.email?.toLowerCase() === target || providerHit) {
        matches.push(
          `${user.uid} (top-level email: ${user.email ?? 'none'}, providers: ${
            user.providerData.map((p) => p.providerId).join(', ') || 'none'
          })`
        );
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`${LOG} accounts claiming ${email}: ${matches.length}`);
  for (const match of matches) {
    console.log(`${LOG}   ${match}`);
  }
  if (matches.length > 1) {
    console.log(
      `${LOG} >> DUPLICATE ACCOUNTS. Google sign-in cannot link the provider ` +
        `while another account holds the same address.`
    );
  }
}

async function main(): Promise<void> {
  const email = process.argv.slice(2)[0];

  if (!email) {
    console.error(`${LOG} usage: npm run inspect:google-user -- someone@example.com`);
    process.exit(1);
  }

  console.log(`${LOG} project: ${process.env.FIREBASE_DATABASE_URL ?? '(unset)'}`);
  console.log(`${LOG} email: ${email}`);

  let userRecord: admin.auth.UserRecord | undefined;

  try {
    userRecord = await auth().getUserByEmail(email);
  } catch (err) {
    const code = (err as { code?: string })?.code;

    // Only a genuine user-not-found tells us anything about the account. Any
    // other code (credentials, network, no-app) is a fault in this script's
    // setup and must not be reported as account state.
    if (code !== 'auth/user-not-found') {
      throw err;
    }

    console.log(`${LOG} getUserByEmail: ${code}`);
    console.log(`${LOG} >> handler would fall through to createUser for this account.`);
  }

  if (userRecord) {
    console.log(`${LOG} uid: ${userRecord.uid}`);
    console.log(`${LOG} disabled: ${userRecord.disabled}`);
    console.log(`${LOG} emailVerified: ${userRecord.emailVerified}`);
    console.log(`${LOG} created: ${userRecord.metadata.creationTime}`);
    console.log(`${LOG} lastSignIn: ${userRecord.metadata.lastSignInTime}`);
    console.log(`${LOG} providers:`);

    for (const provider of userRecord.providerData) {
      console.log(
        `${LOG}   ${provider.providerId} (uid: ${provider.uid}, email: ${
          provider.email ?? 'none'
        })`
      );
    }

    const hasGoogle = userRecord.providerData.some((p) => p.providerId === 'google.com');
    console.log(`${LOG} google.com linked: ${hasGoogle}`);

    if (userRecord.disabled) {
      console.log(`${LOG} >> ACCOUNT DISABLED. signInWithIdp returns USER_DISABLED -> 500.`);
    }
    if (!hasGoogle) {
      console.log(`${LOG} >> handler would attempt providerToLink on this sign-in.`);
    }

    const snapshot = await getDatabase().ref(`users/${userRecord.uid}`).once('value');
    console.log(`${LOG} realtime-db profile exists: ${snapshot.exists()}`);
    if (snapshot.exists()) {
      console.log(`${LOG} tier: ${snapshot.val()?.tier ?? '(unset)'}`);
    }
  }

  await findAccountsClaimingEmail(email);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`${LOG} failed:`, err);
    process.exit(1);
  });
