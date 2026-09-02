# Backend migration: Netlify Functions -> Vercel

## Target architecture

The `backend/public/` Express app is deployed to **Vercel as a single
`@vercel/node` serverless function** behind a catch-all rewrite.

```
backend/                     <- Vercel project root
  api/index.ts               <- serverless entry: `import app from '../public/index'`
  vercel.json                <- catch-all rewrite + maxDuration
  public/
    index.ts                 <- the Express app (exports `default app` and `{ app }`)
    config/
      firebaseAdmin.ts       <- NEW unified Admin SDK init (env-var based)
      firebase-admin.ts      <- compat shim, re-exports `admin`
      firebase.ts            <- unchanged; Firebase REST config
    middleware/auth.ts       <- `verifyToken` (Admin SDK verifyIdToken)
    routes/                  <- auth, users, database, cookieState, contact, usercount
    notion_api/notionRouter.ts
```

Every request path is rewritten to `/api/index`, which invokes the Express app.
No per-endpoint functions - one function, internal Express routing.

`api.canvastonotion.io` DNS must be repointed from Netlify to Vercel (CNAME to
`cname.vercel-dns.com`, or per the domain settings Vercel shows for the project).

---

## Interface contract (for Agents B / C / D / E)

**Firebase Admin**
- `import { getFirebaseAdmin, getDatabase, getFirestore } from '../config/firebaseAdmin'`
  (adjust the relative path). Singleton; reads `process.env.FIREBASE_SERVICE_ACCOUNT`
  (single-line JSON), applies the private-key newline fixes, throws on failure
  (never `process.exit`).
- `admin` is still available via `import { admin } from '../config/firebase-admin'`
  **or** `import { admin } from '../config/firebaseAdmin'`.
- `import { adminDb } from '../db'` still works (now `getFirebaseAdmin().database()`).

