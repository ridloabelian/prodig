# Prodig.id — Master Plan & Strategic Insight

> Dokumen ini merupakan hasil analisis mendalam terhadap codebase Prodig.id marketplace produk digital. Disusun sebagai panduan prioritas pengembangan pasca-MVP.

---

## 1. Executive Summary

### 1.1 Status Proyek
| Aspek | Status |
|-------|--------|
| **Core MVP** | ✅ Feature-complete (jual-beli, payment, download, review, affiliate, LP builder) |
| **Stack** | Astro 6.4 + Cloudflare Workers + D1 + R2 + Tailwind 4 |
| **Payment** | Mayar.id (QRIS/VA/E-wallet) dengan webhook otomatis |
| **Deploy Target** | Cloudflare Pages/Workers (edge-native) |
| **Gap Kritis** | 7 item high-priority (lihat §3) |
| **Oportunitas** | 12 item growth-oriented (lihat §4) |

### 1.2 Catatan Penting
- **AGENTS.md usang**: masih menyebut Next.js 16 + Prisma + PostgreSQL, padahal aktual adalah Astro + Drizzle + D1 SQLite.
- **Wrangler vars terexpose**: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` seharusnya di `secrets` bukan `vars`.
- **Direct upload aktif**: Upload kini menggunakan binding R2 langsung (`env.R2_FILES.put`) bukan presigned URL — ini lebih baik untuk Workers.

---

## 2. Arsitektur & Dependency Map

### 2.1 Database Schema (12 Tabel)
```
users ─┬─ sessions
       ├─ products ─┬─ categories
       │            ├─ transactions ─┬─ reviews
       │            │               ├─ download_logs
       │            │               └─ affiliates ─┬─ affiliate_withdrawals
       │            └─ landing_pages
       └─ withdrawals

webhook_logs (standalone)
```

### 2.2 Alur Data Kritis
```
[Seller Upload] → R2_FILES (product) + R2_PUBLIC (thumbnail)
                → D1 (products.status = PENDING)
                → Admin Approval → APPROVED

[Buyer Checkout] → D1 (transactions.status = PENDING)
                 → Mayar API (invoiceUrl)
                 → Buyer Pay → Webhook PAID
                 → PDF Watermark (jika PDF)
                 → Email (Resend) + WA (Conviq)
                 → D1 (status = PAID, salesCount++)
                 → Library Buyer tersedia

[Download] → token/trx_id → Rate Limit Check (3x/24h)
           → Presigned R2 URL → Redirect 302
```

### 2.3 Security Surface
| Layer | Status | Rekomendasi |
|-------|--------|-------------|
| Auth | Custom session (cookie 30 hari) | Perlu rate limit login |
| R2 Keys | Hardcoded di wrangler.jsonc | Pindah ke `wrangler secret` |
| API Input | Zod validation | ✅ Baik, tambah strict mode |
| SQL Injection | Drizzle ORM (parameterized) | ✅ Aman |
| XSS | Astro auto-escape | ✅ Aman, tapi review content perlu sanitize |
| Download | Token-based + rate limit | ✅ Baik |

---

## 3. FASE 1 — Foundation & Critical Fixes (Wajib Sebelum Launch)

> *Target: 2–3 minggu | Impact: Blocker untuk production trust*

### 3.1 🔴 Security & Config

#### SEC-001: Pindahkan Secrets ke Wrangler Secrets
**File:** `wrangler.jsonc`
**Masalah:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MAYAR_API_KEY`, `RESEND_API_KEY` terlihat di config.
```bash
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put MAYAR_API_KEY
wrangler secret put RESEND_API_KEY
# Hapus dari vars di wrangler.jsonc
```

#### SEC-002: Rate Limiting API
**Scope:** Semua endpoint auth & public
**Implementasi:** Gunakan Cloudflare KV atau in-memory rate limiter untuk:
- Login: 5 attempt / 15 menit per IP
- Register: 3 attempt / jam per IP
- Checkout: 10 attempt / menit per user
- Download: sudah ada (3x/24h per trx)

#### SEC-003: CSRF Protection
**Status:** Saat ini form submission tidak memiliki CSRF token. Untuk Astro + API route, tambah:
- Double-submit cookie pattern, atau
- Synchronize token di setiap form POST

### 3.2 🔴 Legal & Trust Pages

| Halaman | Status | Prioritas |
|---------|--------|-----------|
| `/syarat-ketentuan` | ❌ Belum ada | **P0** — wajib untuk payment gateway |
| `/kebijakan-privasi` | ❌ Belum ada | **P0** — wajib untuk GDPR/PDP Indonesia |
| `/kontak` | ❌ Belum ada | **P1** |
| `/cara-kerja` | ❌ Hanya anchor di landing | **P1** |
| `/faq` | ❌ Hanya di LP builder | **P2** |

