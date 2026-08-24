# বন্ধু সঞ্চয় সমিতি — Savings Management PWA

Cloudflare Pages + Workers + D1 Database ভিত্তিক সম্পূর্ণ Savings Management System।

**Firebase সম্পূর্ণ নিষিদ্ধ।** সবকিছু Cloudflare-এ চলে।

## Features

- Secure Admin Login (JWT + bcrypt password hashing)
- Dashboard with live stats + FDR maturity alerts
- Member CRUD + Profile
- Savings Deposit (duplicate month warning)
- Withdrawals (balance check)
- Bank Account Management
- FDR Management (simple/compound interest)
- Income & Expense
- Due Savings Report
- Audit Logs
- JSON Backup
- Full PWA (Installable on Android)
- Responsive (Mobile / Tablet / Desktop)
- Soft delete + data validation

## Project Structure

```
bondhu-sonchoy-somiti/
├── migrations/
│   ├── 0001_init.sql      # Database schema
│   └── 0002_seed.sql      # Default categories
├── worker/
│   └── index.ts           # Hono API + static assets handler
├── src/
│   ├── App.tsx            # Main React app (all pages)
│   ├── main.tsx
│   ├── index.css
│   └── lib/api.ts         # API client
├── public/
│   ├── manifest.json
│   ├── sw.js              # Service Worker
│   └── icons/
├── wrangler.toml
├── package.json
├── vite.config.ts
└── README.md
```

## Required Cloudflare Services

1. **Cloudflare Account** (free plan works)
2. **D1 Database** — `bondhu-db`
3. **Workers / Pages** — for deployment
4. (Optional) R2 for photo storage

## Deployment Steps

দুইভাবে deploy করা যায়:

### Option A: Cloudflare Dashboard + Git (wrangler deploy ছাড়া — recommended for beginners)

1. **GitHub/GitLab-এ প্রজেক্ট আপলোড করুন**
   - এই ফোল্ডারটি একটি নতুন repository-তে push করুন।

2. **Cloudflare Dashboard-এ যান**
   - [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Connect to Git**
   - আপনার repository সিলেক্ট করুন।

3. **Build settings**
   - Framework preset: **None** বা **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist` (wrangler.toml-এর assets directory)
   - Root directory: `/` (বা যেখানে package.json আছে)

4. **D1 Database তৈরি করুন** (Dashboard থেকে)
   - Workers & Pages → **D1** → **Create database** → নাম দিন `bondhu-db`
   - Database ID কপি করে `wrangler.toml`-এ `database_id` এবং `preview_database_id`-এ বসান।
   - আবার commit + push করুন।

5. **Bindings সেট করুন**
   - প্রজেক্ট Settings → **Bindings** → **Add** → D1 database → `DB` binding → `bondhu-db` সিলেক্ট করুন।

6. **Secret সেট করুন**
   - Settings → **Variables and Secrets** → **Add** → Type: Secret
   - Name: `JWT_SECRET` → Value: একটি লম্বা র‍্যান্ডম স্ট্রিং দিন।

7. **Migrations চালান**
   - Dashboard → D1 → আপনার database → **Console** বা **Query** ট্যাবে গিয়ে `migrations/0001_init.sql` এবং `0002_seed.sql` এর কনটেন্ট কপি-পেস্ট করে রান করুন।
   - অথবা local থেকে একবার: `npx wrangler d1 execute bondhu-db --file=./migrations/0001_init.sql`

8. **Deploy**
   - Git-এ push করলে Cloudflare স্বয়ংক্রিয়ভাবে build + deploy করবে।
   - অথবা Dashboard থেকে **Retry deployment** চাপুন।

### Option B: Local Wrangler (CLI)

```bash
cd bondhu-sonchoy-somiti
npm install
npx wrangler login
npx wrangler d1 create bondhu-db
# database_id wrangler.toml-এ বসান
npx wrangler d1 execute bondhu-db --file=./migrations/0001_init.sql
npx wrangler d1 execute bondhu-db --file=./migrations/0002_seed.sql
npx wrangler secret put JWT_SECRET
npm run deploy
```

### Custom Domain (optional)

Cloudflare Dashboard → Workers & Pages → your project → Settings → Domains → Add custom domain.

### First Login

- **Username:** `admin`
- **Password:** `admin123`

**প্রথম লগইনের পর অবশ্যই পাসওয়ার্ড পরিবর্তন করুন** (Settings → পাসওয়ার্ড পরিবর্তন)।

## Local Development

```bash
# Terminal 1 - API (Worker)
npx wrangler dev

# Terminal 2 - Frontend
npm run dev
```

Vite proxies `/api` to the worker.

## PWA Install (Android)

1. Chrome-এ অ্যাপের URL খুলুন
2. Menu (⋮) → **Add to Home screen** / **Install app**
3. অ্যাপ আইকন হোম স্ক্রিনে চলে আসবে

## ZIP Package

```bash
# Project ফোল্ডার থেকে
zip -r bondhu-sonchoy-somiti.zip . -x "node_modules/*" -x "dist/*" -x ".git/*"
```

অথবা পুরো ফোল্ডার ZIP করে Cloudflare-এ deploy করুন।

## Database Tables

- `users` — Admin accounts
- `settings` — Society info
- `members` — সদস্য
- `savings` — সঞ্চয় জমা
- `withdrawals` — উত্তোলন
- `bank_accounts` — ব্যাংক হিসাব
- `bank_transactions` — ব্যাংক লেনদেন
- `fdrs` — Fixed Deposit
- `income` / `expenses` — আয়-ব্যয়
- `categories` — ক্যাটাগরি
- `audit_logs` — Audit trail
- `sessions` — Session (optional)
- `cash_book` — Cash book snapshots

## Security Notes

- Passwords are bcrypt hashed (never plain text)
- JWT tokens (7 days), HttpOnly cookie + Bearer support
- Prepared statements (SQL injection protection)
- Soft deletes for critical data
- Input validation on all amounts & required fields
- Audit log for important actions

## License

Private use for বন্ধু সঞ্চয় সমিতি.

---

**Platform:** Cloudflare  
**Database:** Cloudflare D1  
**Auth:** Custom secure JWT + bcrypt  
**App Type:** Responsive PWA  
**Firebase:** সম্পূর্ণ নিষিদ্ধ
