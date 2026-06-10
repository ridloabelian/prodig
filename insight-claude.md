# 🧭 Insight & Master Plan — Prodig.id

> Analisis kondisi proyek per **2026-06-04** dan rekomendasi roadmap ke depan.
> Disusun oleh Claude setelah membaca kode aktual (bukan dokumentasi).

---

## 1. Ringkasan Eksekutif

**Prodig.id** adalah marketplace produk digital Indonesia ("Shopee-nya produk digital"). Secara fungsional, MVP sudah **feature-complete**: auth, upload, checkout, delivery, review, dashboard seller, admin panel, afiliasi, AI landing page builder, notifikasi WA, dan watermark PDF semuanya sudah ada di kode.

Namun ada **kesenjangan serius antara dokumentasi dan realita kode**, beberapa **lubang keamanan kritis**, dan **nol test coverage**. Sebelum scaling/marketing, prioritas utama adalah *hardening* keamanan & pembayaran, lalu membersihkan utang teknis.

**Status jujur:** Bukan "siap produksi penuh", tapi "MVP jalan dengan risiko keamanan finansial yang harus ditutup dulu."

---

## 2. Realita Tech Stack (PENTING — dokumentasi salah)

Dokumentasi (`README.md`, `AGENTS.md`) menyebut **Next.js 14/16 + Prisma + PostgreSQL + Vercel + NextAuth**. **Ini SALAH.** Kode aktual:

| Layer | Dokumentasi (USANG) | Realita Kode |
|---|---|---|
| Framework | Next.js 14/16 App Router | **Astro 6** (`astro.config.mjs`) |
| Hosting | Vercel | **Cloudflare Workers** (`@astrojs/cloudflare`) |
| Database | PostgreSQL (Neon/Supabase) | **Cloudflare D1 (SQLite)** |
| ORM | Prisma 5 | **Drizzle ORM** (`src/db/schema.ts`) |
| Auth | NextAuth v4/v5 | **Custom cookie-session** (`src/lib/auth.ts` + `src/middleware.ts`) |
| Storage | Cloudflare R2 | ✅ Benar (R2 + S3 SDK + presigned) |
| Payment | Mayar.id | ✅ Benar (`src/lib/mayar.ts`) |
| Email | Resend | ✅ Benar (`src/lib/email.ts`) |
| AI Builder | — | **Cloudflare Workers AI** (`@cf/meta/llama-3.1-8b-instruct`) + fallback rule-based |
| WA Notif | — | **Conviq/Chatwoot** (`src/lib/conviq.ts`) |

> ⚠️ **Aksi #1 paling murah & berdampak:** perbarui `README.md` dan `AGENTS.md` agar mencerminkan stack Astro/Cloudflare. Dokumentasi yang salah akan menyesatkan setiap kontributor/AI yang masuk ke repo ini.

---

## 3. Apa yang Sudah Ada (Inventory Kode)

**12 tabel D1** (`src/db/schema.ts`): users, sessions, categories, products, affiliates, transactions, reviews, withdrawals, affiliate_withdrawals, download_logs, webhook_logs, landing_pages.

**Halaman:** index, login, register, products (list + detail), sell, dashboard, dashboard/landingpages/builder, library, admin, checkout/success, lp/[slug] (public landing page).

**API routes:** auth (login/register/logout), products, checkout, download, library, reviews, landingpages (+ AI generate), upload (presigned + direct), seller (profile/withdrawals), admin (products, withdrawals, affiliate-withdrawals), webhooks/mayar.

**Fitur menonjol yang sudah jadi:**
- Session 30 hari dengan auto-renewal (<15 hari sisa)
- Role-based middleware (BUYER/SELLER/ADMIN)
- Upload langsung ke R2 via server binding (commit `45c6af5` memperbaiki masalah koneksi)
- Webhook idempotency via `webhook_logs.processed`
- Rate limit download (3×/24 jam) + akses permanen via Library
- PPN 11% + komisi platform 10% + komisi afiliasi 20%
- Watermark PDF otomatis (email buyer + trx ID) pasca-pembayaran
- AI landing page builder dengan fallback rule-based yang solid

---

## 4. 🔴 Temuan Kritis (Wajib Ditangani Lebih Dulu)

### 4.1 Webhook Mayar TIDAK memverifikasi signature — RISIKO FRAUD
`src/pages/api/webhooks/mayar.ts` tidak melakukan pengecekan HMAC/secret sama sekali (grep `secret|signature|hmac` → kosong). `MAYAR_WEBHOOK_SECRET` ada di dokumentasi tapi **tidak pernah dipakai**.
**Dampak:** Siapa pun yang tahu URL webhook bisa POST payload palsu untuk menandai transaksi `PAID`, memicu pengiriman produk + watermark + notifikasi tanpa benar-benar membayar. **Ini kebocoran uang langsung.**
**Aksi:** Verifikasi signature Mayar (cek dokumentasi Mayar untuk header & algoritma), tolak request yang gagal verifikasi sebelum memproses apa pun.

### 4.2 Kredensial R2 plaintext di `wrangler.jsonc` (ter-commit ke git)
`R2_ACCESS_KEY_ID` dan `R2_ACCOUNT_ID` ada di `vars` (plaintext, masuk git history).
**Aksi:** Pindahkan semua kredensial ke **Wrangler Secrets** (`wrangler secret put`), rotasi key R2 yang sudah bocor, dan hapus dari `vars`. Cek juga `MAYAR_API_KEY`, `RESEND_API_KEY`, `CONVIQ_API_KEY` — semua harus secret, bukan var.

