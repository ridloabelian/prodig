# PRD Prodig.id v2.0 — Consolidated Technical Specification

**Versi:** 2.0 (Konsolidasi)  
**Tanggal:** 11 Juni 2026  
**Domain:** prodig.id  
**Status:** MVP Feature-Complete, Fase 0 Hardening In Progress  
**Stack:** Astro 6 + Cloudflare Workers + D1 (SQLite) + Drizzle ORM + R2

---

## 1. Executive Summary

Prodig.id adalah marketplace produk digital lokal Indonesia — "Shopee-nya produk digital". Kreator bisa monetisasi skill dalam 5 menit. Pembeli bisa temukan produk digital berkualitas dalam 3 klik.

### Key Differentiators (vs Lynk.id, Karya Karsa, Saweria, Trakteer)
1. **Landing Page Builder per produk** — AI-assisted, bisa dipasang di bio Instagram/TikTok
2. **Watermark PDF otomatis** — email buyer + ID transaksi di setiap halaman
3. **Sistem Affiliate** — referral dengan komisi 20%, micro-influencer friendly
4. **Instant Delivery + Library** — file aman, akses permanen, rate limit anti-piracy

### Problem Statement
- Kreator Indonesia jual e-book, course, template via Instagram/WA — messy, no discovery, no trust
- Pembeli sulit cari, bandingkan, dan beli dengan aman
- Tidak ada sistem review & trust untuk produk digital lokal

### Solution
- Marketplace curated dengan instant file delivery, verified review, payment lokal (Mayar.id/QRIS)
- Landing page builder per produk (AI-assisted)
- Anti-piracy: watermark PDF + rate limit download + token expiry

---

## 2. Realita Stack (Single Source of Truth)

**⚠️ Dokumentasi lama (v1.0/v1.1) menyebut Next.js + Prisma + PostgreSQL + Vercel — SUDAH USANG.**

Stack aktual yang berjalan di production:

| Layer | Teknologi | Catatan |
|---|---|---|
| **Framework** | Astro 6.4 | SSR via `@astrojs/cloudflare` adapter |
| **Runtime** | Cloudflare Workers | Edge-native, zero cold start |
| **Language** | TypeScript | ESM modules |
| **Styling** | Tailwind CSS 4 | CSS-first `@theme` configuration |
| **Database** | Cloudflare D1 (SQLite) | Serverless, edge-replicated |
| **ORM** | Drizzle ORM 0.45 | Type-safe, migrations via `drizzle-kit` |
| **Auth** | Custom cookie-session | 30 hari expiry, auto-renewal, role-based middleware |
| **File Storage** | Cloudflare R2 | 2 bucket: `R2_FILES` (private) + `R2_PUBLIC` (thumbnails) |
| **Payment** | Mayar.id | Invoice API + Webhook callback (QRIS/VA/e-wallet) |
| **Email** | Resend | Transactional email |
| **WhatsApp** | Conviq/Chatwoot | WA notifikasi otomatis (buyer, seller, affiliate) |
| **AI** | Cloudflare Workers AI | `@cf/meta/llama-3.1-8b-instruct` untuk LP copy generation |
| **Hosting** | Cloudflare Pages | Auto-deploy dari branch |

---

## 3. MVP Scope (Feature Complete)

### Core Features (Must-Have)

| Feature | Status | Priority | Catatan |
|---|---|---|---|
| **Auth System** | ✅ | P0 | Custom session, role-based (BUYER/SELLER/ADMIN), 30 hari expiry |
| **Product Upload** | ✅ | P0 | File max 500MB, thumbnail, direct server upload + presigned fallback |
| **Search & Discovery** | ✅ | P0 | Keyword search, filter kategori, sorting (newest/bestselling/price) |
| **Checkout & Payment** | ✅ | P0 | Mayar.id (QRIS/VA/e-wallet), PPN 11% auto, breakdown transparan |
| **Instant Delivery** | ✅ | P0 | File delivery otomatis, token 24 jam, Library permanen, rate limit 3x/24h |
| **Review System** | ✅ | P1 | Rating 1-5 + komentar, verified buyer only, 1x per transaction |
| **Seller Dashboard** | ✅ | P1 | Stats, product management, withdrawal request, LP builder |
| **Admin Panel** | ✅ | P1 | Product moderation, withdrawal management, affiliate withdrawal |
| **Email Notifikasi** | ✅ | P1 | Resend: purchase success, download link, order status |
| **WhatsApp Notif** | ✅ | P1 | Conviq: buyer (success+link), seller (new sale), affiliate (conversion) |
| **PDF Watermark** | ✅ | P1 | Auto-watermark email + trx ID di setiap halaman PDF |
| **Landing Page Builder** | ✅ | P1 | AI-assisted per produk, 4 tema, publishable URL `/lp/[slug]` |
| **Affiliate System** | 🟡 | P1 | Schema & API ready, tracking referral, commission 20%. **UI missing** — dashboard affiliate belum ada |

