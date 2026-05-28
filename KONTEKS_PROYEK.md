# RINGKASAN KONTEKS PROYEK

## 1. Identitas Proyek

**Prodig.id** — Marketplace produk digital Indonesia ("Shopee-nya produk digital"). Platform untuk kreator menjual dan pembeli membeli produk digital (e-book, template, course, preset, font) dengan pengiriman instan, review, dan pembayaran aman.

**Masalah Inti**: Kreator saat ini menjual via Instagram/WhatsApp (berantakan, tidak ada discovery); pembeli kesulitan mencari, membandingkan, dan membeli dengan aman. Tidak ada sistem kepercayaan/review untuk produk digital lokal.

**Tech Stack**:
- **Framework**: Next.js 14 (App Router)
- **Bahasa**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Auth.js (NextAuth v4) + Prisma Adapter dengan credentials provider
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Penyimpanan File**: Cloudflare R2 (S3-compatible) dengan presigned URL
- **Payment Gateway**: Mayar.id (QRIS, VA, e-wallet) dengan integrasi webhook
- **Email**: Resend
- **Hosting Target**: Vercel

---

## 2. Gambaran Arsitektur

### Struktur Folder (2-3 level):
```
prodig/
├── app/
│   ├── (main)/          # Landing, browse, halaman detail produk
│   ├── api/             # REST API routes (13 folder route)
│   │   ├── auth/        # NextAuth signin/signout
│   │   ├── checkout/    # Buat invoice Mayar
│   │   ├── products/    # CRUD produk
│   │   ├── categories/  # List kategori
│   │   ├── reviews/     # Kelola review
│   │   ├── download/    # Download dengan validasi token
│   │   ├── library/     # Pembelian pengguna
│   │   ├── admin/       # Approve/reject produk, penarikan
│   │   ├── seller/      # Statistik dashboard seller & penarikan
│   │   ├── upload/      # Presigned URL untuk R2
│   │   └── webhooks/mayar/ # Pemrosesan webhook pembayaran
│   ├── admin/           # UI moderasi admin
│   ├── checkout/success/# Landing pembayaran berhasil
│   ├── dashboard/       # Statistik seller & manajemen produk
│   ├── library/         # Produk yang dibeli pembeli
│   ├── login/register/  # Halaman auth
│   └── sell/            # Form upload seller
├── components/          # React components (1136 baris di 15+ file)
│   ├── auth/            # Form login/register
│   ├── products/        # Grid produk, card, search, filter
│   ├── dashboard/       # Statistik, tabel produk, UI penarikan
│   ├── reviews/         # Form & list review
│   ├── upload/          # Uploader file & form produk
│   ├── ui/              # shadcn/ui (button, input, card, dll)
│   └── navbar.tsx, auth-provider.tsx
├── lib/
│   ├── auth.ts          # Konfigurasi NextAuth (Credentials provider)
│   ├── prisma.ts        # Singleton Prisma
│   ├── r2.ts            # R2 S3 client (presigned URL)
│   ├── mayar.ts         # Klien API Mayar (buat invoice)
│   ├── email.ts         # Helper email Resend
│   └── utils.ts         # Fungsi helper
├── prisma/
│   ├── schema.prisma    # 12 model (User, Product, Transaction, dll)
│   └── seed.ts          # Seed kategori + demo user/produk
├── types/
│   ├── index.ts         # Interface ProductWithRelations
│   ├── next-auth.d.ts   # Augmentasi tipe NextAuth
│   └── css.d.ts         # Tipe modul CSS
├── middleware.ts        # Proteksi route berbasis role (seller/admin/buyer)
└── docs/                # Dokumen PRD (bahasa ID)
```

### Alur Data:
1. **Auth**: User mendaftar/login via credentials → disimpan di DB dengan bcryptjs hashing → token session JWT via NextAuth
2. **Upload Produk**: Seller → dapatkan presigned R2 URL → upload file → buat produk (status PENDING)
3. **Persetujuan Admin**: Admin review produk → approve/reject → status berubah ke APPROVED/REJECTED
4. **Browse Pembeli**: Cari/filter produk yang disetujui → lihat detail + review → checkout
5. **Checkout → Pembayaran**: Buat invoice Mayar → pembeli redirect ke Mayar → callback pembayaran via webhook
6. **Pemrosesan Webhook**: Mayar kirim status pembayaran → webhook update transaksi → kirim email + buat download token
7. **Download**: Pembeli dapatkan presigned R2 download URL (3x/24jam rate limit) → akses library permanen

---

## 3. Status Saat Ini

### ✅ Selesai (MVP Feature-Complete):
- Sistem autentikasi (register/login dengan email & password, role-based: BUYER/SELLER/ADMIN)
- Upload produk dengan penyimpanan file di R2, thumbnail, deskripsi, kategori, harga
- Pencarian & discovery (pencarian keyword, filter kategori, sorting by baru/populer/harga)
- Checkout dengan integrasi Mayar.id (QRIS, VA, e-wallet)
- Pengiriman file instan via download token + akses library permanen
- Sistem review (rating 1-5 + komentar, verified buyer only)
- Dashboard seller (statistik penjualan, manajemen produk, permintaan penarikan)
- Panel admin (moderasi produk, pemrosesan penarikan)
- Notifikasi email via Resend (konfirmasi pembelian dengan link download)
- Penyimpanan file dengan Cloudflare R2 presigned URL
- Integrasi webhook untuk update status pembayaran
- Database migration & seeding (dengan demo user: seller@prodig.id, buyer@prodig.id, password123)

