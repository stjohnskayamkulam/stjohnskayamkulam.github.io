# Alumni Network

A lightweight community hub for former students: find your classmates, see
what's happening, and take part. Built to be cheap to run and simple enough for
a volunteer committee to administer.

The product is organised around three questions, and every page answers at
least one of them:

| Question               | Where it's answered                                 |
| ---------------------- | --------------------------------------------------- |
| Who do I know?         | Alumni directory, filterable down to your own class |
| Where did everyone go? | Alumni map, filterable by graduating class          |
| What is happening?     | Events, class announcements                         |
| How can I participate? | RSVP to events, vouch for members you recognise     |

Graduation year is a first-class concept rather than a profile field, which is
what separates this from a generic social network. "Find My Classmates" is the
front door.

---

## Quick start

```bash
npm install
npm run dev
```

That's the whole setup. With no Firebase credentials present the app runs
against an in-memory backend seeded with 28 alumni across five decades and six
events — so every screen is worth looking at immediately.

In this mock mode, **Continue with Google** signs you in as an administrator so
the admin dashboard is reachable. There is no email-and-password sign-in —
Google is the only method, in demo and against Firebase alike.

### Commands

| Command               | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Development server with hot reload                     |
| `npm run build`       | Typecheck and produce the production bundle in `dist/` |
| `npm run preview`     | Serve the production build locally                     |
| `npm run lint`        | ESLint                                                 |
| `npm run typecheck`   | TypeScript with no emit                                |
| `npm test`            | Vitest suite                                           |
| `npm run test:watch`  | Vitest in watch mode                                   |
| `npm run check:rules` | Compile and exercise `firestore.rules` in the emulator |

`check:rules` needs a JDK 21+ on the path (the Firestore emulator is a Java
process) and a free port 8080. If something else is using 8080, change
`emulators.firestore.port` in `firebase.json` — the Firebase CLI reads the port
from there, so setting `FIRESTORE_EMULATOR_PORT` alone only moves the script and
not the emulator it talks to.

---

## Architecture

### Two interchangeable backends

Everything above the service layer is written against the interfaces in
`src/services/providers/types.ts`. Two implementations satisfy them:

- **`mockProvider`** — seed data, no network, no credentials
- **`firestoreProvider`** — Firebase Auth and Firestore

`src/config/env.ts` picks one: Firebase as soon as a project config is present,
mock otherwise. This is not just a developer convenience. It keeps Firestore
query construction in exactly one file, which is what makes the security rules
and indexes auditable — you can read every query the client can issue.

Components never import `firebase/firestore`. Timestamps are converted to ISO
strings at the provider boundary, so no `Timestamp` object ever reaches a
component.

### Layout

```
src/
  components/   presentational and composite UI, grouped by feature
  config/       env plumbing, navigation, school theme
  contexts/     auth session
  hooks/        useAuth, useAsync, useDebouncedValue
  layouts/      app shell
  pages/        one file per route
  services/     backend-agnostic API + the two providers
  types/        every Firestore document shape
  utils/        dates, analytics, class names
firebase/
  firestore.rules          the actual authorization boundary
  firestore.indexes.json   composite indexes the queries require
.github/
  workflows/deploy.yml     verify + publish to Pages
  scripts/base-path.sh     resolves the Pages base path
```

### Theming

`src/config/school.ts` is the only place a school name, colour, founding year or
logo appears. Colours are pushed into CSS custom properties that Tailwind's
theme maps onto `bg-brand` and friends, so the same codebase serves a different
school by changing environment variables.

### Analytics

`track()` in `src/utils/analytics.ts` takes a typed event name and never touches
a vendor SDK at the call site. Swapping GA4 for Plausible or PostHog means
editing one array in that file. Events cover the funnel that matters:
`registration`, `profile_completed`, `alumni_search`, `class_view`,
`event_rsvp`, `event_rsvp_cancelled`.

---

## Security model

**The React app enforces nothing.** It is a static bundle on a CDN: anyone can
read the JavaScript, extract the Firebase config, and call Firestore directly
with their own credentials, skipping every route guard. The guards in
`src/components/auth/RouteGuards.tsx` exist to give members a sensible
experience, not to keep anyone out.