### Yang Dicut (Fase 2+)
- ❌ Full-text search (Algolia/FTS5) — masih LIKE sederhana
- ❌ Subscription/recurring billing
- ❌ Mobile app (PWA dulu)
- ❌ AI recommendation engine
- ❌ Auto-payout (Mayar Payouts API) — masih manual transfer
- ❌ Video streaming (Cloudflare Stream) — file download saja
- ❌ File versioning
- ❌ Custom domain per LP

---

## 4. Database Schema (Drizzle + D1 SQLite)

```typescript
// src/db/schema.ts — 12 tabel

// 1. Users
users: id, name, email, emailVerified, image, password, role, whatsapp, bankAccount, bankName, createdAt, updatedAt

// 2. Sessions (custom session store)
sessions: id, sessionToken, userId, expiresAt

// 3. Categories
categories: id, name, slug, description

// 4. Products
products: id, sellerId, title, description, price, categoryId, fileKey, fileSize, fileName, thumbnail, status, salesCount, viewCount, createdAt, updatedAt

// 5. Affiliates
affiliates: id, userId, code, commissionPercent, status, totalEarnings, totalReferrals, createdAt, updatedAt

// 6. Transactions
transactions: id, buyerId, productId, subtotal, ppn, amount, commission, netAmount, affiliateId, affiliateCommission, mayarPaymentId, mayarInvoiceUrl, status, downloadToken, tokenExpiresAt, downloadCount, lastDownloadAt, watermarkedFileKey, notes, createdAt, updatedAt

// 7. Reviews
reviews: id, transactionId, productId, buyerId, rating, comment, createdAt

// 8. Withdrawals
withdrawals: id, sellerId, amount, status, notes, processedAt, createdAt, updatedAt

// 9. AffiliateWithdrawals
affiliateWithdrawals: id, affiliateId, amount, status, notes, processedAt, createdAt, updatedAt

// 10. DownloadLogs
downloadLogs: id, transactionId, userId, ipAddress, userAgent, createdAt

// 11. WebhookLogs
webhookLogs: id, provider, eventId, payload, processed, createdAt

// 12. LandingPages
landingPages: id, productId, sellerId, slug, title, subtitle, theme, prompt, status, heroTitle, heroSubtitle, heroFeatures, features, testimonials, faqs, createdAt, updatedAt
```

### Enums
- `User.role`: BUYER | SELLER | ADMIN
- `Product.status`: PENDING | APPROVED | REJECTED | HIDDEN
- `Transaction.status`: PENDING | PAID | FAILED | EXPIRED | REFUNDED
- `Withdrawal.status`: PENDING | PROCESSED | REJECTED
- `Affiliate.status`: ACTIVE | INACTIVE
- `LandingPage.status`: DRAFT | PUBLISHED

---

## 5. User Flows

### 5.1 Buyer Journey
```
Landing Page → Search/Kategori → Product Detail (preview)
→ Checkout (Mayar.id) → Payment Success → Email/WA Notif
→ Download File (token 24 jam) OR Library (permanent access)
```

### 5.2 Seller Journey
```
Register → Upload Produk (file + info) → Status PENDING
→ Admin Approve → APPROVED → Sales
→ Dashboard Stats → Withdrawal Request → Admin Processed
→ (Opsional) Landing Page Builder → AI Generate → Publish
```

### 5.3 Affiliate Journey
```
Register → Request Affiliate → Dapat Kode Referral
→ Promosikan Link: prodig.id/products/[id]?ref=[code]
→ Buyer Checkout via Link → Webhook PAID
→ Commission 20% masuk ke balance
→ Request Affiliate Withdrawal
```