### 4.3 Verifikasi enforcement token download
Schema punya `tokenExpiresAt` dan kode download mengecek expiry, tapi `AGENTS.md` mencatat "enforcement should be verified". Pastikan token benar-benar di-set saat webhook & expiry konsisten.

### 4.4 Nol test coverage
Tidak ada satu pun test di repo. Untuk platform yang memegang uang, ini berisiko tinggi setiap kali refactor.

---

## 5. 🧹 Utang Teknis & Kebersihan Repo

- **`Prodig-handoff.zip` (2.8 MB)** dan **`backup-nextjs/`** ada di working tree — hapus / pindah keluar repo (tambah ke `.gitignore`).
- **`test-r2.ts`** di root — script ad-hoc, pindahkan ke `scripts/` atau hapus.
- **Dokumentasi ganda & tidak sinkron:** `README.md`, `AGENTS.md`, `docs/*` (3 PRD berbeda termasuk versi KimiCode 34KB). Konsolidasikan jadi satu sumber kebenaran.
- **Tidak ada CI/CD** — tidak ada GitHub Actions untuk lint/build/deploy.
- **Tidak ada linter/formatter** terkonfigurasi (tidak ada eslint/prettier/biome di `package.json`).

---

## 6. 🗺️ Master Plan — Roadmap Bertahap

### FASE 0 — Hardening (1–2 minggu) — *BLOKIR sebelum marketing*
1. ✅ Verifikasi signature webhook Mayar (4.1)
2. ✅ Migrasi semua kredensial ke Secrets + rotasi R2 key (4.2)
3. ✅ Perbaiki & sinkronkan dokumentasi (`README`, `AGENTS.md`) ke stack Astro/Cloudflare (§2)
4. ✅ Bersihkan repo: hapus zip, backup-nextjs, test-r2 (§5)
5. ✅ Audit semua endpoint API untuk authz (pastikan tiap route cek `locals.user` & role)
6. ✅ Tambah rate limiting pada login/register (cegah brute-force & spam akun)

### FASE 1 — Fondasi Kualitas (2–3 minggu)
1. Setup test: Vitest + `@cloudflare/vitest-pool-workers` untuk D1/R2 binding
   - Test prioritas: webhook (idempotency + signature), checkout (kalkulasi PPN/komisi), download (rate limit + authz), auth (session lifecycle)
2. GitHub Actions: lint → typecheck (`astro check`) → build → deploy preview
3. Tambah Biome (lint + format) — cepat & cocok untuk edge
4. Error monitoring: aktifkan Workers observability + Sentry/log terstruktur
5. Validasi input konsisten dengan Zod di semua API (sebagian sudah pakai)

### FASE 2 — Pertumbuhan Produk (3–6 minggu)
1. **Search & discovery yang lebih baik:** saat ini keyword sederhana. Pertimbangkan full-text search D1 (FTS5) atau Cloudflare Vectorize untuk pencarian semantik produk
2. **Halaman & pengelolaan kategori** yang proper (schema sudah ada, UI minim)
3. **Sistem afiliasi end-to-end:** verifikasi atribusi referral (cookie/param `?ref=`), dashboard afiliasi, halaman `/affiliate` (middleware sudah melindungi path-nya tapi cek apakah halamannya ada)
4. **UI info bank seller:** `bankAccount`/`bankName` ada di schema tapi belum ada UI (dicatat di AGENTS.md)
5. **Withdrawal flow** yang lebih mulus (saat ini manual via admin)
6. **Watermark non-PDF:** saat ini hanya PDF. Pertimbangkan watermark gambar/preview untuk tipe lain
7. **Wishlist / keranjang** & multi-item checkout (saat ini 1 produk per transaksi)

### FASE 3 — Skala & Monetisasi (6+ minggu)
1. **Analytics seller:** grafik penjualan, konversi, sumber traffic landing page
2. **AI Builder upgrade:** model lebih bagus, lebih banyak tema, A/B testing landing page, custom domain per LP
3. **Sistem kupon/diskon & flash sale**
4. **Email marketing & re-engagement** (cart abandonment, produk baru dari seller yang diikuti)
5. **Program seller terverifikasi / badge trust**
6. **Mobile-first PWA atau app**
7. **Multi-payment gateway** (backup selain Mayar) untuk reliabilitas

---

## 7. Rekomendasi Prioritas (TL;DR)

| Prioritas | Item | Alasan |
|---|---|---|
| 🔴 P0 | Verifikasi signature webhook Mayar | Mencegah fraud pembayaran |
| 🔴 P0 | Rotasi & amankan kredensial R2/API | Kredensial bocor di git |
| 🟠 P1 | Sinkronkan dokumentasi ke stack nyata | Mencegah kebingungan kontributor |
| 🟠 P1 | Test untuk alur uang (webhook/checkout/download) | Cegah regresi finansial |
| 🟡 P2 | CI/CD + linter | Kualitas berkelanjutan |
| 🟢 P3 | Search, kategori, afiliasi end-to-end | Pertumbuhan |

**Filosofi:** Ini platform yang memegang uang orang. Tutup lubang keamanan finansial dulu (Fase 0), bangun jaring pengaman kualitas (Fase 1), baru kejar fitur pertumbuhan (Fase 2–3). Jangan marketing besar-besaran sebelum Fase 0 selesai.

---
*Dihasilkan oleh Claude — berdasarkan pembacaan kode aktual, bukan dokumentasi.*
