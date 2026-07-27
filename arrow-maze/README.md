# Arrow Trail

A responsive, competitive arrow-maze puzzle game.

- **Solo mode** — 30 levels of increasing difficulty, each a deterministically
  generated arrow board. Every tile has an arrow; tap one and it slides off
  the board if its path to the edge is clear. Clear the whole board to win.
  Timed scoring with a mistake counter gives 1–3 stars per level.
- **Accounts** — email/password sign-up, public profile, avatar color,
  rating, win/loss record, best level reached.
- **Arena** — search any player by username, see who's online right now, and
  send them a live race challenge.
- **Live 1v1 races** — both players get the *same* maze (shared seed) and
  race in real time; you see your opponent's token moving live. First to the
  exit wins, and ratings update automatically.
- **Chat** — direct-message anyone, plus a dedicated chat panel inside every
  race (before, during, and after).
- **Leaderboard** — global ranking by rating.
- Fully responsive: same codebase works on desktop and mobile (touch swipe +
  D-pad on small screens, keyboard/mouse on desktop).

Stack: **Next.js 16 (App Router, TypeScript) + Tailwind CSS v4** for the
frontend, **Supabase** for auth, Postgres database, row-level security, and
realtime (presence, challenges, live match progress, chat), deployed on
**Vercel**.

---

## 1. Project structure

```
arrow-maze/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # landing page
│  │  ├─ login/, signup/          # auth pages
│  │  ├─ dashboard/                # level select
│  │  ├─ play/[levelId]/           # solo maze
│  │  ├─ arena/                    # search, online users, DMs
│  │  ├─ match/[matchId]/          # live 1v1 race
│  │  ├─ leaderboard/, profile/
│  │  └─ api/presence/offline/     # marks a user offline on tab close
│  ├─ components/                  # MazeBoard, Navbar, Chat, OnlineUsers…
│  └─ lib/
│     ├─ maze.ts                   # seeded maze generator + BFS solver
│     ├─ auth-context.tsx          # client-side auth/profile state
│     └─ supabase/                 # browser + server Supabase clients
├─ supabase/schema.sql             # full DB schema, RLS policies, seed data
└─ .env.example
```

---

## 2. Run it locally

You need **Node.js 18.18+** (Node 20/22 recommended) and a free
**Supabase** account. Do the Supabase setup in section 3 first, then:

```bash
npm install
cp .env.example .env.local
# paste your Supabase URL + anon key into .env.local (see section 3.3)
npm run dev
```

Open http://localhost:3000.

---

## 3. Set up Supabase (database, auth, realtime)

### 3.1 Create the project
1. Go to https://supabase.com → **Start your project** → sign in.
2. **New project** → pick an org, name it (e.g. `arrow-trail`), set a
   database password (save it somewhere), pick a region close to you →
   **Create new project**. Wait ~2 minutes for provisioning.

### 3.2 Run the schema
1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Click **New query**, then open `supabase/schema.sql` from this repo,
   copy its full contents, paste into the editor, and click **Run**.
   This creates every table (`profiles`, `levels`, `scores`, `challenges`,
   `matches`, `match_progress`, `messages`), enables row-level security with
   correct policies, adds all tables to the realtime publication, and seeds
   30 levels.
3. Confirm it worked: **Table Editor** → you should see the tables above,
   and `levels` should already contain 30 rows.