### 5.4 Admin Journey
```
Login → Moderation Queue (Approve/Reject Products)
→ Manage Withdrawals (Seller + Affiliate)
→ Monitor Transactions
```

---

## 6. Tech Stack Detail

### 6.1 Astro + Cloudflare Workers
- Astro 6.4 dengan `@astrojs/cloudflare` adapter
- Hybrid rendering: static pages (prerender) + dynamic pages (SSR)
- API routes: `src/pages/api/**/*.ts` → server-side di Workers
- `wrangler.jsonc` config:
  - D1 database: `prodig-db`
  - R2 buckets: `prodig-files` (private) + `prodig-public` (thumbnails)
  - Compatibility flags: `global_fetch_strictly_public`, `nodejs_compat`

### 6.2 Drizzle ORM + D1
- Schema: `src/db/schema.ts`
- Migrations: `drizzle/migrations/` → apply via `wrangler d1 migrations apply`
- Client: `src/db/index.ts` — singleton dengan D1 binding
- Type-safe queries, relational queries untuk joins

### 6.3 Authentication (Custom Session)
- Session cookie dengan `SESSION_SECRET` (Wrangler Secret)
- Cookie: `prodig_session` — signed, httpOnly, secure, sameSite=lax
- Expiry: 30 hari, auto-renewal jika < 15 hari sisa
- Middleware: `src/middleware.ts` — role-based route protection
- Login: bcryptjs hash comparison
- Register: bcryptjs hash (10 rounds), default role BUYER

### 6.4 File Upload (2 Modes)

**Mode 1: Direct Server Upload (Default)**
```
Client POST file → /api/upload/direct (multipart)
→ Server validasi (size, type, max 500MB produk / 2MB thumbnail)
→ Server upload langsung ke R2 via env.R2_FILES.put(key, file)
→ Return { fileKey, fileUrl }
→ Product form submit dengan fileKey
```

**Mode 2: Presigned URL (Legacy/Alternative)**
```
Client → POST /api/upload/presigned → server generate presigned URL
→ Client PUT file langsung ke R2
→ Return fileKey
→ Product form submit dengan fileKey
```

### 6.5 Payment (Mayar.id)

**Checkout Flow:**
1. Buyer klik "Beli Sekarang" → POST /api/checkout
2. Server validasi produk (APPROVED, buyer belum punya)
3. Hitung: subtotal = product.price, ppn = 11%, amount = subtotal + ppn, commission = 10% subtotal, netAmount = subtotal - commission
4. Create Transaction record (status PENDING)
5. Call Mayar.id API create invoice:
   - amount = amount (total dengan PPN)
   - description = "Pembelian [product.title] di Prodig.id"
   - customer = buyer info
   - redirectUrl = [APP_URL]/checkout/success?trx_id=[transaction.id]
   - webhookUrl = [APP_URL]/api/webhooks/mayar
   - externalId = transaction.id (idempotency)
6. Update Transaction dengan mayarPaymentId + mayarInvoiceUrl
7. Return { invoiceUrl } → client redirect ke Mayar.id

**Webhook Flow (POST /api/webhooks/mayar):**
1. ⚠️ **WAJIB: Verifikasi signature Mayar** (belum diimplementasi — P0!)
2. Log payload ke WebhookLog (idempotency check: eventId + processed)
3. Cari Transaction by mayarPaymentId atau externalId
4. Update status:
   - PAID → increment salesCount, set tokenExpiresAt (now + 24h), watermark PDF (jika PDF), kirim email + WA, create downloadToken
   - EXPIRED → update transaction status
   - FAILED → update transaction status
5. Mark webhook as processed

### 6.6 File Delivery

**Download via Email Token (GET /api/download?token=uuid):**
1. Cari Transaction by downloadToken
2. Validasi: status === PAID, token belum expired
3. Rate limit: < 3 download dalam 24 jam (cek DownloadLog)
4. Generate R2 presigned GET URL (5 menit expiry)
5. Insert DownloadLog, update downloadCount + lastDownloadAt
6. Redirect 302 ke presigned URL