### ⚠️ Sebagian/Sedang Dikerjakan:
- Tidak ada yang teridentifikasi — semua fitur MVP tampak sudah diimplementasikan

### 🐛 Masalah yang Diketahui / Fitur Rusak:
- Tidak ada yang ditemukan di komentar TODO/FIXME
- Semua kode build dengan sukses (tidak ada error tipe yang terlihat)

### ❌ Belum Diimplementasikan (Roadmap Phase 1.5+):
- Watermark PDF otomatis dengan email pembeli
- Notifikasi WhatsApp (Twilio/Wabot)
- Perhitungan PPN 11% otomatis
- Sistem affiliate & referral
- Produk subscription/membership
- Full-text search (Algolia/pg_trgm)
- Rekomendasi AI
- Mobile PWA

---

## 4. File-File Kunci

1. **prisma/schema.prisma** — Model data lengkap (User, Product, Transaction, Review, Withdrawal, DownloadLog, WebhookLog + model Auth.js)
2. **lib/auth.ts** — Konfigurasi NextAuth credentials provider dengan callback JWT & session
3. **app/api/checkout/route.ts** — Membuat invoice pembayaran Mayar atas permintaan user
4. **app/api/webhooks/mayar/route.ts** — Menangani update status pembayaran, kirim email sukses, buat download token (idempotency-safe)
5. **lib/r2.ts** — Klien R2 S3 dengan generasi presigned upload/download URL
6. **app/api/products/route.ts** — CRUD produk dengan validasi (seller bisa membuat, status default PENDING)
7. **middleware.ts** — Proteksi route berbasis role (sell/dashboard → SELLER+ADMIN, admin → ADMIN only, library → semua auth)
8. **app/admin/page.tsx** — UI moderasi admin (approve/reject produk, kelola penarikan)
9. **app/dashboard/page.tsx** — Dashboard seller (statistik penjualan, permintaan penarikan)
10. **components/products/product-grid.tsx** — Interface browse/cari produk yang disetujui

---

## 5. Dependensi & Konfigurasi

### Dependensi Utama:
- `next@16.2.6` — Framework
- `react@18.3.1`, `react-dom@18.3.1` — Library UI
- `typescript@6.0.3` — Type checking
- `@prisma/client@5.22.0` — ORM
- `next-auth@4.24.14`, `@next-auth/prisma-adapter@1.0.7` — Auth
- `@aws-sdk/client-s3@3.1054.0`, `@aws-sdk/s3-request-presigner@3.1054.0` — Integrasi R2
- `resend@6.12.4` — Layanan email
- `zod@4.4.3` — Validasi schema
- `react-hook-form@7.76.1`, `@hookform/resolvers@5.4.0` — Form
- `bcryptjs@3.0.3` — Hashing password
- `tailwindcss@3.4.19`, `class-variance-authority@0.7.1` — Styling
- `lucide-react@1.16.0` — Icons
- `date-fns@4.3.0` — Utilitas tanggal

### Variabel Environment yang Diperlukan:
```
NEXT_PUBLIC_APP_URL              # Base URL aplikasi (untuk redirect)
PLATFORM_FEE_PERCENT             # Komisi % (saat ini 10%)
DATABASE_URL                     # String koneksi PostgreSQL
DIRECT_URL                       # Direct DB URL (untuk Neon)
NEXTAUTH_URL                     # Auth callback URL
NEXTAUTH_SECRET                  # Secret signing JWT
R2_ACCOUNT_ID                    # ID akun Cloudflare
R2_ACCESS_KEY_ID                 # Kredensial API R2
R2_SECRET_ACCESS_KEY             # Secret R2
R2_BUCKET_NAME                   # Nama bucket R2 (e.g., "prodig-files")
MAYAR_API_KEY                    # API key Mayar.id
MAYAR_API_URL                    # Base URL Mayar (default https://api.mayar.id)
MAYAR_WEBHOOK_SECRET             # Optional webhook verification
RESEND_API_KEY                   # API key email Resend
EMAIL_FROM                       # Email pengirim (e.g., noreply@prodig.id)
```

### Layanan Eksternal:
- Mayar.id (payment gateway) — webhook di `/api/webhooks/mayar`
- Cloudflare R2 (file storage) — API S3-compatible
- Resend (transactional email) — dipicu saat pembelian sukses
- Neon PostgreSQL (database)

---

## 6. Perubahan Terakhir

