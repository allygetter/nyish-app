# NYISH — Chama / Savings Group Management

A mobile-first PWA for managing Kenyan chamas (savings groups / merry-go-rounds). Built with React 18, Vite, and Supabase.

## Features

- **Auth & Onboarding** — Email/password via Supabase Auth, with automatic profile creation and Chairperson assignment
- **Role-based access** — Chairperson, Treasurer, Secretary, Member
- **Savings** — Log contributions, view running totals (personal + group)
- **Loans** — Request, approve/reject, track repayments with interest
- **Meetings** — Log agendas, minutes, and attendance
- **Announcements** — Chair-posted group notices
- **Fines** — Issue and track payment status
- **Merry-Go-Round** — Rotation management with current recipient display
- **Members Directory** — Approve pending registrations, manage roles
- **Constitution** — Editable governing document
- **Certificate & QR Card** — Membership verification
- **Offline Queue** — IndexedDB-backed write queue that flushes on reconnect
- **M-Pesa Integration** — STK Push, callback, and status polling (serverless)

## Tech Stack

- React 18 (function components, hooks)
- Vite + vite-plugin-pwa
- Supabase (Postgres + Auth + Realtime)
- Lucide React (icons)
- qrcode, jspdf (client-side utilities)
- Vercel-style serverless functions for M-Pesa

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 3. Run Supabase SQL
# Open supabase-schema.sql in Supabase SQL Editor and run it.
# Create a public storage bucket named "member-photos".

# 4. Start dev server
npm run dev

# 5. Build for production
npm run build
```

## Supabase Setup

1. Run `supabase-schema.sql` in the SQL Editor
2. Enable **Realtime** for tables: `savings`, `loans`, `fines`, `meetings`, `announcements`, `members`, `nyish_store`
3. Create storage bucket `member-photos` with public read access
4. Set Auth email confirmation to **off** for dev, **on** for production (the app auto-detects)

## M-Pesa Configuration (Production)

Set these environment variables for the API routes:

```
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
MPESA_ENV=production|sandbox
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Project Structure

```
nyish/
├── api/                  # Serverless functions (M-Pesa, notifications)
├── public/               # PWA icons, static assets
├── src/
│   ├── screens/          # All page components
│   ├── lib/              # Supabase client, styles, offline queue, utils
│   ├── App.jsx           # Main shell with routing
│   └── main.jsx          # Entry point
├── supabase-schema.sql   # Database schema, RLS, triggers
├── vite.config.js
├── package.json
└── index.html
```

## License

MIT