**Library Permanent Access (GET /api/download?trx_id=id):**
1. Auth: wajib login, buyer harus owner transaction
2. Sama seperti token-based (step 4-6), tapi tanpa cek token expiry
3. Rate limit tetap 3x/24h

### 6.7 Review System
- POST /api/reviews: transaction harus PAID + milik buyer + belum ada review + > 1 jam sejak createdAt
- GET /api/products/[id]/reviews: list dengan buyer info, sort newest, paginate 10 per page
- Review aggregate: avg rating + count di product detail

### 6.8 Affiliate System (Schema Ready, UI Missing)
- Affiliate registration: POST /api/affiliate/register
- Referral tracking: cookie `ref=[code]` saat buyer browse → disimpan saat checkout
- Commission: 20% dari subtotal (dibayar platform, bukan dipotong dari seller)
- Attribution: affiliateId di Transaction record saat checkout
- Webhook PAID: update affiliate.totalEarnings + totalReferrals
- Withdrawal: POST /api/affiliate/withdrawals (API ready, UI missing)

### 6.9 Landing Page Builder
- AI generate: POST /api/landingpages/generate — Cloudflare Workers AI (Llama 3.1 8B)
- Fallback: rule-based copy generation kalau AI gagal
- Schema: title, subtitle, theme, hero, features, testimonials, faqs
- Public URL: `/lp/[slug]` — buyer bisa akses tanpa login
- Themes: midnight, emerald, ocean, sunset

---

## 7. Business Rules & Constraints

| Rule | Value | Location |
|---|---|---|
| Platform Fee | 10% dari subtotal | Checkout API |
| PPN | 11% dari subtotal | Checkout API (ditambah ke amount) |
| Affiliate Commission | 20% dari subtotal | Checkout API (dibayar platform) |
| Max Product File | 500 MB | Upload API validasi |
| Max Thumbnail | 2 MB | Upload API validasi |
| Min Price | Rp 10.000 | Zod schema |
| Download Limit | 3x per 24 jam | Download API (DownloadLog) |
| Token Expiry | 24 jam | Webhook handler (tokenExpiresAt) |
| Min Withdrawal | Rp 50.000 | Withdrawal API validasi |
| Withdrawal SLA | Manual, 2x/minggu | Dokumentasi + UI copy |
| Review Cooldown | 1 jam post-purchase | Review API validasi |
| Approval SLA | 24 jam (copy only) | Admin panel + email |
| Session Expiry | 30 hari | Cookie config |
| Session Renewal | < 15 hari sisa | Middleware auto-renewal |

### Revenue Breakdown (per transaksi Rp 100.000)
```
Subtotal:          Rp 100.000 (harga produk seller)
PPN 11%:          + Rp  11.000 (dibayar buyer)
─────────────────────────────
Amount:            Rp 111.000 (total bayar buyer)

Platform Fee 10%: - Rp  10.000 (diterima platform)
Affiliate 20%:    - Rp  20.000 (jika ada referral, platform bayar)
─────────────────────────────
Net Seller:        Rp  90.000 (diterima seller, belum termasuk PPN)
```

---

## 8. Security & Compliance (Fase 0 — Wajib Selesai)

### 🔴 P0: Security Issues (Wajib sebelum launch)

| Issue | Severity | Status | Action | Deadline |
|---|---|---|---|---|
| Webhook Mayar signature verification | 🔴 P0 | ❌ Belum | Verifikasi HMAC/signature sebelum proses transaksi | Fase 0 |
| R2/API credentials di wrangler.jsonc | 🔴 P0 | ⚠️ Partial | Pindah ke Wrangler Secrets, rotasi key yang bocor | Fase 0 |
| Legal pages (Syarat, Privasi, Kontak) | 🔴 P0 | ❌ Belum | Wajib untuk payment gateway compliance | Fase 0 |
| Rate limiting API (login, register) | 🟡 P1 | ❌ Belum | Cegah brute-force | Fase 0 |
| `const env = env` bug di webhook/download | 🟡 P1 | ❌ Belum | Fix ReferenceError | Fase 0 |
| Authorization trx_id di /api/library | 🟡 P1 | ❌ Belum | Tambah buyerId check | Fase 0 |
| Withdrawal balance calculation | 🟡 P1 | ❌ Belum | Pending ikut mengurangi balance | Fase 0 |