**Catatan:** Mayar.id dan payment processor biasanya mensyaratkan halaman legal yang dapat diakses publik.

### 3.3 🔴 SEO & Discoverability

#### SEO-001: Dynamic Meta Tags
**Masalah:** Semua page Astro menggunakan `<Layout title="...">` statis. Perlu:
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card tags
- Canonical URL
- JSON-LD structured data (Product, Organization)

#### SEO-002: Sitemap & Robots
**Buat:**
- `/public/robots.txt`
- `/public/sitemap.xml` (atau `/pages/sitemap.xml.ts` untuk dynamic)

#### SEO-003: Katalog Produk Publik
**File:** `src/pages/products/index.astro` — perlu verifikasi apakah sudah ada pagination & filter kategori.

### 3.4 🔴 Email Verification & Password Recovery

| Fitur | Status | Impact |
|-------|--------|--------|
| Email verification saat register | ❌ Tidak ada | Medium — risiko fake account |
| Forgot password | ❌ Tidak ada | **High** — UX blocker |
| Change password | ❌ Tidak ada | Medium |

**Implementasi:**
- Tambah kolom `verificationToken` di `users` (sudah ada di schema tapi tidak dipakai)
- Buat endpoint `/api/auth/forgot-password` dan `/api/auth/reset-password`
- Gunakan Resend untuk kirim email reset link

---

## 4. FASE 2 — Buyer Experience Upgrade (Growth)

> *Target: 3–4 minggu | Impact: Retention & Conversion Rate*

### 4.1 Pencarian & Discovery

#### BUY-001: Search & Filter Katalog
**Halaman:** `/products`
**Fitur:**
- Search by keyword (full-text search D1 via `LIKE` atau nanti D1 Full-Text Search)
- Filter by: kategori, harga range, rating, newest/best-selling
- Sort: relevance, price asc/desc, newest, most popular
- Pagination (20 item per page)

#### BUY-002: Wishlist / Favorit
**Schema baru:**
```sql
favorites: user_id + product_id + created_at
```
**UI:** Heart icon di ProductCard & ProductDetail

#### BUY-003: Related Products
**Query:** Produk dalam kategori yang sama, diexclude produk saat ini, limit 4.

### 4.2 Product Detail Enhancement

#### BUY-004: Seller Public Profile
**Halaman baru:** `/seller/[sellerId]` atau `/seller/[sellerSlug]`
**Tampilkan:**
- Nama seller, total produk, total sales, rating rata-rata
- List produk seller lainnya
- Avatar / profile image

#### BUY-005: Product Preview / Demo
**Ide:** Untuk produk tertentu (ebook, template), tampilkan 1–3 halaman preview.
**Implementasi:** Upload file preview terpisah ke R2_PUBLIC, tampilkan di product detail.

### 4.3 Checkout & Post-Purchase

#### BUY-006: Cart System (Multi-item Checkout)
**Status saat ini:** Direct buy (1 produk = 1 checkout). 
**Upgrade:**
- Cart stored di `localStorage` atau D1 (`carts` table)
- Bulk checkout ke Mayar (jika Mayar support multi-item, atau buat invoice per item)

#### BUY-007: Kupon / Voucher System
**Schema baru:**
```sql
coupons: code, type (percent/fixed), value, max_uses, used_count, expires_at, min_purchase
```
**Integrasi:** Apply coupon saat checkout → adjust `amount` di transaction.

---

## 5. FASE 3 — Seller Power-Up (Retention)

> *Target: 3–4 minggu | Impact: Seller stickiness & GMV*

### 5.1 Product Management

#### SEL-001: Edit & Delete Produk
**Status:** Seller hanya bisa create, tidak bisa edit/delete setelah upload.
**Batasan:** Hanya produk dengan `status = PENDING` atau `salesCount = 0` yang bisa di-edit. Jika sudah ada penjualan, hanya metadata (title, description, price) yang bisa diubah — file tidak bisa.

#### SEL-002: Multi-file Produk
**Status:** Saat ini 1 produk = 1 file.
**Upgrade:**
- Schema: `product_files` table (product_id, file_key, file_name, file_size, sort_order)
- UI: Tambah/remove file di form sell & edit

#### SEL-003: Product Analytics
**Dashboard enhancement:**
- Views over time (7d, 30d, 90d) → butuh `product_views` table harian
- Conversion rate (views → sales)
- Revenue chart
- Top traffic sources (if implement UTM tracking)