`firebase/firestore.rules` is the real boundary. Four tiers of caller:

| Tier      | Can see                                                    |
| --------- | ---------------------------------------------------------- |
| Anonymous | Events and the marketing homepage                          |
| Pending   | Their own account and profile, nothing about other members |
| Verified  | The directory, classes, the map, and vouching for others   |
| Admin     | Everything, plus membership decisions and event management |

Decisions worth knowing about:

- **Signing up grants nothing.** Registration creates a `pending` record. The
  rules hardcode `role == 'member'`, `status == 'pending'` and an empty
  `approvedBy` on self-creation, so a crafted request body cannot smuggle in a
  promotion.
- **It takes two members to let someone in.** Any verified member can vouch for
  an applicant from `/approvals`; access is granted automatically on the second
  distinct approval. The rules let an approver append *only their own* uid to
  `profiles/{uid}.approvedBy`, and the write that appends the final approval is
  the only one permitted to flip `status` to `verified`. So no single person can
  admit anybody — including themselves — and an applicant can neither forge
  approvals nor delete one they dislike. `REQUIRED_APPROVALS` in
  `src/types/index.ts` and `requiredApprovals()` in the rules must be changed
  together.
- **Approvals live on the profile, not the account.** An approver has no rights
  over somebody else's private `users/{uid}` document, so verification is read
  from `profiles/{uid}` — by the rules and by the client alike. Admins can still
  verify a member outright, which is also the only way to bootstrap a directory
  that does not yet have two members to do the vouching.
- **Self-updates are allow-listed by field.** A member's own write to
  `users/{uid}` may touch only `displayName`, `photoURL` and `lastLoginAt`.
  Because `role` and `status` are absent from that list, nobody can promote
  themselves even by replaying an otherwise legitimate write.
- **Admins cannot create admins from the app.** Role changes are a deliberate
  console-only operation, so one compromised committee account cannot mint
  more.
- **RSVP can only move the counter by one.** Verified members may update
  `attendeeCount` on an event and nothing else, by exactly ±1, so the number
  can't be vandalised.
- **Events are public, attendees are not.** Upcoming reunions are the strongest
  reason for a lapsed alumnus to join, so they render before sign-in. Event
  documents must therefore never carry personal data; who is coming lives in a
  subcollection that requires verification.
- **The jobs board is member-only.** A public one attracts recruiters and
  scrapers, which is the dynamic that kills alumni networks.
- **Default deny.** An unmatched path is denied, so a new collection has to opt
  in rather than inherit a permissive default.

### Privacy, and one honest limitation

`AlumniProfile` carries a document-level `visibility` plus per-field
`fieldVisibility` (`alumni` / `class` / `private`), with contact details
defaulting to `private`. Directory queries return `DirectoryEntry`, which is
`AlumniProfile` with `email` and `phone` removed at the type level, and both
providers strip them on read. This is covered by tests.

The limitation: **Firestore rules cannot filter fields.** They allow or deny a
whole document. So a verified member who queries Firestore directly, bypassing
the app, can read the `email` field on a profile they are allowed to `get`.
Today's model therefore delivers "contact details are hidden from the alumni
directory UI", not "contact details are cryptographically unreadable by other
verified alumni".

Closing that gap means moving contact details into a sibling document such as
`profiles/{uid}/private/contact`, readable only by the owner and admins. The
data model is shaped so this is an additive change: `email` and `phone` are
already absent from `DirectoryEntry` and every list view already reads that
type. Do this before storing phone numbers for a real cohort.

### Setting up Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method**: enable **Google** only. Email/password
   stays off.
3. **Firestore Database**: create in production mode.
4. Add a Web app, copy the config into `.env.local` (see `.env.example`).
5. Deploy the rules and indexes:

