# 🛒 Prodig.id — Marketplace Produk Digital Indonesia

> **"Shopee-nya produk digital"** — Jual & beli e-book, template, course, preset, font, dan produk digital lainnya dengan aman, instan, dan terpercaya.

---

## ⚠️ PERHATIAN: Dokumentasi Ini Sudah Diperbarui (Juni 2026)

Dokumentasi sebelumnya (README lama, AGENTS.md lama, PRD di `docs/`) menyebutkan **Next.js 14 + Prisma + PostgreSQL + Vercel**. Itu **SUDAH USANG** — merupakan artefak dari iterasi awal project.

**Stack aktual** yang berjalan di production: **Astro 6 + Cloudflare Workers + D1 (SQLite) + Drizzle ORM + R2**. Dokumentasi di bawah ini adalah single source of truth yang sudah disinkronkan dengan kode aktual.

---

## ✨ Tentang Prodig.id

**Prodig.id** adalah marketplace produk digital lokal yang mempertemukan kreator Indonesia dengan pembeli. Platform ini dirancang khusus untuk kreator yang ingin monetisasi skill-nya dalam hitungan menit, dan pembeli yang mencari produk digital berkualitas dengan proses checkout yang aman.

### Problem yang Diselesaikan
- Kreator masih jual produk digital via Instagram/WA — _messy_, tidak ada discovery
- Pembeli sulit cari, bandingkan, dan beli dengan aman
- Tidak ada sistem review & trust untuk produk digital lokal

### Solusi
- Marketplace curated dengan **instant file delivery**
- **Review verified buyer** — hanya yang sudah beli bisa kasih rating
- **Payment gateway lokal** (Mayar.id) — support QRIS, VA, e-wallet
- **Seller dashboard** dengan statistik penjualan & withdrawal
- **Landing Page Builder** per produk (AI-assisted) — seller bisa punya halaman jualan profesional
- **Watermark PDF otomatis** — file PDF di-watermark dengan email buyer + ID transaksi
- **Sistem Affiliate** — referral dengan komisi 20%

---

## 🚀 Fitur MVP (Fase 1) — Feature Complete

| Fitur | Status | Deskripsi |
|---|---|---|
| 🔐 Auth System | ✅ | Register/login dengan email & password, role-based (Buyer/Seller/Admin), custom session 30 hari |
| 📦 Product Upload | ✅ | Upload file (max 500MB), thumbnail, deskripsi, kategori, harga |
| 🔍 Search & Discovery | ✅ | Keyword search, filter kategori, sorting (terbaru/terlaris/termurah) |
| 💳 Checkout & Payment | ✅ | Integrasi Mayar.id (QRIS, VA, e-wallet) + PPN 11% auto |
| 📥 Instant Delivery | ✅ | File delivery otomatis via download token + Library permanen |
| ⭐ Review System | ✅ | Rating 1-5 + komentar, verified buyer only |
| 📊 Seller Dashboard | ✅ | Statistik penjualan, manajemen produk, request withdrawal, LP builder |
| 🛡️ Admin Panel | ✅ | Moderasi produk (approve/reject), kelola penarikan dana, affiliate withdrawals |
| 📧 Email Notifikasi | ✅ | Email pembelian berhasil dengan link download via Resend |
| ☁️ File Storage | ✅ | Cloudflare R2 — upload langsung via Workers binding + presigned URL |
| 📱 WhatsApp Notif | ✅ | Notifikasi WA ke buyer, seller, affiliate via Conviq/Chatwoot |
| 🎯 Affiliate System | ✅ | Schema & API ready, tracking referral, commission 20% |
| 🎨 LP Builder | ✅ | AI-powered landing page per produk (Cloudflare Workers AI) |
| 🖊️ PDF Watermark | ✅ | Watermark otomatis email + trx ID di setiap halaman PDF |

---

## 🏗️ Tech Stack (Real / Aktual)

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
| **Payment** | Mayar.id | Invoice API + Webhook callback |
| **Email** | Resend | Transactional email |
| **WhatsApp** | Conviq/Chatwoot | WA notifikasi otomatis |
| **AI** | Cloudflare Workers AI | `@cf/meta/llama-3.1-8b-instruct` untuk LP copy generation |
| **Hosting** | Cloudflare Pages | Auto-deploy dari branch |

