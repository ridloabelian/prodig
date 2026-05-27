# 🛒 Prodig.id — Marketplace Produk Digital Indonesia

> **"Shopee-nya produk digital"** — Jual & beli e-book, template, course, preset, font, dan produk digital lainnya dengan aman, instan, dan terpercaya.

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

---

## 🚀 Fitur MVP (Fase 1)

| Fitur | Status | Deskripsi |
|---|---|---|
| 🔐 Auth System | ✅ | Register/login dengan email & password, role-based (Buyer/Seller/Admin) |
| 📦 Product Upload | ✅ | Upload file (max 500MB), thumbnail, deskripsi, kategori, harga |
| 🔍 Search & Discovery | ✅ | Keyword search, filter kategori, sorting (terbaru/terlaris/termurah) |
| 💳 Checkout & Payment | ✅ | Integrasi Mayar.id (QRIS, VA, e-wallet) |
| 📥 Instant Delivery | ✅ | File delivery otomatis via download token + Library permanen |
| ⭐ Review System | ✅ | Rating 1-5 + komentar, verified buyer only |
| 📊 Seller Dashboard | ✅ | Statistik penjualan, manajemen produk, request withdrawal |
| 🛡️ Admin Panel | ✅ | Moderasi produk (approve/reject), kelola penarikan dana |
| 📧 Email Notifikasi | ✅ | Email pembelian berhasil dengan link download via Resend |
| ☁️ File Storage | ✅ | Cloudflare R2 (S3-compatible) dengan presigned URL |

---

## 🏗️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Auth** | Auth.js (NextAuth v5) + Prisma Adapter |
| **Database** | PostgreSQL (Supabase/Neon) |
| **ORM** | Prisma |
| **File Storage** | Cloudflare R2 |
| **Payment** | Mayar.id (API + Webhook) |
| **Email** | Resend |
| **Hosting** | Vercel |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase/Neon)
- Cloudflare R2 bucket
- Mayar.id API key
- Resend API key

### 1. Clone & Install

```bash
git clone https://github.com/ridloabelian/prodig.git
cd prodig
npm install
```

### 2. Environment Variables

Buat file `.env.local` dan isi dengan:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLATFORM_FEE_PERCENT=10

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-secret-key"

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="prodig-files"

# Mayar.id
MAYAR_API_KEY="your-mayar-api-key"
MAYAR_WEBHOOK_SECRET="your-webhook-secret"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="noreply@prodig.id"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed categories
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
prodig/
├── app/
│   ├── (main)/            # Homepage, browse, product detail
│   ├── api/               # API routes (REST API)
│   ├── admin/             # Admin moderation panel
│   ├── checkout/          # Checkout & success page
│   ├── dashboard/         # Seller dashboard
│   ├── library/           # Buyer purchase library
│   ├── login/             # Login page
│   ├── register/          # Register page
│   └── sell/              # Seller upload page
├── components/            # React components
│   ├── auth/              # Login & register forms
│   ├── dashboard/         # Stats, products table, withdrawal
│   ├── products/          # Product card, grid, search, filter
│   ├── reviews/           # Review list & form
│   ├── upload/            # File uploader & product form
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities & configs
│   ├── auth.ts            # NextAuth config
│   ├── prisma.ts          # Prisma singleton
│   ├── r2.ts              # R2 S3 client
│   ├── mayar.ts           # Mayar.id API client
│   ├── email.ts           # Resend email helper
│   └── utils.ts           # Helper functions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── types/                 # TypeScript types
└── docs/                  # PRD & dokumentasi
```

---

## 🔄 Core User Flows

### Buyer Journey
```
Landing → Search/Browse → Product Detail → Checkout (Mayar.id)
→ Payment Success → Library / Download
```

### Seller Journey
```
Register → Upload Product → Pending Review → Approved → Sales
→ Dashboard Stats → Withdrawal Request
```

### Admin Journey
```
Login → Moderation Queue → Approve/Reject Products
→ Manage Withdrawals
```

---

## 💰 Business Model

| Sumber | Detail |
|---|---|
| **Platform Fee** | 10% per transaksi |
| **Featured Listing** | Coming soon (Fase 2) |
| **Premium Seller** | Coming soon (Fase 2) |

---

## 📋 Testing Checklist (Pre-Launch)

- [x] Register sebagai Seller & Buyer
- [x] Upload produk → status PENDING
- [x] Admin approve → produk muncul di browse
- [x] Buyer checkout → redirect Mayar.id
- [x] Webhook payment success → status PAID
- [x] Email notifikasi dengan link download
- [x] Download via token (rate limit 3x/24h)
- [x] Library page (permanent access)
- [x] Review produk (verified buyer only)
- [x] Withdrawal request (manual processing)

---

## 🗺️ Roadmap

### Fase 1.5 (Next)
- [ ] Watermark PDF otomatis dengan email buyer
- [ ] WhatsApp notifikasi (Twilio/Wabot)
- [ ] PPN 11% auto-calculation

### Fase 2 (Future)
- [ ] Affiliate system & referral
- [ ] Subscription products (membership)
- [ ] Full-text search (Algolia/pg_trgm)
- [ ] AI recommendation engine
- [ ] Mobile PWA

---

## 📝 License

ISC

---

**Made with ❤️ in Indonesia** — Dukung kreator lokal! 🇮🇩