### 🟡 P1: Quality Baseline (1-2 minggu)
- Test suite: Vitest + `@cloudflare/vitest-pool-workers`
- CI/CD: GitHub Actions (lint → typecheck → test → build → deploy)
- Linter: Biome atau ESLint
- Structured logging + error tracking

### 🟢 P2: Growth Features (3-4 minggu)
- Affiliate dashboard UI (code generator, stats, withdrawal)
- Seller product edit/delete (PENDING only, metadata only jika ada sales)
- Seller public storefront (`/seller/[slug]`)
- Dynamic SEO (Open Graph, Twitter Card, JSON-LD)
- Sitemap + robots.txt
- Search & filter (FTS5 atau Algolia)
- Coupon/voucher system
- Related products
- Welcome & transactional emails

---

## 9. API Endpoint Inventory

| Endpoint | Method | Auth | Status | Catatan |
|----------|--------|------|--------|---------|
| `/api/auth/register` | POST | Public | ✅ | bcrypt hash, default BUYER |
| `/api/auth/login` | POST | Public | ✅ | session cookie |
| `/api/auth/logout` | POST | Public | ✅ | clear cookie |
| `/api/products` | POST | Seller | ✅ | create product, status PENDING |
| `/api/products` | GET | Public | ✅ | list, search, filter, sort |
| `/api/products/[id]` | GET | Public | ✅ | detail + reviews |
| `/api/checkout` | POST | Buyer | ✅ | Mayar invoice |
| `/api/webhooks/mayar` | POST | Public | 🟡 | handler ready, signature verification ❌ |
| `/api/download` | GET | Token/User | ✅ | rate limit 3x/24h |
| `/api/library` | GET | Buyer | 🟡 | list ✅, detail trx_id need auth fix |
| `/api/reviews` | POST | Buyer | ✅ | verified buyer only |
| `/api/upload/direct` | POST | Auth | ✅ | server-mediated upload |
| `/api/upload/presigned` | POST | Auth | ✅ | presigned URL fallback |
| `/api/seller/dashboard` | GET | Seller | ✅ | stats aggregation |
| `/api/seller/products` | GET | Seller | ✅ | list seller products |
| `/api/seller/withdrawals` | POST | Seller | ✅ | request withdrawal |
| `/api/seller/profile` | POST | Seller | ✅ | update bank info |
| `/api/admin/products` | GET | Admin | ✅ | moderation queue |
| `/api/admin/products/[id]` | PATCH | Admin | ✅ | approve/reject |
| `/api/admin/withdrawals` | GET/PATCH | Admin | ✅ | manage withdrawals |
| `/api/admin/affiliate-withdrawals` | GET/PATCH | Admin | ✅ | manage affiliate withdrawals |
| `/api/landingpages` | POST/DELETE | Seller | ✅ | LP CRUD |
| `/api/landingpages/generate` | POST | Seller | ✅ | AI generate LP copy |
| `/api/affiliate/register` | POST | Auth | ✅ | register as affiliate |
| `/api/affiliate/stats` | GET | Affiliate | ✅ | stats API (UI missing) |
| `/api/affiliate/withdrawals` | POST | Affiliate | ✅ | request withdrawal (UI missing) |

**Missing endpoints (Fase 2):**
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/coupons/validate`
- `GET /api/notifications`
- `POST/DELETE /api/favorites`
- `GET /api/seller/analytics` (chart data)

---

## 10. Environment Variables (Wrangler Secrets)

**WAJIB disimpan via `wrangler secret put` — JANGAN di `wrangler.jsonc` atau file apapun!**

```bash
# Auth
wrangler secret put SESSION_SECRET

# Mayar.id Payment
wrangler secret put MAYAR_API_KEY
wrangler secret put MAYAR_WEBHOOK_SECRET    # WAJIB untuk verifikasi signature

# Email (Resend)
wrangler secret put RESEND_API_KEY
# EMAIL_FROM=noreply@prodig.id  (bisa di wrangler.jsonc vars, bukan secret)

# WhatsApp (Conviq/Chatwoot)
wrangler secret put CONVIQ_BASE_URL
wrangler secret put CONVIQ_ACCOUNT_ID
wrangler secret put CONVIQ_API_KEY
wrangler secret put CONVIQ_WHATSAPP_INBOX_ID