**`req.user` after `verifyToken`**
```ts
{ uid: string; email: string; displayName?: string; photoURL?: string; emailVerified?: boolean }
```
- Controllers MUST use `req.user.uid` - **NOT** `req.user.localId`.
- `types.ts` `AuthUser` keeps a `localId?: string` field marked `@deprecated`
  purely so pre-migration controllers still type-check. `verifyToken` does NOT
  populate it. `authControllers.ts` and `userControllers.ts` still read
  `req.user?.localId` and must be updated to `.uid` (their owner's task).

**Token source (matches Netlify):** `Authorization: Bearer <token>` header wins;
`authToken` cookie is the fallback. Verified with `admin.auth().verifyIdToken()`.
- Missing token -> `401 { error: 'No authentication token provided' }`
- Invalid token -> `401 { error: 'Invalid token' }`

**Auth cookie**
- Name: `authToken`.
- Prod attributes: `HttpOnly; Secure; SameSite=None; Domain=.canvastonotion.io`.
- Dev (`NODE_ENV !== 'production'`): no `Domain`, `Secure` off, `SameSite=Lax`.
  (Whoever ports the auth controllers owns writing this helper.)

**Router mount points** (each mounted twice - bare and under `/api/`):

| Path            | Route file                       | Owner / status        |
| --------------- | -------------------------------- | --------------------- |
| `/auth/*`       | `routes/auth.ts`                 | existing (controllers need `.uid` fix) |
| `/users/*`      | `routes/users.ts`               | existing (controllers need `.uid` fix) |
| `/db/*`         | `routes/database.ts`            | existing (controllers need `.uid` fix) |
| `/notion/*`     | `notion_api/notionRouter.ts`    | existing               |
| `/cookie-state/*` | `routes/cookieState.ts`       | **STUB - Agent B**     |
| `/contact`      | `routes/contact.ts`            | **STUB - Agent C**     |
| `/usercount`    | `routes/usercount.ts`         | **STUB - Agent D**     |
| `/health`       | inline in `index.ts`           | done                   |

`GET /health` and `GET /api/health` return `{ status: 'ok', timestamp }`.

**CORS** (in `index.ts`): allowed origins `https://canvastonotion.io`,
`https://canvastonotion.netlify.app`, `https://api.canvastonotion.io`,
`http://localhost:5173`, `http://localhost:3000`, plus requests with no `Origin`.
`credentials: true`, methods `GET/POST/PUT/DELETE/OPTIONS`, allowed headers
`Content-Type, Authorization`, exposed header `set-cookie`. `app.options('*')`
handles preflight.

**Body parsing:** `express.json()` is global (no-op for non-JSON content types).
The contact router must apply `multer` on its own router so multipart uploads are
parsed before anything tries to JSON-parse them. `multer` + `@types/multer` are
now in `backend/package.json`.

---

## Env-var checklist

Set all of these in Vercel (Production + Preview). See `.env.example` for shapes.

- `FIREBASE_SERVICE_ACCOUNT` (full service-account JSON, one line)
- `FIREBASE_DATABASE_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `NODE_ENV=production`
- `PORT` - local only, Vercel ignores it.

Vercel sets `VERCEL=1` automatically; `index.ts` uses that to skip `app.listen()`.

---

## Deploy

1. Create a Vercel project with **root directory = `backend/`**.
2. Framework preset: **Other** (`vercel.json` also sets `"framework": null`).
   No build command / output dir needed - `@vercel/node` compiles
   `api/index.ts` with esbuild and Vercel runs `npm install` itself.
3. Add every env var from the checklist above.
4. `vercel --prod` (or push to the connected branch).
5. Repoint `api.canvastonotion.io` DNS to Vercel; verify `GET /health`.
6. Update `frontend/src/utils/api.ts` prod base URL from
   `https://api.canvastonotion.io/.netlify/functions` to
   `https://api.canvastonotion.io` (paths are now `/auth/*`, `/notion/*`, ...).

### `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }],
  "functions": { "api/index.ts": { "maxDuration": 60 } }
}
```
`maxDuration` for non-Next "other framework" runtimes is configured via the
`functions` object in `vercel.json`, keyed on the entry file. Fluid compute is on
by default; Hobby max is 300s, Pro 800s (1800s extended beta). 60s chosen for the
chunked Notion sync. The catch-all rewrite is the documented single-function
Express pattern.

---

## Agent checklist

- **Agent A** - DONE. Target architecture: `api/index.ts` entry, `vercel.json`
  catch-all rewrite, unified `config/firebaseAdmin.ts`, `verifyToken` middleware,
  CORS + body-parsing, bare + `/api/*` router mounts, `/health`.
- **Agent B** - DONE. Ported `cookie-state.ts` into `routes/cookieState.ts` +
  `controllers/cookieStateControllers.ts` (`POST /set-authenticated`,
  `POST /clear-authenticated`, `isAuthenticated` cookie).
- **Agent C** - DONE. Ported `contact.ts` into `routes/contact.ts` +
  `controllers/contactControllers.ts` (`POST /`, multer multipart, nodemailer +
  validator, IP rate limiting). Also ported `usercount`.
- **Agent D** - DONE. Ported `usercount.ts` into `routes/usercount.ts`
  (`GET /`, user count from RTDB, IP rate limiting).
- **Agent B/auth owner** - DONE. `authControllers.ts` + `userControllers.ts`
  rewritten to `req.user.uid`; cookie name is now `authToken` with the prod/dev
  attribute split; Admin-SDK signup/login/google flows ported from
  `netlify/functions/auth.ts`; `localId?` compat field dropped from `AuthUser`;
  `GET /auth/user` now exists on the backend; `/users/info` + `/users/profile`
  (plural) available.
- **Notion** - DONE. `notionRouter.ts` `/token` slimmed to a plain OAuth code
  exchange; `GET /notion/sync-status` added; `POST /notion/sync-v2` is now the
  primary sync path; `GET /notion/pages` retained. `@notionhq/client@^2.3.0`
  added to `backend/package.json` for the Vercel bundle - see manual step below.
- **Agent E** - DONE. `frontend/src/utils/api.ts` cut over to the new base
  (`https://api.canvastonotion.io`, no `/.netlify/functions`); `USER_ENDPOINTS`,
  `CONTACT_ENDPOINT`, `HEALTH_ENDPOINT` fixed; `NOTION_ENDPOINTS` gained
  `SYNC_V2` / `SYNC_STATUS` / `PAGES`; dev `LOCAL_AUTH_USER_ENDPOINT` now points
  at the real local backend (`localhost:3000`). Dead `backend/src/server.ts`
  (+ obsolete `test/app.test.ts`) removed. `backend/netlify/` + `netlify.toml`
  relocated to `backend/_netlify-legacy/` (not deployed, kept for reference).

## Remaining manual steps for the user

- Point `api.canvastonotion.io` DNS at Vercel (CNAME to `cname.vercel-dns.com`,
  or whatever the Vercel project's Domains tab specifies).
- In the Vercel project (root directory `backend/`), set every env var from
  `backend/.env.example` for Production + Preview.
- Verify `POST /notion/sync-v2` end-to-end with the browser extension against the
  deployed backend.
- Confirm the deployed `@notionhq/client` version matches what the Netlify build
  used (`netlify.toml` marked it `external_node_modules`).
- After production verification, decommission / delete the Netlify site, then
  delete `backend/_netlify-legacy/`.
- Delete `backend/serviceAccountKey.json` usage everywhere once confirmed unused
  (already removed from `db.ts` and `config/firebase-admin.ts`).
