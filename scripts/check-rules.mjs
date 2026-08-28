/**
 * Exercises firestore.rules against a running emulator.
 *
 * Run with `npm run check:rules`. A syntax error in the rules is a failed
 * production deploy and, worse, a tempting reason to "just fix it in the
 * console" — where the change is invisible to review. Catching it locally keeps
 * the repository the source of truth for authorization.
 *
 * Loading the ruleset proves it compiles. The assertions below then cover peer
 * verification, which is the one place where an ordinary member can change
 * somebody else's document and therefore the easiest thing to get wrong.
 * Asserting that every membership tier reads exactly what it should is still
 * the next step; see README.
 */
import { readFileSync } from 'node:fs';
import { deepStrictEqual } from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Read the port the CLI was told to use rather than repeating it, so the two
// cannot drift. FIRESTORE_EMULATOR_PORT overrides it when 8080 is already busy.
const firebaseJson = JSON.parse(readFileSync('firebase.json', 'utf8'));
const port = Number(
  process.env.FIRESTORE_EMULATOR_PORT ?? firebaseJson.emulators?.firestore?.port ?? 8080,
);

const env = await initializeTestEnvironment({
  projectId: 'rules-check',
  firestore: {
    rules: readFileSync('firebase/firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port,
  },
});
console.log('firestore.rules compiled successfully');

const REQUIRED_APPROVALS = 2;
const APPLICANT = 'applicant';
const MARIA = 'maria';
const JOHN = 'john';

const account = (uid, status, role = 'member') => ({
  uid,
  email: `${uid}@example.test`,
  displayName: uid,
  role,
  status,
});

const profile = (uid, status, approvedBy = []) => ({
  uid,
  firstName: uid,
  lastName: 'Test',
  gradYear: 2005,
  visibility: 'alumni',
  status,
  approvedBy,
});

/** Puts the three actors back to a known state, bypassing the rules. */
async function reset() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const uid of [MARIA, JOHN]) {
      await setDoc(doc(db, 'users', uid), account(uid, 'verified'));
      await setDoc(doc(db, 'profiles', uid), profile(uid, 'verified'));
    }
    await setDoc(doc(db, 'users', APPLICANT), account(APPLICANT, 'pending'));
    await setDoc(doc(db, 'profiles', APPLICANT), profile(APPLICANT, 'pending'));
  });
}

const as = (uid) => env.authenticatedContext(uid).firestore();

/** The write a member's browser makes when vouching for an applicant. */
const approvalWrite = (approvedBy, approver) => {
  const next = [...approvedBy, approver];
  return {
    approvedBy: next,
    status: next.length >= REQUIRED_APPROVALS ? 'verified' : 'pending',
  };
};

