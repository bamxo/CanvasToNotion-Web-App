// src/scripts/repairEmailMigration.ts
//
// Repairs a user whose email address changed upstream (e.g. a university moving
// students from students.foo.edu to foo.edu) while their Google identity stayed
// the same.
//
// Symptom: googleAuth 500s with auth/internal-error on the provider-link step,
// because it looks the user up by email, doesn't find the new address, creates a
// fresh account, and then cannot attach a Google `sub` that is already attached
// to the user's older account.
//
// Repair: point the real account at the new address and remove the empty shell
// that the failed sign-ins left behind.
//
//   npm run repair:email-migration -- --from old@a.edu --to new@b.edu   # preview
//   npm run repair:email-migration -- --from old@a.edu --to new@b.edu --apply
//
// Refuses to run unless the source account has google.com linked and the target
// address is either free or held by a provider-less, never-used, profile-less
// shell - so it cannot clobber a real account.
import dotenv from 'dotenv';
import { admin, getDatabase, getFirebaseAdmin } from '../config/firebaseAdmin';

dotenv.config();

const LOG = '[repair-email-migration]';

const argValue = (flag: string): string | undefined => {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

async function main(): Promise<void> {
  const auth = getFirebaseAdmin().auth();
  const db = getDatabase();

  const from = argValue('--from');
  const to = argValue('--to');
  const apply = process.argv.slice(2).includes('--apply');

  if (!from || !to) {
    console.error(`${LOG} usage: --from old@a.edu --to new@b.edu [--apply]`);
    process.exit(1);
  }

  console.log(`${LOG} project: ${process.env.FIREBASE_DATABASE_URL ?? '(unset)'}`);
  console.log(`${LOG} mode: ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  console.log(`${LOG} from: ${from}`);
  console.log(`${LOG} to:   ${to}`);

  // --- source: the account that owns the Google identity and the user's data
  const source = await auth.getUserByEmail(from);
  const google = source.providerData.find((p) => p.providerId === 'google.com');

  if (!google) {
    throw new Error(
      `source account ${source.uid} has no google.com provider - wrong account, aborting`
    );
  }

  const sourceProfile = await db.ref(`users/${source.uid}`).once('value');
  console.log(`${LOG} source uid: ${source.uid}`);
  console.log(`${LOG} source google sub: ${google.uid}`);
  console.log(`${LOG} source lastSignIn: ${source.metadata.lastSignInTime ?? 'never'}`);
  console.log(
    `${LOG} source profile: ${sourceProfile.exists() ? `exists (tier: ${sourceProfile.val()?.tier ?? 'unset'})` : 'MISSING'}`
  );

  // --- target: must be free, or an empty shell left by the failed sign-ins
  let shell: admin.auth.UserRecord | undefined;
  try {
    shell = await auth.getUserByEmail(to);
  } catch (err) {
    if ((err as { code?: string })?.code !== 'auth/user-not-found') {
      throw err;
    }
    console.log(`${LOG} target address is free`);
  }

  if (shell) {
    const shellProfile = await db.ref(`users/${shell.uid}`).once('value');
    const isEmptyShell =
      shell.providerData.length === 0 &&
      !shell.metadata.lastSignInTime &&
      !shellProfile.exists();

    console.log(`${LOG} target held by uid: ${shell.uid}`);
    console.log(`${LOG}   providers: ${shell.providerData.length}`);
    console.log(`${LOG}   lastSignIn: ${shell.metadata.lastSignInTime ?? 'never'}`);
    console.log(`${LOG}   profile: ${shellProfile.exists() ? 'EXISTS' : 'none'}`);

    if (!isEmptyShell) {
      throw new Error(
        `target account ${shell.uid} is a real account (has providers, sign-ins, or a profile) - aborting`
      );
    }

    if (shell.uid === source.uid) {
      console.log(`${LOG} nothing to do - source already holds the target address`);
      return;
    }

    console.log(`${LOG} plan: delete empty shell ${shell.uid}`);
  }

  console.log(`${LOG} plan: set ${source.uid} email to ${to} (emailVerified: true)`);

  if (!apply) {
    console.log(`${LOG} dry run complete - re-run with --apply to perform it`);
    return;
  }

  // Order matters: the shell must release the address before the real account
  // can take it.
  if (shell) {
    await auth.deleteUser(shell.uid);
    console.log(`${LOG} deleted shell ${shell.uid}`);
  }

  // Changing the email clears emailVerified, so restore it - Google verified
  // this address, which is where the new value came from.
  await auth.updateUser(source.uid, { email: to, emailVerified: true });
  console.log(`${LOG} updated ${source.uid} -> ${to}`);

  if (sourceProfile.exists()) {
    await db.ref(`users/${source.uid}/email`).set(to);
    console.log(`${LOG} updated profile email for ${source.uid}`);
  }

  const after = await auth.getUser(source.uid);
  console.log(`${LOG} verify: email=${after.email} emailVerified=${after.emailVerified}`);
  console.log(
    `${LOG} verify: providers=${after.providerData.map((p) => p.providerId).join(', ')}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`${LOG} failed:`, err instanceof Error ? err.message : err);
    process.exit(1);
  });