# R2 (untuk S3 client presigned URL — jika pakai)
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

**Wrangler config (wrangler.jsonc) — HANYA non-sensitive:**
```json
{
  "compatibility_date": "2026-06-02",
  "compatibility_flags": ["global_fetch_strictly_public", "nodejs_compat"],
  "name": "prodig",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "d1_databases": [{ "binding": "DB", "database_name": "prodig-db" }],
  "r2_buckets": [
    { "binding": "R2_FILES", "bucket_name": "prodig-files" },
    { "binding": "R2_PUBLIC", "bucket_name": "prodig-public" }
  ]
}
```

---

## 11. Known Limitations (Fase 1)

1. **Search masih LIKE sederhana** — cukup untuk <10.000 produk. Upgrade ke FTS5 atau Algolia di Fase 2.
2. **Watermark hanya PDF** — file lain (video, ZIP, image) tidak di-watermark. Untuk course video, pertimbangkan Cloudflare Stream di Fase 3.
3. **Withdrawal 100% manual** — admin transfer bank manual, lalu mark PROCESSED. Auto-payout via Mayar Payouts API di Fase 3.
4. **WhatsApp notifikasi saja** — email notifikasi ada, tapi tidak ada in-app notification bell.
5. **Thumbnail tanpa resize** — upload ke R2 tanpa optimization. Tambah Cloudflare Images atau Sharp di Fase 2.
6. **File type validation di API saja** — client-side juga ada tapi bisa di-bypass.
7. **R2 bucket private** — tidak ada public listing, semua download via presigned URL.
8. **PPN tidak ada e-Faktur** — PPN dihitung di checkout tapi belum ada integrasi e-Faktur DJP. Konsultasi legal untuk PKP di Fase 2.
9. **Affiliate UI tidak ada** — schema & API lengkap tapi tidak ada halaman dashboard untuk affiliate.
10. **Landing Page kaku** — section order fixed (hero → features → testimonials → faqs). Reordering di Fase 2.

---

## 12. Post-MVP Backlog (Fase 2-3)

### Fase 2 — Growth & UX (3-4 minggu)
- [ ] Affiliate dashboard UI (code, link generator, stats, withdrawal)
- [ ] Seller product edit/delete (metadata only jika sudah ada sales)
- [ ] Seller public storefront (`/seller/[slug]`)
- [ ] Dynamic SEO meta tags (Open Graph, Twitter Card, JSON-LD Product)
- [ ] Sitemap + robots.txt
- [ ] Search & filter (FTS5 atau Algolia)
- [ ] Coupon/voucher system
- [ ] Related products
- [ ] Welcome & transactional emails (register, approve, reject, sale, withdrawal)
- [ ] In-app notification bell
- [ ] Seller analytics (chart views, sales, conversion)
- [ ] Image optimization (Cloudflare Images / Sharp)

### Fase 3 — Scale & Automation (6+ minggu)
- [ ] Cloudflare Queues untuk background jobs (watermark, email, WA, analytics)
- [ ] Video streaming (Cloudflare Stream) untuk course
- [ ] File versioning — seller upload versi baru, buyer lama dapat akses update
- [ ] Auto-payout (Mayar Payouts API atau bank API)
- [ ] PPN e-Faktur integration (DJ Pajak)
- [ ] Multi-payment gateway (backup selain Mayar)
- [ ] PWA / mobile app
- [ ] Custom domain per landing page
- [ ] AI product moderation (pre-screen sebelum admin queue)
- [ ] Analytics dashboard (GMV, conversion, retention, CAC)

---

## 13. Metrics & Success Criteria

| Metric | Target 30 Hari | Target 90 Hari | Catatan |
|---|---|---|---|
| Products Listed | 50 | 1.000 | Seed + organic seller onboarding |
| Registered Sellers | 20 | 200 | Outreach Instagram/TikTok |
| Transactions | 10 | 300 | Focus on buyer acquisition bulan 2-3 |
| GMV | Rp 5 juta | Rp 150 juta | AOV Rp 500.000 (mix produk) |
| Repeat Buyer Rate | N/A | >20% | Library + notifikasi produk baru |
| Affiliate Referrals | 5 | 100 | Affiliate dashboard UI = blocker |
| North Star Metric | Weekly Active Transactions | | Transaksi unik per minggu |

