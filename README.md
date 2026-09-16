# Worker Management

A web application for construction crews to track jobs, worker assignments, and payment status (employee and company). Includes role-based access: **admin** sees dollar amounts; **assistant** sees Paid/Unpaid status only.

## Features

1. **Employee payment status** — Per job, see whether each worker has been paid.
2. **Company payment status** — Track whether the client has paid the company for each job.
3. **Active jobs by neighborhood** — Filter and list active jobs in a selected area.
4. **Jobs by worker** — List all jobs for a worker with payment status on each.
5. **Printable invoices** — Job details, worker payment status, and company status (amounts for admin only).
6. **Assistant mode** — Limited view without payment amounts.

## Tech stack

- **Frontend:** React + Vite (responsive UI)
- **Backend:** Node.js + Express
- **Database:** SQLite (WAL mode, indexed for scale)
- **Security:** JWT auth, bcrypt passwords, Helmet, rate limiting, role-based API filtering

## Quick start

```bash
cd worker-management
npm install
npm run install:all
npm run seed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Demo logins

| Role      | Username    | Password       |
|-----------|-------------|----------------|
| Admin     | `admin`     | `admin123`     |
| Assistant | `assistant` | `assistant123` |

Change passwords and set a strong `JWT_SECRET` in `server/.env` before sharing the app widely.

## Shared use from different locations (Railway)

Use this when **admin** and **assistant** need the same live data from different places. Both open one public URL; changes save to a shared SQLite database on Railway. Refresh or revisit a page to see the other person’s updates.

Local `Setup` / `Start App` scripts remain for **single-machine** offline use only. They do **not** sync with the Railway instance.

### 1. Deploy

1. Push this repo to GitHub (or connect Railway to your local repo).
2. In [Railway](https://railway.app), create a new project → **Deploy from GitHub** (or CLI).
3. Railway should pick up [`Dockerfile`](Dockerfile) and [`railway.toml`](railway.toml) automatically.
4. Add a **Volume** to the service, mount path **`/data`** (required so job data survives redeploys).
5. Set environment variables on the service:

| Variable | Value |
|----------|--------|
| `JWT_SECRET` | Long random string (required) |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |

Railway usually injects `PORT`. `HOST` defaults to `0.0.0.0` in the image.

6. Generate a public domain (Railway → Settings → Networking → Generate Domain).
7. Optionally set `CLIENT_ORIGIN` to that HTTPS URL if you ever split hosts; same-origin deploy does not need it.

### 2. Seed users (first deploy only)

With the volume empty, create demo users once. From Railway’s shell / one-off command on the service (with `DATA_DIR=/data`):

```bash
cd /app/server && node src/seed.js
```

Or run seed locally against a copy of the DB, then upload — the container path that matters is `/data/workers.db`.

### 3. Change passwords before sharing

Default seed logins (`admin` / `admin123`, `assistant` / `assistant123`) are only for first setup. Change them in the database or re-seed with custom hashes before giving anyone the URL.

### 4. Day-to-day use

- Admin and assistant each open `https://<your-app>.up.railway.app` and log in.
- After one person adds or edits a job, the other **refreshes** the page (or navigates away and back) to see it.
- Health check: `GET /api/health` → `{ "ok": true }`.

## Install on another computer (e.g. your dad's PC)

**Single-machine mode:** the app runs locally in a web browser — no internet required after setup. All job data stays on that computer in `server/data/workers.db`. This does not share data with a Railway deployment.

### What you need on his computer

1. **Node.js 20+** — download from [https://nodejs.org](https://nodejs.org) (LTS version). Run the installer with default options.
2. **A copy of this project folder** — use one of the options below.

### Copy the project to his computer

**Option A — USB drive (simplest)**  
On your Mac, zip the project **without** `node_modules`:

```bash
cd /Users/alexrequena
zip -r worker-management.zip worker-management -x "worker-management/node_modules/*" -x "worker-management/client/node_modules/*" -x "worker-management/server/node_modules/*" -x "worker-management/server/data/*" -x "worker-management/.git/*"
```

Copy `worker-management.zip` to his computer, unzip it.

**Option B — Git**  
If the repo is on GitHub/GitLab, he can clone it:

```bash
git clone <your-repo-url>
cd worker-management
```

### First-time setup (once)

**Windows:** Double-click **`Setup.bat`**  
**Mac:** Double-click **`Setup.command`** (if macOS blocks it: right-click → Open)

Or in a terminal from the project folder:

```bash
npm run setup
```

Setup installs dependencies, builds the app, creates `server/.env`, and loads sample data.

### Every time he uses the app

**Windows:** Double-click **`Start App.bat`**  
**Mac:** Double-click **`Start App.command`**

Or in a terminal:

```bash
npm run launch
```

This starts the server and opens **http://localhost:3001** in his browser. **Leave the terminal/command window open** while using the app. Close it or press Ctrl+C to stop.

### Logins (change these after first use)

| Role      | Username    | Password       |
|-----------|-------------|----------------|
| Admin     | `admin`     | `admin123`     |
| Assistant | `assistant` | `assistant123` |

### Tips

- **Desktop shortcut:** Right-click `Start App.bat` (Windows) or `Start App.command` (Mac) → create alias/shortcut on the Desktop.
- **His data:** Jobs and workers live in `server/data/workers.db`. Back up that folder to keep his data safe.
- **Updates:** Copy a new version of the project over the old one, run `Setup` again, and keep the `server/data` folder so his data is preserved.

## Production (manual / local)

```bash
cp server/.env.example server/.env
# Edit JWT_SECRET and CLIENT_ORIGIN
npm run build
NODE_ENV=production npm start
```

The API serves the built client on port 3001. For two users in different locations, use [Shared use from different locations (Railway)](#shared-use-from-different-locations-railway) instead.

## Project layout

```
worker-management/
├── client/          React UI
├── server/          Express API + SQLite
├── Dockerfile       Cloud / Railway image
├── railway.toml     Railway healthcheck + Docker build
└── package.json     Dev scripts
```