7 commit terbaru (terbaru lebih dulu):
1. **e5510bf** — "chore: add production integrations (Mayar, R2, Resend)" — Finalisasi setup 3rd-party service
2. **1f1451b** — "chore: switch database to Neon PostgreSQL" — Migrasi provider DB
3. **b4ea311** — "fix: lazy init for Resend and R2 clients to avoid build crashes when env vars missing" — Fix build
4. **5bbac70** — "chore: enhance seed script with demo users and 8 dummy products" — Setup test data
5. **3ff0d28** — "fix: resolve all npm audit vulnerabilities" — Fix audit keamanan
6. **5b1d65a** — "docs: add comprehensive README with about, features, and setup guide" — Dokumentasi
7. **eba7fe0** — "Initial commit: Prodig.id marketplace produk digital MVP" — Inisialisasi proyek

---

## 7. Pertanyaan Terbuka / Ambiguitas

1. **Download Rate Limit**: Kode mereferensikan limit 3x/24jam per token, tapi tidak jelas apakah enforce di API atau hanya documented (cek `app/api/download/route.ts` untuk implementasi)

2. **Payment Webhook Secret**: `MAYAR_WEBHOOK_SECRET` listing di README tapi tidak jelas apakah validasi benar-benar diimplementasikan di webhook handler (cek `app/api/webhooks/mayar/route.ts`)

3. **Email Template**: `sendPurchaseSuccessEmail()` dipanggil tapi konten/template tidak terlihat — verifikasi template Resend ada dan sesuai requirement bisnis

4. **Admin Role**: Middleware allow ADMIN akses seller route (`/sell`, `/dashboard`) — konfirmasi apakah ini intentional (admin bisa test seller flow?) atau bug

5. **Transaction Expiry**: Schema punya field `tokenExpiresAt` tapi tidak ada enforce expiry yang jelas terlihat — cek apakah download di luar expiry token benar-benar diblok

6. **Withdrawal Processing**: Schema allow status withdrawal PENDING/PROCESSED/REJECTED, tapi flow admin menunjukkan UI untuk approval manual — klarifikasi apakah ini benar-benar manual atau ada automation terjadwal

7. **Idempotency**: Webhook handler cek `existingLog.processed` tapi tidak jelas apa yang prevent duplicate transaction update jika webhook fire dua kali — verifikasi full idempotency

8. **Presigned URL Expiry**: Presigned URL R2 default 5 menit — konfirmasi apakah cukup untuk typical file download, terutama file besar

9. **Missing Constraints**: Tidak ada unique constraint pada `(userId, transactionId)` untuk review — potensial multiple review per pembelian? (schema punya `@unique` pada `transactionId` jadi tampak aman)

10. **Bank Info Seller**: Field `bankAccount`, `bankName` di model User ada tapi tidak ada UI terlihat untuk seller input ini sebelum permintaan penarikan — cek apakah ini incomplete

11. **File Size Limit**: Form upload kemungkinan punya limit 500MB (mentioned di README) tapi tidak ada validasi explicit di API schema (schema punya field `fileSize` tapi tidak ada range check `@db.Int`)

---

## Ringkasan

**Prodig.id adalah MVP feature-complete** untuk marketplace produk digital. Arsitektur bersih (Next.js 14 dengan API route + Prisma). Semua alur utama (auth → upload → approval → checkout → pembayaran → delivery) sudah diimplementasikan dan terintegrasi dengan production service. Codebase tampak stabil dengan 7 commit yang establish fondasi solid. Siap untuk testing/launch atau enhancement minor (fitur Phase 1.5 seperti watermark PDF, notifikasi WhatsApp).

---

**Informasi Tambahan**:

### Perintah Penting:
```bash
# Development
npm run dev              # Jalankan dev server
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:seed         # Seed data
npm run db:studio       # Buka Prisma Studio

# Build & Production
npm run build           # Build untuk production
npm start               # Jalankan production server
npm run lint            # Run linter
```

### Demo Login Credentials:
```
Seller:
Email: seller@prodig.id
Password: password123

Buyer:
Email: buyer@prodig.id
Password: password123
```

### Model Database (Prisma):
- **User** — Akun dengan role (BUYER/SELLER/ADMIN)
- **Product** — Produk digital dengan status (PENDING/APPROVED/REJECTED/HIDDEN)
- **Transaction** — Pembelian dengan status (PENDING/PAID/FAILED/EXPIRED/REFUNDED)
- **Review** — Rating & komentar dari pembeli terverifikasi
- **Withdrawal** — Permintaan penarikan dana seller
- **Category** — Kategori produk
- **DownloadLog** — Log akses download untuk audit
- **WebhookLog** — Log webhook dari payment gateway
- **Account, Session, VerificationToken** — Model Auth.js untuk NextAuth

### Design Patterns:
- **Route Protection**: Middleware berbasis token NextAuth JWT
- **API Validation**: Zod schema validation di setiap route
- **Error Handling**: Try-catch dengan JSON response
- **Database Queries**: Prisma dengan include/select untuk N+1 prevention
- **File Upload**: Presigned URL dari R2 untuk security
- **Payment Flow**: External webhook handling dengan idempotency check
- **Email**: Queue-based via Resend API (async)

---

*Dokumen ini dibuat pada 2026-05-28 berdasarkan analisis lengkap codebase Prodig.id*