```bash
npm install -g firebase-tools
firebase login
firebase use --add                                  # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

6. Add your production domain under **Authentication → Settings → Authorized
   domains**, or Google sign-in will fail with `auth/unauthorized-domain`.

### Creating the first admin

There is no bootstrap path in the app, by design — a self-service one would be
a privilege-escalation hole. Register normally, then in the Firebase console set
that user's `users/{uid}` document to `role: "admin"` and
`status: "verified"`. Sign out and back in.

From there, members verify each other: two existing members approving an
applicant from `/approvals` is enough. Until the directory has two members, use
**Verify now** in `/admin` to admit people directly.

### Local emulators

```bash
firebase emulators:start
```

Rules are the security boundary, so change them against the emulator rather
than against live data.

---

## Deploying to GitHub Pages

Push to `main`. The workflow lints, typechecks, tests, builds and publishes.
Enable **Settings → Pages → Source → GitHub Actions** once.

Add the Firebase values as repository **variables** (Settings → Secrets and
variables → Actions → Variables), not secrets: they ship in the bundle anyway,
and variables stay readable and diffable. Actions secrets are also unavailable
to workflows triggered from forked pull requests, which would silently break
the build. Never add a service-account key.

| Variable                            | Required    | Notes                                          |
| ----------------------------------- | ----------- | ---------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | yes         | Without it the deployed site runs on mock data |
| `VITE_FIREBASE_AUTH_DOMAIN`         | yes         |                                                |
| `VITE_FIREBASE_PROJECT_ID`          | yes         |                                                |
| `VITE_FIREBASE_STORAGE_BUCKET`      | for uploads |                                                |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes         |                                                |
| `VITE_FIREBASE_APP_ID`              | yes         |                                                |
| `VITE_BASE_PATH`                    | no          | Only to override the derived value             |
| `VITE_ROUTER_MODE`                  | no          | `hash` to opt out of the 404 fallback          |

### Base path

Pages serves two shapes of site and getting this wrong breaks every asset URL:
`<owner>.github.io` from the domain root, and `<owner>.github.io/<repo>/` from a
subpath. `.github/scripts/base-path.sh` derives the right value from the
repository name — a repo named `<owner>.github.io` gets `/`, anything else gets
`/<repo>/`. Nothing assumes `/`. Set `VITE_BASE_PATH=/` for a custom domain,
since that also serves from root.

### Routing: why BrowserRouter

We use `BrowserRouter`, so URLs look like `/alumni/abc123` rather than
`/#/alumni/abc123`. Clean URLs matter here because the shareable link _is_ the
distribution mechanism: alumni paste class pages and event pages into WhatsApp
groups, and `#` in a shared URL looks broken to a non-technical audience. Hash
fragments are also invisible to servers, so they never reach analytics or link
previews.

GitHub Pages has no rewrite rules, so a request for `/alumni/abc123` finds no
file and 404s. The deploy step works around this by copying `index.html` to
`404.html`. Pages returns it for any unmatched path, React boots, and the router
reads the original URL from the address bar.

The trade-off is honest: those responses carry HTTP 404 rather than 200, which
crawlers may treat as missing. That is acceptable for a members-only site whose
public surface is the homepage. If you would rather not rely on the behaviour at
all, set `VITE_ROUTER_MODE=hash` — `HashRouter` needs no server cooperation and
works identically on any static host. `src/main.tsx` supports both, and
`basename` is wired from Vite's `BASE_URL` so neither mode breaks on a subpath.

---

## Data model

Collections, all typed in `src/types/index.ts`:

```
users/{uid}                              private account: role, membership status
profiles/{uid}                           directory record, privacy, approvals
classes/{year}                           class aggregates
classes/{year}/announcements/{id}
events/{eventId}                         public
events/{eventId}/attendees/{uid}         members only
```

Two conventions keep reads cheap, which is what keeps this on the Firebase free
tier for a school-sized community:

- **Split account from profile.** `users/{uid}` holds the authoritative `role`
  and `status` and is never listed in directory queries; `profiles/{uid}` is the
  document the directory reads. Enumerating alumni therefore cannot touch
  account records at all.
- **Denormalised counters.** `attendeeCount`, `likeCount` and `commentCount`
  are maintained with `increment()`, so a list of 50 events costs 50 document
  reads rather than 50 subcollection queries.

`likedBy` is an array on the document, which is fine at school scale but has a
1 MB document ceiling; move it to a subcollection if a post ever attracts
thousands of likes.

