# Lottery Platform

A role-based lottery management platform with audited, Redis-locked draws and row-level security.

## Architecture

```
lottery-platform/
├── apps/
│   ├── api/          # Express.js REST API (Node.js)
│   ├── web-admin/    # React + Vite admin dashboard
│   ├── mobile/       # React Native player app (Expo)
│   └── tv/           # TV broadcast display
├── packages/
│   └── shared/       # Shared utilities and types
└── supabase/
    └── migrations/   # SQL schema, RPC functions, RLS policies
```

## Key Features

- **Commit-Reveal RNG** — lottery `secret_seed` is hashed before ticket sales open; revealed only at draw time, making the result provably fair and tamper-proof
- **Redis Draw Lock** — atomic `SET NX EX` prevents duplicate draws even under concurrent requests
- **Row-Level Security** — Supabase RLS policies enforce that players can only see their own tickets; admins only see their own lotteries
- **Audit Log** — every login, draw, status change, and prize claim is written to `audit_log`
- **Role-Based Access** — `player`, `admin`, and `super_admin` roles each get a scoped JWT; the API enforces roles on every route
- **Ticket Purchase RPC** — a server-side PostgreSQL function handles the 3-ticket-per-player cap and sold-out check atomically

## Apps

### `apps/api` — REST API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/phone-otp` | Public | Send OTP to player phone |
| POST | `/auth/verify-otp` | Public | Verify OTP, receive JWT |
| POST | `/auth/admin-login` | Public | Admin email+password login |
| GET | `/auth/me` | JWT | Get current user profile |
| GET | `/lotteries` | Admin | List lotteries (own or all for super_admin) |
| POST | `/lotteries` | Admin | Create lottery with commit-reveal seed |
| GET | `/lotteries/:id` | Admin | Lottery detail with prizes |
| PUT | `/lotteries/:id/status` | Admin | Activate or cancel |
| POST | `/lotteries/:id/prize` | Admin | Add prize |
| POST | `/draws/:id/execute` | Admin | Execute Redis-locked draw |
| GET | `/draws/:id` | Auth | Fetch draw result after completion |
| POST | `/tickets/purchase` | Player | Buy ticket (RPC-enforced limits) |
| GET | `/tickets/my` | Player | My tickets |

### `apps/web-admin` — Admin Dashboard

React + Vite SPA with Tailwind CSS. Features:
- Animated stat cards with live counters
- Lottery table with live search/filter
- Draw execution with confetti celebration
- Winner trophy card showing masked phone + ticket number
- Activate / Cancel / Delete status actions
- Prize photo upload (JPEG/PNG ≤ 5 MB)

## Security Measures

| Layer | Control |
|-------|---------|
| Network | `helmet` HTTP headers, CORS restricted to `ALLOWED_ORIGINS` |
| Auth | Rate limiting on `/auth` (20 req / 15 min); JWT duration 2 h |
| Transport | All Supabase calls use the service-role key server-side only |
| Data | RLS on all tables; `secret_seed` never returned to clients |
| Ops | Audit log on all state-changing actions |

## Environment Variables

Copy `apps/api/.env.example` → `apps/api/.env` and fill in real values.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default 3000) |
| `JWT_SECRET` | **Yes** | Long random string for signing JWTs |
| `SUPABASE_URL` | **Yes** | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Service-role key (server only, never expose) |
| `REDIS_URL` | **Yes** | Redis connection string for draw locking |
| `ALLOWED_ORIGINS` | **Yes** | Comma-separated frontend origins |
| `SEED_ADMIN_PASSWORD` | Seed only | Password for `seed-admin.js` |

> ⚠️ **Key rotation**: If you ever see a real key committed to git history, rotate it immediately in Supabase Dashboard → Settings → API.

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill env files
cp apps/api/.env.example apps/api/.env
cp apps/web-admin/.env.example apps/web-admin/.env

# 3. Run API
cd apps/api && npm run dev

# 4. Run admin dashboard
cd apps/web-admin && npm run dev
```

## Database

Apply migrations in order using Supabase CLI:

```bash
supabase db push
```

Migrations include: initial schema, `purchase_ticket` RPC, `complete_draw` RPC, and RLS policies.