### 3.3 Get your API keys
1. **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Put them in `.env.local` (created from `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### 3.4 Auth settings
1. **Authentication** → **Providers** → make sure **Email** is enabled
   (it is by default).
2. **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` for now — you'll add your Vercel
     URL here too once deployed (section 5.4).
   - **Redirect URLs**: add `http://localhost:3000/**` and, later, your
     Vercel domain `https://your-app.vercel.app/**`.
3. Optional but recommended for a fast local dev loop: **Authentication** →
   **Providers** → **Email** → turn **Confirm email** off while testing
   locally, then turn it back on before going live.

### 3.5 Realtime
The schema already runs
`alter publication supabase_realtime add table ...` for every table that
needs live updates (profiles/presence, challenges, matches, match_progress,
messages) — nothing else to configure.

---

## 4. Push the code to GitHub

### Option A — using Antigravity (or any AI IDE with an integrated terminal)
Antigravity's terminal panel runs normal shell commands, so the steps are
identical to any terminal — open the integrated terminal at the project
root and run the commands in **Option B** below. If Antigravity offers a
"Source Control" / Git panel, you can also stage, commit, and publish
through that UI instead of the CLI — click the Git icon in the sidebar,
stage all changes, write a commit message, commit, then use **Publish
Branch** / **Push** and choose "Publish to GitHub" to create the remote
repo for you.

### Option B — command line (works anywhere)
```bash
# 1. Create a new, empty repository on GitHub first:
#    https://github.com/new  -> name it "arrow-trail" -> Create repository
#    (don't initialize with a README/gitignore, this project already has them)

# 2. From the project root:
git init
git add .
git commit -m "Initial commit: Arrow Trail"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/arrow-trail.git
git push -u origin main
```

If prompted for credentials, use a GitHub **Personal Access Token** as the
password (GitHub → Settings → Developer settings → Personal access tokens →
Generate new token, scope: `repo`), or push via the GitHub CLI instead:

```bash
gh auth login
gh repo create arrow-trail --public --source=. --remote=origin --push
```

`.env.local` is already in `.gitignore`, so your Supabase keys are never
committed.

---

## 5. Deploy to Vercel

### 5.1 Import the project
1. Go to https://vercel.com → sign in (GitHub login is easiest) → **Add
   New** → **Project**.
2. Select your `arrow-trail` GitHub repo → **Import**.

### 5.2 Configure environment variables
In the import screen (or later under **Project Settings → Environment
Variables**), add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |

Apply them to all environments (Production, Preview, Development).

### 5.3 Deploy
Click **Deploy**. Vercel auto-detects Next.js — no build command changes
needed. Wait for the build to finish, then open the assigned URL
(`https://your-app.vercel.app`).

### 5.4 Point Supabase auth at your live URL
Back in Supabase → **Authentication** → **URL Configuration**:
- Set **Site URL** to `https://your-app.vercel.app`.
- Add `https://your-app.vercel.app/**` to **Redirect URLs**.

### 5.5 Every future push auto-deploys
From now on, `git push` to `main` triggers a new production deploy on
Vercel automatically; pushes to other branches get their own preview URL.

---

## 6. How the game works (for your own reference)

- **Board generation** (`src/lib/arrowPuzzle.ts`): boards are seeded with
  `mulberry32` so a given seed string always produces the exact same board —
  this is what lets two racers get an identical puzzle. Every board is
  **guaranteed solvable**: it's built by an "onion-peel" construction that
  always picks a currently-exposed edge tile (topmost/bottommost in its
  column, or leftmost/rightmost in its row) and assigns it a direction with a
  provably clear lane, repeating until every tile has a direction. This also
  produces the natural difficulty curve — more of the board becomes
  "obviously movable" only as you clear tiles inward from the edges.
- **Solo levels**: `levels` table stores `(seed, cols, rows, difficulty,
  par_seconds)`. Clearing one upserts a row in `scores` and, if it's your
  furthest level yet, bumps `profiles.best_level` (which unlocks the next
  level in `/dashboard`).
- **Challenges**: `POST` (insert) into `challenges` with `status='pending'`.
  The target user's browser is subscribed to realtime inserts on that table
  and shows an accept/decline modal (`ChallengeListener.tsx`). Accepting
  creates a `matches` row with a fresh shared seed and redirects both
  players to `/match/[id]`.
- **Live race**: each cleared tile upserts `match_progress (match_id,
  user_id, step)` where `step` is the tiles-cleared count; the opponent's
  browser is subscribed to that row and renders a live progress bar. First
  `finished_at` wins; `matches.winner` and rating/win-loss counters are
  updated from the client using RLS-scoped writes.
- **Presence**: `profiles.status` flips to `online` on load and every 30s
  heartbeat, and to `offline` via `navigator.sendBeacon` on tab close
  (`/api/presence/offline`).

## 7. Ideas for extending it further
- Move win/loss/rating updates into a Postgres function or Edge Function so
  they can't be tampered with client-side.
- Add OAuth providers (Google/GitHub) in Supabase Auth for one-click sign-in.
- Add a spectator mode for matches, and a match-history page.
- Add push notifications (web push) for incoming challenges when the tab
  isn't focused.
- Add a daily-challenge mode: one shared seed for everyone, reset at
  midnight UTC.