### The alumni map

`/map` plots every member who has shared a location, with a graduating-year
filter so a class can see where it scattered to. Three decisions are worth
knowing about:

- **No geocoding service.** Profiles store `city` and `country` as free text, so
  something has to turn them into points. `src/data/geo.ts` is a lookup table
  instead of an API call: no key to provision, no rate limit, no network round
  trip, and it works offline in mock mode. Unknown cities fall back to a country
  centroid, and unknown countries are reported rather than dropped.
- **Country centroids are hand-written, not derived from the map.** Computing
  them from the bundled atlas would be self-maintaining but silently loses
  Singapore, Bahrain and Hong Kong, which the 110m geometry omits entirely —
  exactly the places a Gulf-and-Asia diaspora lands in.
- **Privacy is applied before anyone is placed.** A pin is a sharper disclosure
  than a line of text, so `fieldVisibility.city` is honoured here: a member who
  hid their city is plotted at country precision at best, and one who hid both
  is not plotted at all. `src/utils/visibility.ts` holds the single copy of that
  rule, shared with the profile page so the two screens cannot disagree.

The land geometry (~40 kB gzipped) is a lazy `import()`, so it becomes its own
chunk and never loads for visitors who don't open the map.

### Search

Firestore cannot combine full-text search with several equality filters. The
directory narrows server-side on the most selective filter, then refines in
memory, which avoids demanding a composite index per filter combination. This
is correct and cheap for a few thousand alumni. Past that, move search to
Algolia or Typesense — the seam is `listAlumni` in the provider, and nothing
above the service layer changes.

---

## Testing

```bash
npm test
```

The suite covers the invariants that would be embarrassing to break: contact
details never appear in directory results, unverified members are not
discoverable, filters combine conjunctively, RSVP counting is idempotent and
respects capacity, admin-created events show up scoped to the right class, and
each membership tier reaches exactly the routes it should.

The map's privacy rules are tested the same way, since a leak there is silent: a
member who hid their city must not appear at city precision, a class-only
location must be invisible to other years, and every person must end up either
on a pin or in the "not shown" count — never neither. A coverage test also
asserts every seeded alumnus resolves to a real city, so the demo never
degenerates into pins stacked on country centroids.

Date handling is tested too, because `new Date('2026-10-10')` parses as UTC
midnight and renders as October 9th for anyone west of Greenwich — an event on
the wrong day is how people miss a reunion. Reunion projection is covered for
every graduation year from 1970 on, since the obvious implementation skips a
class's milestone reunion during the very year it falls in.

Images are the other tested edge. Profile photos point at third-party hosts, so
URLs rot; `Avatar` degrades to the member's initials rather than showing the
browser's broken-image icon.

`npm run check:rules` loads `firestore.rules` into the emulator, which catches
the class of error that otherwise surfaces as a failed deploy — and tempts a
quick fix in the Firebase console, where the change is invisible to review.

It then asserts the peer-verification rules against a real emulator, because
that is the one place an ordinary member may write another member's document: a
single approval is refused, a repeat vote from the same member is refused, a
self-approval is refused, an approval cannot carry other field changes with it,
and the second distinct approval both verifies the applicant and opens the
directory to them.

What it does _not_ yet cover is the rest of the boundary: that a member cannot
promote themselves to admin, that RSVP cannot move the counter by 50. Those are
the highest-value tests left to write; `scripts/check-rules.mjs` shows the
setup.

---

## Roadmap

Shipped: directory with search and filters that doubles as the class page,
profiles with privacy controls, an alumni map filterable by class, events with
admin authoring and member RSVP, peer verification where two existing members
vouch a newcomer in, and an admin dashboard for membership and events.

Deliberately deferred, with the data model shaped to accept them: a photo
archive, a jobs and mentoring board, mentorship matching, alumni business
directory, private messaging, regional chapters, polls, donations, and email or
push notifications.

Before a real cohort's data goes in:

1. Move contact details to a private subcollection (see above).
2. Extend the behavioural rules tests beyond peer verification.
3. Replace client-side aggregate counting with scheduled aggregate documents.
4. Add rate limiting on registration; App Check is the usual answer.