### 5.2 Seller Profile & Branding

#### SEL-004: Seller Storefront
**Halaman:** `/store/[sellerSlug]` atau `/seller/[sellerId]`
**Fitur:**
- Custom store banner
- Store description
- Social links
- List semua produk seller

#### SEL-005: Seller Notifications
**Status:** Saat ini hanya WA notification dari webhook.
**Upgrade:** In-app notification bell di navbar seller:
- Produk di-approve / di-reject
- Ada pembelian baru
- Withdrawal di-proses
- Review baru

### 5.3 Withdrawal & Keuangan

#### SEL-006: Withdrawal History Detail
**Status:** Tabel withdrawals ada, tapi tidak ada detail per transaksi.
**Upgrade:** Link withdrawal ke transaksi-transaksi yang mendasarinya.

#### SEL-007: Auto-withdrawal (Future)
**Status:** Manual oleh admin.
**Roadmap:** Integrasi dengan payment gateway untuk auto-transfer (bukan prioritas saat ini).

---

## 6. FASE 4 — Growth Engine & Automation

> *Target: 4–6 minggu | Impact: Viral loop & operational efficiency*

### 4.1 Affiliate System Enhancement

#### AFF-001: Affiliate Dashboard
**Status:** Schema & API sudah ada, tapi **tidak ada halaman UI** untuk affiliate.
**Buat:** `/affiliate/dashboard.astro`
- Statistik: total referrals, total earnings, conversion rate
- List conversions (siapa yang beli, produk apa, komisi berapa)
- Withdrawal request (affiliate withdrawals sudah ada API & admin panel)
- Link generator: `https://prodig.id/products/[id]?ref=[affiliateCode]`

#### AFF-002: Affiliate Marketing Materials
- Banner images yang bisa di-download affiliate
- Copy text untuk social media

### 4.2 Notification Center

#### NOT-001: In-App Notifications
**Schema baru:**
```sql
notifications: id, user_id, type, title, message, data, read_at, created_at
```
**Types:** `PRODUCT_APPROVED`, `PRODUCT_REJECTED`, `NEW_SALE`, `WITHDRAWAL_PROCESSED`, `NEW_REVIEW`

#### NOT-002: Email Notifications (Transactional)
| Event | Status | Action |
|-------|--------|--------|
| Register success | ❌ | Kirim welcome email |
| Product approved | ❌ | Notify seller via email |
| Product rejected | ❌ | Notify seller via email + reason |
| New sale | ✅ (WA only) | Tambah email notification |
| Withdrawal processed | ❌ | Notify seller |
| New review | ❌ | Notify seller |

### 4.3 AI & Automation

#### AI-001: AI Product Description Generator
**Status:** AI hanya untuk Landing Page copywriter.
**Upgrade:** Gunakan Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) untuk generate:
- Product description dari title
- SEO meta description

#### AI-002: Smart Product Moderation
**Ide:** AI pre-screen produk sebelum masuk admin queue:
- Detect inappropriate content
- Auto-approve jika confidence tinggi & seller trusted

---

## 7. FASE 5 — Scale & Performance

> *Target: Ongoing | Impact: Cost efficiency & reliability*

### 7.1 Performance

#### PERF-001: Caching Strategy
| Layer | Implementasi |
|-------|--------------|
| Edge Cache | Cloudflare Cache API untuk halaman publik |
| Product List | Cache `/products` di KV (TTL 5 menit) |
| Landing Page | Cache `/lp/[slug]` di KV (TTL 1 jam jika published) |
| Session | KV untuk session lookup (alternatif dari D1) |

#### PERF-002: Image Optimization
- Gunakan Cloudflare Images atau buat `/api/image` proxy dengan format auto (webp/avif)
- Thumbnail lazy loading

### 7.2 Observability

#### OBS-001: Logging & Error Tracking
**Status:** Console.log dasar saja.
**Upgrade:**
- Integrasi Cloudflare Workers Logpush
- Custom error tracking ke D1 atau external service

#### OBS-002: Business Metrics Dashboard
**Metrik penting:**
- GMV harian/mingguan/bulanan
- Conversion rate (visit → checkout → paid)
- Seller activation rate
- Buyer retention (repeat purchase)

### 7.3 Data Integrity

#### DATA-001: Backup Strategy
**D1:** Enable D1 backups di Cloudflare dashboard.
**R2:** Enable object versioning untuk bucket prodig-files.

#### DATA-002: Database Migrations
**Status:** `drizzle-kit` tersedia. Pastikan setiap schema change memiliki migration file yang terekam.

---