### Beda dengan Dokumentasi Lama
- ❌ Bukan Next.js App Router → ✅ Astro 6
- ❌ Bukan Prisma + PostgreSQL → ✅ Drizzle + Cloudflare D1 (SQLite)
- ❌ Bukan NextAuth v5 → ✅ Custom session cookie
- ❌ Bukan Vercel → ✅ Cloudflare Workers + Pages
- ❌ Upload via presigned URL client-side → ✅ Direct server upload via R2 binding + presigned fallback

---

## ⚡ Quick Start

### Prerequisites
- Node.js 22.12+
- Cloudflare account (D1 + R2 buckets)
- Mayar.id API key (dev/test)
- Resend API key
- Conviq/Chatwoot account (opsional, untuk WA notif)

### 1. Clone & Install

```bash
git clone https://github.com/ridloabelian/prodig.git
cd prodig
npm install
```

### 2. Environment Variables

Semua secret disimpan via **Wrangler Secrets** (bukan di file `.env` atau `wrangler.jsonc`!):

```bash
wrangler secret put MAYAR_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put CONVIQ_API_KEY
# dll — lihat AGENTS.md untuk daftar lengkap
```

### 3. Database Setup

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration ke D1 local
npx wrangler d1 migrations apply prodig-db --local

# (Production) Apply ke D1 remote
npx wrangler d1 migrations apply prodig-db --remote
```

### 4. Run Development Server

```bash
npm run dev
```

Astro dev server akan berjalan. Untuk test dengan Cloudflare bindings (D1, R2):
```bash
npx wrangler dev
```

---

## 📁 Project Structure

```
prodig/
├── src/
│   ├── pages/              # Astro pages (SSR via Cloudflare Workers)
│   │   ├── api/            # API routes (server-side)
│   │   │   ├── auth/       # Login, register, logout
│   │   │   ├── products/   # CRUD produk
│   │   │   ├── checkout/   # Mayar.id checkout
│   │   │   ├── webhooks/   # Mayar webhook handler
│   │   │   ├── download/   # File delivery
│   │   │   ├── library/    # Buyer library
│   │   │   ├── reviews/    # Review system
│   │   │   ├── seller/     # Dashboard APIs
│   │   │   ├── admin/      # Admin APIs
│   │   │   ├── upload/     # Direct upload + presigned
│   │   │   ├── landingpages/ # LP builder API
│   │   │   └── affiliate/  # Affiliate APIs
│   │   ├── index.astro     # Homepage
│   │   ├── products/       # Browse & detail
│   │   ├── sell.astro      # Seller upload form
│   │   ├── dashboard/      # Seller dashboard
│   │   ├── library.astro   # Buyer library
│   │   ├── admin.astro     # Admin panel
│   │   ├── checkout/       # Success page
│   │   └── lp/             # Public landing pages
│   ├── db/
│   │   ├── schema.ts       # Drizzle schema (12 tabel)
│   │   └── index.ts        # Drizzle client singleton
│   ├── lib/
│   │   ├── auth.ts         # Session management
│   │   ├── r2.ts           # R2 S3 client + presigned helpers
│   │   ├── mayar.ts        # Mayar.id API client
│   │   ├── email.ts        # Resend email helper
│   │   ├── conviq.ts       # WhatsApp notif helper
│   │   └── utils.ts        # Helper functions
│   ├── middleware.ts       # Role-based route protection
│   └── styles/
│       └── global.css      # Tailwind 4 + custom CSS
├── drizzle/
│   └── migrations/         # D1 migration files
├── public/                 # Static assets
├── scripts/                # Utility scripts (patch-aws-sdk.js)
├── wrangler.jsonc          # Cloudflare Workers config (NO secrets here!)
├── astro.config.mjs        # Astro config
├── drizzle.config.ts       # Drizzle config
├── package.json
└── README.md               # This file
```

---

## 🔄 Core User Flows

### Buyer Journey
```
Landing Page → Search/Browse → Product Detail → Checkout (Mayar.id)
→ Payment Success → Email/WA Notif → Library / Download
```

### Seller Journey
```
Register → Upload Product → Pending Review → Admin Approved → Sales
→ Dashboard Stats → Withdrawal Request → Admin Processed
```

### Affiliate Journey
```
Register → Dapat Kode Referral → Promosikan Link → Buyer Checkout via Link
→ Commission 20% masuk ke balance → Request Withdrawal
```

### Admin Journey
```
Login → Moderation Queue (Approve/Reject Products)
→ Manage Withdrawals (Seller + Affiliate)
→ Monitor Transactions
```

---

## 💰 Business Model

| Sumber | Detail |
|---|---|
| **Platform Fee** | 10% per transaksi (dari subtotal, sebelum PPN) |
| **PPN** | 11% — ditambahkan ke checkout, dibayar buyer |
| **Affiliate Commission** | 20% dari subtotal (dibayar platform, bukan dari seller) |
| **Net Seller** | subtotal - 10% platform fee |
| **Featured Listing** | Coming soon (Fase 2) |
| **Premium Seller** | Coming soon (Fase 2) |

---

## 🔴 Kritis: Security & Production Readiness

**WAJIB DISELESAIKAN sebelum launch/marketing:**

| Issue | Severity | Status | Action |
|---|---|---|---|
| Webhook Mayar signature verification | 🔴 P0 | ❌ Belum | Verifikasi HMAC/signature sebelum proses transaksi |
| R2/API credentials di wrangler.jsonc | 🔴 P0 | ⚠️ Partial | Pindah ke Wrangler Secrets, rotasi key yang bocor |
| Legal pages (Syarat, Privasi, Kontak) | 🔴 P0 | ❌ Belum | Wajib untuk payment gateway compliance |
| Rate limiting API (login, register) | 🟡 P1 | ❌ Belum | Cegah brute-force |
| Test coverage | 🟡 P1 | ❌ Belum | Minimal test untuk checkout, webhook, download |
| CI/CD (GitHub Actions) | 🟡 P1 | ❌ Belum | Lint → typecheck → build → deploy |

**Detail lengkap:** lihat `insight-claude.md` dan `insight-codex.md` di root repo.

---

## 🗺️ Roadmap

### Fase 0 — Production Hardening (1-2 minggu)
- [ ] Verifikasi signature webhook Mayar
- [ ] Pindah semua secret ke Wrangler Secrets
- [ ] Buat halaman legal: `/syarat-ketentuan`, `/kebijakan-privasi`, `/kontak`
- [ ] Rate limit API (login, register, checkout)
- [ ] Fix `const env = env` bug di webhook & download
- [ ] Fix authorization `trx_id` di `/api/library`
- [ ] Fix perhitungan withdrawal (pending ikut mengurangi balance)
- [ ] Test end-to-end: checkout → webhook → email → download

### Fase 1 — Quality Baseline (1-2 minggu)
- [ ] Setup Vitest + `@cloudflare/vitest-pool-workers`
- [ ] Test: webhook, checkout, download, auth, withdrawal
- [ ] Setup GitHub Actions: lint → typecheck → test → build
- [ ] Tambah Biome/ESLint untuk format & lint
- [ ] Structured logging + error tracking

### Fase 2 — Growth & Seller Power (3-4 minggu)
- [ ] Affiliate dashboard UI (code & link generator, stats, withdrawal)
- [ ] Seller product edit/delete (PENDING only, atau metadata only jika sudah ada sales)
- [ ] Seller public storefront (`/seller/[slug]`)
- [ ] Dynamic SEO meta tags (Open Graph, Twitter Card, JSON-LD)
- [ ] Sitemap + robots.txt
- [ ] Search & filter katalog (full-text atau FTS5)
- [ ] Coupon/voucher system
- [ ] Related products
- [ ] Welcome & transactional emails (register, approve, reject, sale, withdrawal)

### Fase 3 — Scale & Automation (Ongoing)
- [ ] Cloudflare Queues untuk background jobs (watermark, email, WA)
- [ ] Cloudflare Images untuk thumbnail optimization
- [ ] Video streaming (Cloudflare Stream) untuk course
- [ ] Analytics dashboard (GMV, conversion, retention)
- [ ] Auto-payout (Mayar Payouts API)
- [ ] PWA / mobile app

---

## 📝 License

ISC

---

**Made with ❤️ in Indonesia** — Dukung kreator lokal! 🇮🇩

---

*Last updated: 2026-06-11 (synced with actual codebase)*
