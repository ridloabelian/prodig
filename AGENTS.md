# Prodig.id — Agent Context (Updated Juni 2026)

> Marketplace produk digital Indonesia. MVP feature-complete. **Stack: Astro 6 + Cloudflare Workers + D1 + Drizzle ORM.**
> ⚠️ Dokumentasi lama (Next.js/Prisma/PostgreSQL) sudah usang — jangan pakai sebagai referensi.

## Tech Stack (Real)
- **Astro 6.4** SSR via `@astrojs/cloudflare` adapter
- **Cloudflare Workers** runtime (edge-native)
- **Tailwind CSS 4** + CSS-first `@theme` config
- **Custom session cookie** (30 hari expiry, auto-renewal, role-based middleware)
- **Drizzle ORM 0.45** + Cloudflare D1 (SQLite serverless)
- **Cloudflare R2** 2 buckets: `R2_FILES` (private files) + `R2_PUBLIC` (thumbnails)
- **Mayar.id** payment gateway (QRIS/VA/e-wallet) + webhook callback
- **Resend** transactional email
- **Conviq/Chatwoot** WhatsApp notifications
- **Cloudflare Workers AI** (`@cf/meta/llama-3.1-8b-instruct`) untuk landing page copy generation

## Database Schema (12 tables, Drizzle + D1 SQLite)
```
users ──┬── sessions
        ├── products ──┬── categories
        │              ├── transactions ──┬── reviews
        │              │                ├── download_logs
        │              │                └── affiliates ──┬── affiliate_withdrawals
        │              └── landing_pages
        └── withdrawals

webhook_logs (standalone)
```

Key enums:
- `User.role`: BUYER, SELLER, ADMIN
- `Product.status`: PENDING, APPROVED, REJECTED, HIDDEN
- `Transaction.status`: PENDING, PAID, FAILED, EXPIRED, REFUNDED
- `Withdrawal.status`: PENDING, PROCESSED, REJECTED
- `Affiliate.status`: ACTIVE, INACTIVE

### Transaction Fields (Important)
- `subtotal` — harga dasar produk
- `ppn` — PPN 11%
- `amount` — total bayar buyer (subtotal + ppn)
- `commission` — platform fee 10% dari subtotal
- `netAmount` — subtotal - commission (diterima seller)
- `affiliateCommission` — 20% dari subtotal (dibayar platform)
- `downloadToken` — UUID untuk email link download
- `tokenExpiresAt` — expiry 24 jam (dari webhook PAID)
- `watermarkedFileKey` — R2 key untuk PDF yang sudah di-watermark
- `notes` — JSON metadata (mentor URL, dll)

## File Upload Flow (2 modes)

### Mode 1: Direct Server Upload (Current Default)
1. Client POST file ke `/api/upload/direct` (multipart/form-data)
2. Server menerima file, validasi size/type
3. Server upload langsung ke R2 via `env.R2_FILES.put(key, file)`
4. Server return `{ fileKey, fileUrl }`
5. Product form submit dengan `fileKey`

**Note:** Untuk file besar (500MB), direct upload bisa kena limit Workers. Pertimbangkan mode 2 untuk produk file.

### Mode 2: Presigned URL (Legacy/Alternative)
1. Client → `POST /api/upload/presigned` → server generates presigned R2 URL
2. Client uploads file **directly to R2** via PUT
3. On success, submit product dengan `fileKey`

## Authentication
- Custom session cookie (bukan NextAuth!)
- Session 30 hari, auto-renewal jika < 15 hari sisa
- Role-based middleware: BUYER, SELLER, ADMIN
- `middleware.ts` proteksi route:
  - `/sell`, `/dashboard` → SELLER or ADMIN
  - `/admin` → ADMIN only
  - `/library` → authenticated (any role)
  - `/checkout/success` → public (checks session if available)

## API Routes (Inventory)

### Auth
```
POST /api/auth/register    → create user (password hashed bcrypt)
POST /api/auth/login       → create session cookie
POST /api/auth/logout      → clear session
```

### Products
```
GET  /api/products            → list (search, filter, sort)
GET  /api/products/[id]      → detail (public)
POST /api/products           → create (SELLER only, status PENDING)
```

### Commerce
```
POST /api/checkout           → create transaction + Mayar invoice
POST /api/webhooks/mayar     → Mayar callback (handle PAID/FAILED/EXPIRED)
GET  /api/download?token=    → download via email token (rate limit 3x/24h)
GET  /api/download?trx_id=   → download via library (permanent, no expiry)
GET  /api/library            → list buyer purchases
```

### Reviews
```
POST /api/reviews            → create review (verified buyer only, 1x per transaction)
GET  /api/products/[id]/reviews → list reviews for product
```

### Seller
```
GET  /api/seller/dashboard   → stats (totalProducts, totalSales, revenue, balance)
GET  /api/seller/products    → list seller's products
POST /api/seller/withdrawals → request withdrawal
POST /api/seller/profile     → update seller info (bank, WhatsApp)
```

### Admin
```
GET  /api/admin/products          → moderation queue (PENDING products)
PATCH /api/admin/products/[id]   → approve/reject product
GET  /api/admin/withdrawals       → list pending withdrawals
PATCH /api/admin/withdrawals/[id] → process/reject withdrawal
GET  /api/admin/affiliate-withdrawals → list affiliate withdrawal requests
PATCH /api/admin/affiliate-withdrawals/[id] → process/reject
```