---

## 14. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Webhook fraud (signature missing) | Medium | Critical | **Fase 0: implement signature verification ASAP** |
| Credential leak (git history) | Low | Critical | **Fase 0: rotate keys, move to Wrangler Secrets** |
| Mayar.id downtime | Medium | High | Retry mechanism, webhook log, fallback manual (admin kirim file) |
| Seller tidak mau pindah dari Instagram | High | Medium | LP builder = complement, bukan replacement. Offer: "Upload di sini, link pasang di bio IG" |
| Buyer tidak percaya platform baru | Medium | High | Verified review, money-back guarantee, instant delivery, legal pages |
| File piracy/resell | Medium | Medium | Watermark PDF, rate limit download, token expiry. Upgrade: DRM non-PDF di Fase 3 |
| D1 write concurrency limit | Medium | Medium | Flash sale = risk. Monitor, scale ke Hyperdrive/Neon jika volume tinggi |
| Worker OOM (watermark PDF besar) | Medium | Medium | Fase 3: move watermark ke Cloudflare Queues (background) |
| PPN compliance | Medium | High | Konsultasi legal, e-Faktur integration di Fase 3. Sementara: PPN dihitung tapi manual remit |

---

## 15. Team & Resource Estimation

### Solo Developer Timeline
```
Fase 0 (Hardening):           1-2 minggu
Fase 1 (Quality Baseline):    1-2 minggu
Fase 2 (Growth):              3-4 minggu
Fase 3 (Scale):               6+ minggu (ongoing)
─────────────────────────────────────
Total MVP → v1.0:             ~12-16 minggu
```

### Recommended Sprint Prioritas
**Sprint 1 (Minggu 1-2): Security + Legal**
- Webhook signature verification
- Credential rotation + Wrangler Secrets
- Legal pages (Syarat, Privasi, Kontak)
- Rate limit API
- Fix env bug + auth gaps
- Fix withdrawal balance

**Sprint 2 (Minggu 3-4): SEO + Discovery**
- Dynamic meta tags
- Sitemap + robots
- Search & filter
- Seller public profile
- Welcome & transactional emails

**Sprint 3 (Minggu 5-6): Seller UX**
- Product edit/delete
- Seller notifications (email + in-app)
- Affiliate dashboard UI
- Seller analytics chart

**Sprint 4 (Minggu 7-8): Growth Engine**
- Coupon system
- Related products
- Wishlist/favorites
- Abandoned checkout reminder
- Landing page analytics

---

## 16. Documentation History

| Versi | Tanggal | Stack | Status |
|---|---|---|---|
| 1.0 | 27 Mei 2026 | Next.js + Prisma + PostgreSQL | **USANG** — iterasi awal, tidak pernah di-deploy |
| 1.1 | 27 Mei 2026 | Next.js + Prisma + PostgreSQL | **USANG** — technical spec untuk Kimi Code CLI |
| 2.0 | 11 Juni 2026 | Astro + Cloudflare Workers + D1 + Drizzle | **AKTIF** — single source of truth, synced dengan codebase |

---

## 17. References & Insight Files

Insight files di root repo (hasil analisis AI assistant berbeda):
- `insight-kimi.md` — Analisis arsitektur, gap analysis, master plan (Kimi Code CLI)
- `insight-claude.md` — Security audit, technical debt, roadmap (Claude)
- `insight-codex.md` — Code review, bug findings, execution plan (Codex)
- `insight-gemini.md` — Strategic moats, Cloudflare ecosystem analysis (Gemini)
- `insight-antigravity.md` — Scale & performance, edge-native architecture (Antigravity)

---

**Dokumen ini adalah spesifikasi teknis final untuk eksekusi engineering.**  
**Fase 0 (Security Hardening) wajib selesai sebelum marketing/launch.**  
**Jangan tambah fitur baru sebelum P0 issues selesai.**

---

_Dokumen ini dibuat untuk Prodig.id — Marketplace Produk Digital Indonesia._  
_Versi 2.0 — Konsolidasi dari PRD v1.0, v1.1, dan insight 5 AI assistant._  
_Last updated: 2026-06-11_