const checks = [
  [
    'an applicant cannot approve themselves',
    async () => {
      await assertFails(
        updateDoc(doc(as(APPLICANT), 'profiles', APPLICANT), approvalWrite([], APPLICANT)),
      );
    },
  ],
  [
    'an applicant cannot forge approvals from other members',
    async () => {
      await assertFails(
        updateDoc(doc(as(APPLICANT), 'profiles', APPLICANT), {
          approvedBy: [MARIA, JOHN],
          status: 'verified',
        }),
      );
    },
  ],
  [
    'one member is not enough to grant access',
    async () => {
      await assertFails(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), {
          approvedBy: [MARIA],
          status: 'verified',
        }),
      );
    },
  ],
  [
    'a member may vouch, leaving the applicant pending',
    async () => {
      await assertSucceeds(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), approvalWrite([], MARIA)),
      );
    },
  ],
  [
    'the same member cannot vouch twice',
    async () => {
      await assertSucceeds(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), approvalWrite([], MARIA)),
      );
      await assertFails(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), approvalWrite([MARIA], MARIA)),
      );
    },
  ],
  [
    'a member cannot smuggle other changes in alongside an approval',
    async () => {
      await assertFails(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), {
          ...approvalWrite([], MARIA),
          gradYear: 1999,
        }),
      );
    },
  ],
  [
    'the second distinct member verifies the applicant',
    async () => {
      await assertSucceeds(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), approvalWrite([], MARIA)),
      );
      await assertSucceeds(
        updateDoc(doc(as(JOHN), 'profiles', APPLICANT), approvalWrite([MARIA], JOHN)),
      );

      await env.withSecurityRulesDisabled(async (ctx) => {
        const snap = await getDoc(doc(ctx.firestore(), 'profiles', APPLICANT));
        deepStrictEqual(snap.data().status, 'verified');
        deepStrictEqual(snap.data().approvedBy, [MARIA, JOHN]);
      });
    },
  ],
  [
    'a newly approved member can now read the directory',
    async () => {
      await assertFails(getDoc(doc(as(APPLICANT), 'profiles', MARIA)));

      await assertSucceeds(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), approvalWrite([], MARIA)),
      );
      await assertSucceeds(
        updateDoc(doc(as(JOHN), 'profiles', APPLICANT), approvalWrite([MARIA], JOHN)),
      );

      // Access follows the approvals on the profile: nobody had to write the
      // applicant's private `users/{uid}` record, which approvers cannot touch.
      await assertSucceeds(getDoc(doc(as(APPLICANT), 'profiles', MARIA)));
    },
  ],
  [
    'an applicant can still edit their own profile while waiting',
    async () => {
      await assertSucceeds(
        updateDoc(doc(as(APPLICANT), 'profiles', APPLICANT), { city: 'Kochi' }),
      );
    },
  ],
  [
    'an applicant cannot quietly drop an approval they dislike',
    async () => {
      await assertSucceeds(
        updateDoc(doc(as(MARIA), 'profiles', APPLICANT), approvalWrite([], MARIA)),
      );
      await assertFails(
        updateDoc(doc(as(APPLICANT), 'profiles', APPLICANT), { approvedBy: [] }),
      );
    },
  ],
  [
    'an unverified stranger cannot vouch for anybody',
    async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'stranger'), account('stranger', 'pending'));
        await setDoc(doc(db, 'profiles', 'stranger'), profile('stranger', 'pending'));
      });
      await assertFails(
        updateDoc(doc(as('stranger'), 'profiles', APPLICANT), approvalWrite([], 'stranger')),
      );
    },
  ],
  [
    'the bootstrap Google email may create itself as superadmin',
    async () => {
      const email = 'jue.george@gmail.com';
      const uid = 'bootstrap';
      const db = env.authenticatedContext(uid, { email }).firestore();
      await assertSucceeds(
        setDoc(doc(db, 'users', uid), {
          uid,
          email,
          displayName: 'Jue',
          role: 'superadmin',
          status: 'verified',
        }),
      );
      await assertSucceeds(
        setDoc(doc(db, 'profiles', uid), {
          uid,
          firstName: 'Jue',
          lastName: 'George',
          gradYear: 2001,
          visibility: 'alumni',
          status: 'verified',
          approvedBy: [],
        }),
      );
    },
  ],
  [
    'anyone else is refused a superadmin self-create',
    async () => {
      await assertFails(
        setDoc(doc(as('stranger'), 'users', 'stranger'), {
          uid: 'stranger',
          email: 'stranger@example.test',
          displayName: 'Stranger',
          role: 'superadmin',
          status: 'verified',
        }),
      );
    },
  ],
  [
    'the bootstrap email may appoint an ordinary admin',
    async () => {
      const email = 'jue.george@gmail.com';
      const uid = 'bootstrap';
      await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', uid), {
          uid,
          email,
          displayName: 'Jue',
          role: 'superadmin',
          status: 'verified',
        });
        await setDoc(doc(db, 'users', MARIA), account(MARIA, 'verified'));
      });
      const db = env.authenticatedContext(uid, { email }).firestore();
      await assertSucceeds(updateDoc(doc(db, 'users', MARIA), { role: 'admin' }));
    },
  ],
  [
    'an ordinary admin cannot mint another admin',
    async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', MARIA), account(MARIA, 'verified', 'admin'));
        await setDoc(doc(db, 'users', JOHN), account(JOHN, 'verified'));
      });
      await assertFails(updateDoc(doc(as(MARIA), 'users', JOHN), { role: 'admin' }));
    },
  ],
  [
    'the bootstrap email cannot mint another superadmin',
    async () => {
      const email = 'jue.george@gmail.com';
      const uid = 'bootstrap';
      await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', uid), {
          uid,
          email,
          displayName: 'Jue',
          role: 'superadmin',
          status: 'verified',
        });
        await setDoc(doc(db, 'users', MARIA), account(MARIA, 'verified'));
      });
      const db = env.authenticatedContext(uid, { email }).firestore();
      await assertFails(
        updateDoc(doc(db, 'users', MARIA), { role: 'superadmin' }),
      );
    },
  ],
  [
    'the bootstrap account cannot be demoted',
    async () => {
      const email = 'jue.george@gmail.com';
      const uid = 'bootstrap';
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users', uid), {
          uid,
          email,
          displayName: 'Jue',
          role: 'superadmin',
          status: 'verified',
        });
      });
      const db = env.authenticatedContext(uid, { email }).firestore();
      await assertFails(updateDoc(doc(db, 'users', uid), { role: 'member' }));
    },
  ],
];

let failed = 0;
for (const [name, run] of checks) {
  await reset();
  try {
    await run();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${error.message}`);
  }
}

await env.cleanup();

if (failed) {
  console.error(`\n${failed} rules check(s) failed`);
  process.exit(1);
}
console.log(`\n${checks.length} rules checks passed`);