### Upload
```
POST /api/upload/direct      → server-mediated upload to R2
POST /api/upload/presigned   → generate presigned URL for client upload
```

### Landing Pages
```
POST /api/landingpages              → create LP (SELLER)
POST /api/landingpages/generate     → AI generate LP copy (Workers AI)
DELETE /api/landingpages/[id]       → delete LP
```

### Affiliate
```
POST /api/affiliate/register        → register as affiliate
GET  /api/affiliate/stats           → get affiliate stats (TODO: UI)
POST /api/affiliate/withdrawals    → request affiliate withdrawal (TODO: UI)
```

## Environment Variables (Wrangler Secrets)

**WAJIB disimpan via `wrangler secret put`, JANGAN di `wrangler.jsonc`!**

```
# Mayar.id
MAYAR_API_KEY
MAYAR_WEBHOOK_SECRET          # WAJIB untuk verifikasi signature (P0!)

# Email
RESEND_API_KEY
EMAIL_FROM=noreply@prodig.id

# WhatsApp (Conviq/Chatwoot)
CONVIQ_BASE_URL
CONVIQ_ACCOUNT_ID
CONVIQ_API_KEY
CONVIQ_WHATSAPP_INBOX_ID

# Auth
SESSION_SECRET                # untuk session cookie signing

# R2 (opsional, jika pakai S3 client untuk presigned URL)
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

**Wrangler config (wrangler.jsonc):**
```json
{
  "d1_databases": [{ "binding": "DB", "database_name": "prodig-db" }],
  "r2_buckets": [
    { "binding": "R2_FILES", "bucket_name": "prodig-files" },
    { "binding": "R2_PUBLIC", "bucket_name": "prodig-public" }
  ]
}
```

## Critical Security Issues (P0 — WAJIB diperbaiki)

1. **Webhook Mayar tidak verifikasi signature**
   - `src/pages/api/webhooks/mayar.ts` tidak pakai `MAYAR_WEBHOOK_SECRET`
   - Risk: siapa pun bisa POST payload palsu → transaksi jadi PAID tanpa bayar
   - Fix: verifikasi HMAC/signature Mayar sebelum proses

2. **Credential R2/API bisa jadi plaintext di wrangler.jsonc**
   - Pastikan SEMUA secret di `wrangler secret put`, bukan `vars`
   - Kalau sudah pernah commit ke git, ROTASI key-nya!

3. **Bug `const env = env` di webhook & download**
   - Bisa bikin `ReferenceError` runtime
   - Fix: rename variable atau pakai `const e = env`

4. **Authorization gap di `/api/library?trx_id=...`**
   - Detail transaction belum cek ownership buyer
   - Fix: tambah `AND buyerId = user.id`

5. **Withdrawal balance calculation bug**
   - `PENDING` withdrawals tidak mengurangi available balance
   - Risk: seller bisa request melebihi saldo
   - Fix: `balance = revenue - processed - pending`

## Known Quirks
- **R2 CORS** harus dikonfigurasi di Cloudflare dashboard untuk browser uploads
- **Download token expiry** (`tokenExpiresAt`) ada di schema tapi enforcement harus dicek
- **Withdrawal processing** manual oleh admin (transfer bank manual, lalu mark PROCESSED)
- **Seller bank info** (`bankAccount`, `bankName`) ada di User model tapi UI inputnya minimal
- **Affiliate UI** — schema & API ready tapi tidak ada halaman dashboard untuk affiliate
- **PPN 11%** sudah auto-calculate di checkout, tampil di breakdown
- **PDF watermark** jalan otomatis di webhook PAID, tapi file besar bisa OOM Workers

## Demo Credentials (Dev)
```
seller@prodig.id / password123
buyer@prodig.id / password123
```

## WhatsApp Notifications (Conviq)
- Webhook Mayar kirim WA ke: **buyer** (sukses + link), **seller** (pembelian baru), **affiliate** (conversion)
- Graceful degrade: kalau Conviq tidak dikonfigurasi, WA skip tanpa error
- Lihat `src/lib/conviq.ts` untuk implementasi

## Cloudflare Workers AI (LP Builder)
- Model: `@cf/meta/llama-3.1-8b-instruct`
- Fallback: rule-based copy generation kalau AI gagal
- Prompt di `src/pages/api/landingpages/generate.ts`

## Deployment
```bash
npm run build           # Astro build
npx wrangler deploy     # Deploy ke Cloudflare Workers
```

D1 migrations:
```bash
npx wrangler d1 migrations apply prodig-db --remote
```

---

## Roadmap Status
- **Fase 0 (Hardening):** In progress — webhook signature, security fixes, legal pages
- **Fase 1 (Quality):** Test suite, CI/CD, linting
- **Fase 2 (Growth):** Affiliate dashboard, SEO, search, coupons, seller storefront
- **Fase 3 (Scale):** Queues, video streaming, auto-payout, analytics

---

*Last updated: 2026-06-11 (synced with Astro/Cloudflare stack)*

*Previous versions (Next.js/Prisma/PostgreSQL) are archived in `backup-nextjs/` for reference only.*