## 8. Quick Wins (Low Effort, High Impact)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix footer links (Syarat, Privasi, Kontak) | 2 jam | 🔴 P0 |
| 2 | Dynamic meta tags di product detail & LP | 4 jam | 🟡 High |
| 3 | Add `robots.txt` & `sitemap.xml` | 2 jam | 🟡 High |
| 4 | Forgot password flow | 1 hari | 🔴 P0 |
| 5 | Rate limit login API | 3 jam | 🔴 P0 |
| 6 | Product edit untuk PENDING products | 4 jam | 🟡 High |
| 7 | Affiliate dashboard UI | 2 hari | 🟢 Medium |
| 8 | Search bar di `/products` | 1 hari | 🟡 High |
| 9 | Welcome email setelah register | 3 jam | 🟢 Medium |
| 10 | Seller notification email (approve/reject) | 3 jam | 🟡 High |

---

## 9. Known Technical Debt

| Item | Lokasi | Severity |
|------|--------|----------|
| `env` di Mayar webhook (`const env = env;`) — kemungkinan typo, seharusnya `const e = env;` atau langsung pakai `env` global | `src/pages/api/webhooks/mayar.ts:17` | 🟡 Medium |
| `AGENTS.md` outdated (Next.js references) | Root | 🟢 Low |
| Inline JS di Astro files sangat besar (sell.astro: 430+ baris script, dashboard.astro: 650+ baris script) — sulit maintain | Multiple pages | 🟡 Medium |
| `any` types banyak digunakan di Astro frontmatter | Multiple pages | 🟢 Low |
| `getPublicUrl` mengandalkan env var yang mungkin undefined — perlu fallback lebih robust | `src/lib/r2.ts` | 🟢 Low |

---

## 10. Resource & Team Estimation

### 10.1 Solo Developer Timeline
```
Fase 1 (Critical Fixes):     2–3 minggu
Fase 2 (Buyer Experience):   3–4 minggu  
Fase 3 (Seller Power):       3–4 minggu
Fase 4 (Growth Engine):      4–6 minggu
Fase 5 (Scale):              Ongoing
─────────────────────────────────────
Total MVP → v1.0:            ~12–16 minggu
```

### 10.2 Recommended Prioritas Sprint
**Sprint 1 (Minggu 1–2): Security + Legal**
- SEC-001, SEC-002, SEC-003
- Legal pages (3 halaman)
- Forgot password
- Fix footer links

**Sprint 2 (Minggu 3–4): SEO + Discovery**
- Dynamic meta tags
- Sitemap & robots
- Search & filter katalog
- Seller public profile

**Sprint 3 (Minggu 5–6): Seller UX**
- Product edit/delete
- Seller notifications (email + in-app)
- Multi-file upload

**Sprint 4 (Minggu 7–8): Growth**
- Affiliate dashboard
- Coupon system
- Welcome & transactional emails

---

## 11. Appendix: API Endpoint Inventory

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/api/auth/register` | POST | Public | ✅ |
| `/api/auth/login` | POST | Public | ✅ |
| `/api/auth/logout` | POST | Public | ✅ |
| `/api/products` | POST | Seller | ✅ |
| `/api/products/[id]` | GET | Public | ✅ |
| `/api/checkout` | POST | Buyer | ✅ |
| `/api/download` | GET | Token/User | ✅ |
| `/api/library` | GET | Buyer | ✅ |
| `/api/reviews` | POST | Buyer | ✅ |
| `/api/upload/direct` | POST | Auth | ✅ |
| `/api/upload/presigned` | POST | Auth | ✅ |
| `/api/admin/products` | GET | Admin | ✅ |
| `/api/admin/products/[id]` | PATCH | Admin | ✅ |
| `/api/admin/withdrawals` | GET/PATCH | Admin | ✅ |
| `/api/admin/affiliate-withdrawals` | GET/PATCH | Admin | ✅ |
| `/api/seller/profile` | POST | Seller | ✅ |
| `/api/seller/withdrawals` | POST | Seller | ✅ |
| `/api/landingpages` | POST/DELETE | Seller | ✅ |
| `/api/landingpages/generate` | POST | Seller | ✅ |
| `/api/webhooks/mayar` | POST | Public | ✅ |

**Missing endpoints untuk Fase 2–4:**
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/products` (search/filter/pagination)
- `POST/DELETE /api/favorites`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/coupons/validate`
- `GET /api/seller/analytics`
- `GET /api/affiliate/stats`

---

*Disusun oleh: Kimi Code CLI*  
*Tanggal analisis: 2026-06-04*  
*Versi codebase: Astro 6.4.3 + Drizzle ORM 0.45.2 + Tailwind 4.3.0*
