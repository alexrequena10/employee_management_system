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

Change passwords and set a strong `JWT_SECRET` in `server/.env` before production use.

## Production

```bash
cp server/.env.example server/.env
# Edit JWT_SECRET and CLIENT_ORIGIN
npm run build
NODE_ENV=production npm start
```

The API serves the built client on port 3001.

## Project layout

```
worker-management/
├── client/          React UI
├── server/          Express API + SQLite
└── package.json     Dev scripts
```
