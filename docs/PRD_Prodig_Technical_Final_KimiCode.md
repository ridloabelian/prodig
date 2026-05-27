# PRD Final: Prodig.id — Marketplace Produk Digital Indonesia
## Technical Specification & Implementation Guide for Kimi Code CLI

**Versi:** 1.1-Final  
**Tanggal:** 27 Mei 2026  
**Domain:** prodig.id  
**Status:** Approved to Build — MVP Scope Locked  
**Target:** MVP Live H+45 (2 Engineering Sprints x 2 Engineer Fullstack)

---

## 1. Project Overview

Prodig.id adalah marketplace produk digital lokal Indonesia. Fokus Fase 1: produk digital harga rendah-menengah (Rp 25.000–Rp 200.000) dengan instant file delivery.

**2 Kategori Prioritas Launch:**
1. Template & Spreadsheet UMKM
2. Template Akademik

**Fitur P0 (MVP):**
- Auth (register/login, role buyer/seller/admin)
- Seller upload produk (file max 500MB, thumbnail)
- Product discovery (search, kategori, sorting)
- Checkout dengan Mayar.id (QRIS, VA, e-wallet)
- Instant delivery via download token + Library permanen
- Review system (verified buyer only)
- Seller dashboard (stats, withdrawal request)
- Admin moderation panel (approve/reject produk)

**Yang Dicut:**
- Affiliate, subscription, mobile app, AI recommendation, watermark PDF (Fase 1.5), PPN auto-calc (placeholder)

---

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Auth.js (NextAuth v5) + Prisma Adapter |
| Database | PostgreSQL (Supabase/Neon) |
| ORM | Prisma |
| File Storage | Cloudflare R2 (S3-compatible) |
| Payment | Mayar.id (API + Webhook) |
| Email | Resend (fallback: Nodemailer SMTP) |
| Hosting | Vercel |

**Dependencies Wajib:**
```bash
npm install next@14 react react-dom typescript tailwindcss @radix-ui/react-* class-variance-authority clsx tailwind-merge lucide-react
npm install @auth/prisma-adapter next-auth@beta bcryptjs
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install prisma @prisma/client
npm install zod react-hook-form @hookform/resolvers
npm install resend
npm install date-fns
```

**Dev Dependencies:**
```bash
npm install -D @types/bcryptjs @types/node
```

---

## 3. Database Schema (Prisma)

Simpan di `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // untuk migrations (Supabase/Neon)
}

// --- Auth.js Models ---
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// --- Core Models ---
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // hashed, untuk Credentials provider
  role          UserRole  @default(BUYER)
  whatsapp      String?   // format: 6281234567890
  bankAccount   String?
  bankName      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  products      Product[]
  purchases     Transaction[] @relation("BuyerTransactions")
  reviews       Review[]
  withdrawals   Withdrawal[]
}

enum UserRole {
  BUYER
  SELLER
  ADMIN
}

model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  description String?
  products    Product[]
}

model Product {
  id          String   @id @default(cuid())
  sellerId    String
  seller      User     @relation(fields: [sellerId], references: [id])
  title       String
  description String   @db.Text
  price       Int      // IDR, rupiah (bukan sen)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  fileKey     String   // R2 object key, private bucket
  fileSize    Int?     // bytes
  fileName    String?  // original filename
  thumbnail   String   // R2 public URL atau external
  status      ProductStatus @default(PENDING)
  salesCount  Int      @default(0)
  viewCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  transactions Transaction[]
  reviews      Review[]

  @@index([status, categoryId])
  @@index([status, createdAt])
  @@index([status, salesCount])
}

enum ProductStatus {
  PENDING   // menunggu approval admin
  APPROVED  // live di marketplace
  REJECTED  // ditolak admin
  HIDDEN    // disembunyikan seller
}

model Transaction {
  id              String   @id @default(cuid())
  buyerId         String
  buyer           User     @relation("BuyerTransactions", fields: [buyerId], references: [id])
  productId       String
  product         Product  @relation(fields: [productId], references: [id])
  amount          Int      // harga final yang dibayar buyer
  commission      Int      @default(0) // 10% platform fee
  netAmount       Int      @default(0) // amount - commission (diterima seller)
  mayarPaymentId  String?  // ID dari Mayar.id
  mayarInvoiceUrl String?  // URL pembayaran Mayar.id
  status          TransactionStatus @default(PENDING)
  downloadToken   String?  @unique @default(uuid()) // untuk email link
  tokenExpiresAt  DateTime?
  downloadCount   Int      @default(0)
  lastDownloadAt  DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reviews Review[]

  @@index([buyerId, status])
  @@index([mayarPaymentId])
}

enum TransactionStatus {
  PENDING
  PAID
  FAILED
  EXPIRED
  REFUNDED
}

model Review {
  id            String   @id @default(cuid())
  transactionId String   @unique
  transaction   Transaction @relation(fields: [transactionId], references: [id])
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  buyerId       String
  buyer         User     @relation(fields: [buyerId], references: [id])
  rating        Int      // 1-5
  comment       String?  @db.Text
  createdAt     DateTime @default(now())

  @@index([productId, createdAt])
}

model Withdrawal {
  id          String   @id @default(cuid())
  sellerId    String
  seller      User     @relation(fields: [sellerId], references: [id])
  amount      Int      // dalam rupiah
  status      WithdrawalStatus @default(PENDING)
  notes       String?  // alasan reject atau info transfer
  processedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum WithdrawalStatus {
  PENDING
  PROCESSED
  REJECTED
}

model DownloadLog {
  id            String   @id @default(cuid())
  transactionId String
  userId        String
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@index([transactionId, createdAt])
}

// --- Webhook Log untuk Idempotency & Debug ---
model WebhookLog {
  id        String   @id @default(cuid())
  provider  String   // "mayar"
  eventId   String?  // external event ID jika ada
  payload   Json
  processed Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([provider, eventId])
}
```

**Seed Script** (`prisma/seed.ts`):
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: 'Template & Spreadsheet UMKM', slug: 'template-umkm', description: 'Template laporan keuangan, invoice, SOP, KPI untuk UMKM' },
    { name: 'Template Akademik', slug: 'template-akademik', description: 'Template skripsi, jurnal, presentasi, CV, proposal' },
    { name: 'E-Book', slug: 'ebook', description: 'Buku digital berbagai kategori' },
    { name: 'Course & Tutorial', slug: 'course', description: 'Video course dan tutorial' },
    { name: 'Preset & Filter', slug: 'preset', description: 'Preset Lightroom, filter, LUT' },
    { name: 'Font & Typography', slug: 'font', description: 'Font dan asset tipografi' },
    { name: 'Lainnya', slug: 'lainnya', description: 'Produk digital lainnya' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log('Seeded categories')
}

main()
```

---

## 4. Environment Variables

Simpan di `.env.local`:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLATFORM_FEE_PERCENT=10

# Database (Supabase/Neon)
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="prodig-files"
R2_PUBLIC_BUCKET_NAME="prodig-public" // untuk thumbnail (opsional, bisa pakai bucket yang sama dengan prefix)

# Mayar.id
MAYAR_API_KEY="your-mayar-api-key"
MAYAR_WEBHOOK_SECRET="your-webhook-secret-jika-ada"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="noreply@prodig.id"
```

---

## 5. Project File Structure

```
prodig.id/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts      # Auth.js handler
│   │   ├── register/route.ts                # Custom register (email/pass)
│   │   ├── upload/presigned/route.ts        # Generate R2 presigned URL
│   │   ├── products/route.ts                # GET list, POST create
│   │   ├── products/[id]/route.ts           # GET detail
│   │   ├── products/[id]/reviews/route.ts   # GET reviews per product
│   │   ├── checkout/route.ts                # POST create transaction + Mayar invoice
│   │   ├── webhooks/mayar/route.ts          # POST Mayar callback
│   │   ├── library/route.ts                 # GET buyer purchases
│   │   ├── download/route.ts                # GET verify token & redirect R2
│   │   ├── reviews/route.ts                 # POST create review
│   │   ├── seller/dashboard/route.ts        # GET stats
│   │   ├── seller/products/route.ts         # GET seller products
│   │   ├── seller/withdrawals/route.ts      # GET list, POST request
│   │   ├── admin/products/route.ts          # GET moderation queue
│   │   └── admin/products/[id]/route.ts     # PATCH approve/reject
│   ├── (main)/
│   │   ├── page.tsx                         # Homepage
│   │   ├── products/page.tsx                # Browse/Search
│   │   └── products/[id]/page.tsx           # Product Detail
│   ├── sell/page.tsx                        # Seller Upload Form
│   ├── dashboard/page.tsx                   # Seller Dashboard
│   ├── library/page.tsx                     # Buyer Library
│   ├── checkout/success/page.tsx            # Payment Success
│   ├── admin/page.tsx                       # Admin Moderation
│   └── layout.tsx                           # Root layout (providers, navbar)
├── components/
│   ├── ui/                                  # shadcn/ui components
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── products/
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── product-detail.tsx
│   │   ├── search-bar.tsx
│   │   ├── category-filter.tsx
│   │   └── sort-select.tsx
│   ├── upload/
│   │   └── product-upload-form.tsx          # Drag-drop, presigned upload
│   ├── checkout/
│   │   └── checkout-button.tsx
│   ├── library/
│   │   └── library-list.tsx
│   ├── reviews/
│   │   ├── review-list.tsx
│   │   └── review-form.tsx
│   ├── dashboard/
│   │   ├── stats-cards.tsx
│   │   ├── seller-products-table.tsx
│   │   └── withdrawal-form.tsx
│   └── admin/
│       └── product-moderation-table.tsx
├── lib/
│   ├── prisma.ts                            # Prisma singleton
│   ├── auth.ts                              # Auth.js config
│   ├── r2.ts                                # R2 S3 client + presigned helpers
│   ├── mayar.ts                             # Mayar.id API client
│   ├── email.ts                             # Resend email helper
│   └── utils.ts                             # cn() dan helpers
├── types/
│   └── index.ts                             # Shared TypeScript types
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── ...
├── middleware.ts                            # Route protection (seller, admin)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 6. Authentication System (Auth.js v5)

**Config** (`lib/auth.ts`):
- Provider: `Credentials` (email + password)
- Session: JWT strategy
- Callbacks: `session` callback inject `user.id` dan `user.role`
- Events: `signIn` log

**Register API** (`app/api/register/route.ts`):
- Method: `POST`
- Body: `{ name, email, password, role: "BUYER" | "SELLER", whatsapp? }`
- Validasi: Zod schema
- Password: hash dengan `bcryptjs` (10 rounds)
- Response: `{ user: { id, name, email, role } }`

**Middleware** (`middleware.ts`):
- Protect `/sell`, `/dashboard`, `/admin` dengan role check
- `/sell` dan `/dashboard` → `SELLER` or `ADMIN`
- `/admin` → `ADMIN` only
- Redirect unauthorized ke `/login`

---

## 7. File Upload System (Cloudflare R2)

**R2 Client** (`lib/r2.ts`):
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 300) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 300) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn })
}
```

**Upload Flow:**
1. Client pilih file → kirim `POST /api/upload/presigned` dengan `{ fileName, fileType, fileSize, type: "product" | "thumbnail" }`
2. Server validasi:
   - Product file: max 500MB, allowed: `application/pdf`, `application/zip`, `video/mp4`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, dll.
   - Thumbnail: max 2MB, image only.
3. Server generate unique key: `products/{userId}/{uuid}-{filename}` atau `thumbnails/{uuid}-{filename}`
4. Server return `{ uploadUrl, fileKey, fileName }`
5. Client `PUT` file langsung ke `uploadUrl`
6. Setelah upload sukses, client submit form produk dengan `fileKey`, `fileName`, `fileSize`

---

## 8. Product System

### 8.1 Create Product API (`POST /api/products`)
**Auth:** Seller only
**Body:**
```json
{
  "title": "string (min 5, max 100)",
  "description": "string (min 50, max 5000)",
  "price": "number (min 10000)",
  "categoryId": "string (valid category id)",
  "fileKey": "string",
  "fileName": "string",
  "fileSize": "number",
  "thumbnail": "string (URL)"
}
```
**Logic:**
- Validasi Zod
- `status` default `PENDING` (butuh approval admin)
- Response: `{ product: { id, title, status } }`

### 8.2 List Products API (`GET /api/products`)
**Query Params:**
- `?q=` — search keyword (case-insensitive ILIKE on title & description)
- `?category=` — filter by category slug
- `?sort=` — `newest` | `bestselling` | `price_asc` | `price_desc`
- `?page=` — default 1
- `?limit=` — default 20, max 50

**Logic:**
- Hanya `status = APPROVED`
- Sorting:
  - `newest`: `createdAt desc`
  - `bestselling`: `salesCount desc`
  - `price_asc`: `price asc`
  - `price_desc`: `price desc`
- Pagination: cursor-based atau offset (offset OK untuk MVP)
- Include: `seller { name, image }`, `category { name, slug }`, review aggregate (avg rating, count)

### 8.3 Product Detail API (`GET /api/products/[id]`)
- Return full product dengan seller info, reviews (limit 10 newest), avg rating
- Increment `viewCount` (async, jangan block response)

---

## 9. Checkout & Payment (Mayar.id)

### 9.1 Mayar.id API Client (`lib/mayar.ts`)
```typescript
const MAYAR_BASE_URL = "https://api.mayar.id" // atau sandbox URL

export async function createMayarInvoice(params: {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  redirectUrl: string;
  webhookUrl: string;
  externalId: string;
}) {
  const res = await fetch(`${MAYAR_BASE_URL}/v1/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MAYAR_API_KEY}`,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Mayar API error: ${res.status}`)
  return res.json() // { data: { id, paymentUrl, ... } }
}
```

**Note:** Jika endpoint Mayar.id berbeda, sesuaikan berdasarkan dokumentasi resmi Mayar.id. Pastikan menggunakan `externalId` untuk idempotency (isi dengan `transaction.id`).

### 9.2 Checkout API (`POST /api/checkout`)
**Auth:** Buyer (logged in)
**Body:** `{ productId: string }`
**Flow:**
1. Validasi product exists & `status === APPROVED`
2. Cek buyer tidak memiliki transaction `PAID` untuk produk ini (no double purchase)
3. Hitung: `commission = Math.floor(product.price * PLATFORM_FEE_PERCENT / 100)`, `netAmount = product.price - commission`
4. Create `Transaction` record (status `PENDING`)
5. Call Mayar.id `createMayarInvoice`:
   - `amount`: product.price
   - `description`: `Pembelian ${product.title} di Prodig.id`
   - `customerName`: buyer.name
   - `customerEmail`: buyer.email
   - `redirectUrl`: `${NEXT_PUBLIC_APP_URL}/checkout/success?trx_id={transaction.id}`
   - `webhookUrl`: `${NEXT_PUBLIC_APP_URL}/api/webhooks/mayar`
   - `externalId`: transaction.id
6. Update `Transaction` dengan `mayarPaymentId` dan `mayarInvoiceUrl`
7. Response: `{ invoiceUrl: string, transactionId: string }`
8. Client redirect ke `invoiceUrl`

### 9.3 Payment Success Page (`/checkout/success`)
- Terima query `?trx_id={id}`
- Fetch transaction status dari DB
- Jika `PAID`: tampilkan sukses + link ke Library
- Jika `PENDING`: polling setiap 3 detik (max 10x) atau tampilkan "Menunggu konfirmasi"
- Jika `FAILED/EXPIRED`: tampilkan gagal + tombol coba lagi

### 9.4 Mayar Webhook (`POST /api/webhooks/mayar`)
**Security:**
- Verifikasi signature jika Mayar.id support webhook signature (gunakan `MAYAR_WEBHOOK_SECRET`)
- Jika tidak ada signature: verifikasi idempotency via `WebhookLog`

**Flow:**
1. Log payload ke `WebhookLog` dengan `eventId` (jika ada) atau composite key
2. Cek idempotency: jika `mayarPaymentId` + `status` sudah pernah processed → return 200
3. Cari `Transaction` by `mayarPaymentId` atau `externalId`
4. Update status:
   - `PAID` → update transaction status, increment `product.salesCount`, set `tokenExpiresAt = now + 24 hours`, kirim email notifikasi sukses dengan download link
   - `EXPIRED` → update transaction status
   - `FAILED` → update transaction status
5. Mark webhook as processed

**Failure Handling:**
- Return 200 untuk semua valid request (jangan trigger retry Mayar.id untuk case yang sudah handled)
- Jika transaction tidak ditemukan: log error, return 200 (jangan 404, nanti Mayar.id retry)
- Dead Letter Queue: webhook yang gagal diproses (throw error) akan diretry oleh Mayar.id. Jika masih gagal setelah 3x, admin cek manual via `WebhookLog` table.

### 9.5 Email Notification (Resend)
**Email Template:**
- **Subject:** `[Prodig.id] Pembayaran Berhasil — ${product.title}`
- **Body:**
  - Terima kasih telah membeli
  - Nama produk, harga
  - **Link Download:** `${NEXT_PUBLIC_APP_URL}/download?token=${transaction.downloadToken}` (berlaku 24 jam)
  - **Library:** Link ke `/library` untuk akses permanen
  - Support: WhatsApp founder

**Function** (`lib/email.ts`):
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPurchaseSuccessEmail(to: string, data: { ... }) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `[Prodig.id] Pembayaran Berhasil — ${data.productTitle}`,
    html: `...`, // HTML template sederhana
  })
}
```

---

## 10. Delivery & Library System

### 10.1 Download via Email Token (`GET /api/download?token={uuid}`)
**Auth:** Tidak wajib login (token-based untuk email link), tapi jika logged in lebih baik
**Flow:**
1. Cari `Transaction` by `downloadToken`
2. Validasi: `status === PAID`
3. Validasi: `tokenExpiresAt > now` (jika expired, redirect ke login + library)
4. Cek rate limit: `SELECT COUNT(*) FROM DownloadLog WHERE transactionId = ? AND createdAt > NOW() - INTERVAL '24 hours'`
5. Jika >= 3 → return 429 (Too Many Requests) dengan pesan "Limit download tercapai. Coba lagi dalam 24 jam atau hubungi support."
6. Generate R2 presigned GET URL (expires 5 menit)
7. Insert `DownloadLog`
8. Update `transaction.downloadCount`, `lastDownloadAt`
9. Redirect 302 ke presigned URL

### 10.2 Library Page (`/library`)
**Auth:** Buyer only
**Data:**
- List semua `Transaction` where `buyerId = currentUser.id` AND `status = PAID`
- Include: product thumbnail, title, seller name, purchase date
- Action: tombol "Download" → call `GET /api/download?trx_id={transaction.id}`

### 10.3 Library Download API (`GET /api/download?trx_id={id}`)
**Auth:** Wajib login, buyer harus owner transaction
**Flow:** Sama dengan token-based (step 4-9), tapi tanpa cek token expiry (Library = permanent access)

---

## 11. Review System

### 11.1 Create Review API (`POST /api/reviews`)
**Auth:** Buyer
**Body:** `{ transactionId: string, rating: number (1-5), comment?: string }`
**Rules:**
- Transaction harus `status === PAID`
- Transaction harus milik buyer yang login
- Transaction belum punya review (`Transaction.reviews` empty)
- Minimal 1 jam sejak `transaction.createdAt` (cooldown)
- `comment` min 10 karakter jika diisi
**Logic:**
- Create `Review`
- Response: `{ review: { id, rating, comment, createdAt, buyer: { name, image } } }`

### 11.2 Product Reviews API (`GET /api/products/[id]/reviews`)
- Return list review dengan buyer info
- Sort: `createdAt desc`
- Pagination: 10 per page

---

## 12. Seller Dashboard

### 12.1 Dashboard Stats API (`GET /api/seller/dashboard`)
**Auth:** Seller
**Return:**
```json
{
  "totalProducts": 0,
  "totalSales": 0,
  "totalRevenue": 0, // sum netAmount dari transactions PAID
  "pendingWithdrawal": 0, // sum withdrawals PENDING
  "availableBalance": 0 // totalRevenue - totalProcessedWithdrawal
}
```

### 12.2 Seller Products API (`GET /api/seller/products`)
- List products by `sellerId = currentUser.id`
- Include: status, salesCount, viewCount, createdAt

### 12.3 Withdrawal Request API (`POST /api/seller/withdrawals`)
**Auth:** Seller
**Body:** `{ amount: number }`
**Rules:**
- `amount >= 50000`
- `amount <= availableBalance`
- Seller harus sudah isi `bankAccount` dan `bankName`
**Logic:**
- Create `Withdrawal` status `PENDING`
- Response: `{ withdrawal: { id, amount, status, createdAt } }`
**Processing:** Manual oleh admin (Fase 1). Admin panel untuk mark `PROCESSED`.

---

## 13. Admin Moderation Panel

### 13.1 Moderation Queue API (`GET /api/admin/products`)
**Auth:** Admin only
**Query:** `?status=PENDING` (default), `?page=`, `?limit=`
**Return:** List products with seller info, submitted date

### 13.2 Moderation Action API (`PATCH /api/admin/products/[id]`)
**Auth:** Admin only
**Body:** `{ status: "APPROVED" | "REJECTED", notes?: string }`
**Logic:**
- Update `product.status`
- Jika `REJECTED`: optional kirim email ke seller (Fase 1: manual via admin panel notes)
- Response: updated product

### 13.3 Admin Withdrawals API (`GET /api/admin/withdrawals`)
- List all `PENDING` withdrawals
- `PATCH /api/admin/withdrawals/[id]` → update status `PROCESSED` atau `REJECTED` dengan `notes`

---

## 14. Frontend Pages Specification

### 14.1 Homepage (`/`)
- Hero section: "Marketplace Produk Digital Indonesia" + CTA jual/beli
- Featured Products: 8 produk terbaru (`status=APPROVED`, `createdAt desc`)
- Categories Grid: 7 kategori dengan icon
- How it works: 3 steps (Upload → Jual → Download)
- Footer: link ke Terms, Privacy, Support WhatsApp

### 14.2 Browse/Search (`/products`)
- Search bar (debounced 300ms)
- Category filter pills
- Sort dropdown
- Product grid (responsive: 1 col mobile, 2 tablet, 4 desktop)
- Pagination
- Empty state illustration

### 14.3 Product Detail (`/products/[id]`)
- Thumbnail (aspect-video, object-cover)
- Title, price, seller avatar + name
- "Beli Sekarang" button (checkout)
- Description (render plain text atau simple HTML sanitization)
- Reviews section (avg rating, list reviews)
- Related products (same category, exclude current)

### 14.4 Sell Page (`/sell`)
- Auth wall (redirect ke login jika belum)
- Form: Title, Category (select), Price (number), Description (textarea), Thumbnail upload, File upload (drag-drop)
- Upload flow: File → presigned URL → direct upload → submit form
- Success: "Produk sedang direview oleh tim kami"

### 14.5 Seller Dashboard (`/dashboard`)
- Stats cards (4 metrics)
- Tabs: Produk Saya | Penjualan | Penarikan
- Produk table: status badge (pending/approved/rejected), edit/hide action
- Withdrawal form + history table

### 14.6 Library (`/library`)
- Grid card: thumbnail, title, seller, purchase date
- Download button (with loading state)
- Empty state: "Belum ada pembelian"

### 14.7 Admin Panel (`/admin`)
- Tabs: Moderasi Produk | Penarikan Dana
- Data table dengan action button (Approve/Reject)
- Filter dan search sederhana

---

## 15. Business Rules & Constraints (Hardcoded di Code)

| Rule | Value | Location |
|---|---|---|
| Platform Fee | 10% | `PLATFORM_FEE_PERCENT` env, applied di checkout API |
| Max Product File | 500 MB | Validasi di `/api/upload/presigned` |
| Max Thumbnail | 2 MB | Validasi di `/api/upload/presigned` |
| Min Price | Rp 10.000 | Zod schema di product create |
| Max Price Fase 1 | Rp 200.000 | Zod schema + UI constraint |
| Download Limit | 3x per 24 jam | Query `DownloadLog` di download API |
| Token Expiry | 24 jam | `tokenExpiresAt = now + 24h` di webhook handler |
| Min Withdrawal | Rp 50.000 | Validasi di withdrawal API |
| Withdrawal SLA | Manual, 2x/minggu | Dokumentasi + UI copy |
| Review Cooldown | 1 jam post-purchase | Validasi di review API |
| Approval SLA | 24 jam (copy only) | Admin panel + email |

---

## 16. Implementation Task List (For Kimi Code CLI)

### Sprint 1: Foundation (Hari 1-15)

**Task 1 — Project Setup**
- [ ] Init Next.js 14 dengan shadcn/ui (`npx shadcn@latest init`)
- [ ] Install semua dependencies (Auth.js, Prisma, AWS SDK, Resend, Zod, RHF)
- [ ] Setup Tailwind config dan global CSS
- [ ] Setup folder structure sesuai bagian 5

**Task 2 — Database & Auth**
- [ ] Write `prisma/schema.prisma` lengkap
- [ ] Setup `.env.local` template
- [ ] Run `prisma migrate dev --name init`
- [ ] Run `prisma db seed`
- [ ] Setup `lib/prisma.ts` (singleton dengan `$extends` untuk logging dev)
- [ ] Setup `lib/auth.ts` (Auth.js v5 + Credentials provider + Prisma adapter)
- [ ] Implement `POST /api/register` dengan bcrypt hashing
- [ ] Implement `middleware.ts` (route protection by role)
- [ ] Build `RegisterForm` dan `LoginForm` components
- [ ] Setup `app/api/auth/[...nextauth]/route.ts`

**Task 3 — R2 Upload Infrastructure**
- [ ] Setup `lib/r2.ts` (S3 client + presigned helpers)
- [ ] Implement `POST /api/upload/presigned` (validasi size, type, generate key)
- [ ] Build reusable `FileUploader` component (drag-drop, progress bar, direct upload ke R2)
- [ ] Test upload end-to-end (file muncul di R2 dashboard)

**Task 4 — Product System Core**
- [ ] Implement `POST /api/products` (create with validation)
- [ ] Implement `GET /api/products` (search, filter, sort, pagination)
- [ ] Implement `GET /api/products/[id]` (detail + increment viewCount)
- [ ] Seed 10 dummy products untuk testing
- [ ] Build `ProductCard`, `ProductGrid`, `SearchBar`, `CategoryFilter`, `SortSelect`
- [ ] Build Homepage (`/`) dengan featured products
- [ ] Build Browse page (`/products`)
- [ ] Build Product Detail page (`/products/[id]`)

**Task 5 — Seller Upload Flow**
- [ ] Build `ProductUploadForm` (title, category select, price, description, thumbnail uploader, file uploader)
- [ ] Build `/sell` page
- [ ] Integrasi presigned upload ke form (file dulu, lalu submit metadata)
- [ ] Handle success/error states

### Sprint 2: Commerce & Delivery (Hari 16-30)

**Task 6 — Mayar.id Integration**
- [ ] Setup `lib/mayar.ts` (API client)
- [ ] Implement `POST /api/checkout`
- [ ] Build `CheckoutButton` component
- [ ] Build `/checkout/success` page dengan polling
- [ ] Implement `POST /api/webhooks/mayar` (handler + idempotency + status update)
- [ ] Setup `WebhookLog` processing
- [ ] Test end-to-end: checkout → Mayar sandbox/beta → webhook → status PAID

**Task 7 — Email Notifications**
- [ ] Setup `lib/email.ts` (Resend)
- [ ] Design HTML email template (purchase success)
- [ ] Integrasi email kirim di webhook handler (status PAID)
- [ ] Test email delivery

**Task 8 — Delivery & Library**
- [ ] Implement `GET /api/download?token=` (verify + rate limit + redirect R2)
- [ ] Implement `GET /api/library` (buyer purchases)
- [ ] Build `/library` page (grid + download button)
- [ ] Implement `GET /api/download?trx_id=` (library permanent access)
- [ ] Test download flow: token expired, rate limit hit, success redirect

**Task 9 — Review System**
- [ ] Implement `POST /api/reviews` (validation rules)
- [ ] Implement `GET /api/products/[id]/reviews`
- [ ] Build `ReviewList` dan `ReviewForm` components
- [ ] Integrasi ke Product Detail page
- [ ] Test: buyer bisa review, non-buyer tidak bisa, double review blocked

**Task 10 — Seller Dashboard**
- [ ] Implement `GET /api/seller/dashboard` (stats aggregation)
- [ ] Implement `GET /api/seller/products`
- [ ] Implement `POST /api/seller/withdrawals`
- [ ] Build `/dashboard` page (stats cards + tabs)
- [ ] Build `SellerProductsTable` dan `WithdrawalForm`

### Sprint 3: Admin & Polish (Hari 31-45)

**Task 11 — Admin Panel**
- [ ] Implement `GET /api/admin/products` (moderation queue)
- [ ] Implement `PATCH /api/admin/products/[id]`
- [ ] Implement admin withdrawals APIs
- [ ] Build `/admin` page (data tables + action buttons)
- [ ] Build `ProductModerationTable`
- [ ] Test: approve product → muncul di browse. reject → tidak muncul.

**Task 12 — QA & Bugfix**
- [ ] Auth flow: register → login → role check → logout
- [ ] Seller flow: upload → pending → approve → muncul di browse → checkout → paid → library → download
- [ ] Edge cases: double purchase, expired token, rate limit, invalid webhook
- [ ] Mobile responsive check
- [ ] Performance: query slow check (add index jika perlu)

**Task 13 — Deployment**
- [ ] Setup production database (Supabase/Neon)
- [ ] Setup production R2 bucket
- [ ] Setup Mayar.id production API key + webhook URL
- [ ] Setup Resend production domain (verifikasi DNS)
- [ ] Deploy ke Vercel (`main` branch)
- [ ] Environment variables production
- [ ] Custom domain `prodig.id` pointing ke Vercel
- [ ] Smoke test di production

---

## 17. Testing Checklist (Pre-Launch)

| Flow | Langkah | Expected Result |
|---|---|---|
| Register Seller | Daftar dengan role SELLER | Akun aktif, bisa login |
| Upload Produk | Jual template Excel UMKM | Produk status PENDING, file di R2 |
| Admin Approve | Admin klik Approve | Status APPROVED, muncul di homepage |
| Buyer Browse | Cari "template laporan keuangan" | Produk muncul di hasil pencarian |
| Checkout | Klik Beli → redirect Mayar | Transaction record created, redirect ke Mayar |
| Webhook Success | Bayar via Mayar test | Status PAID, email terkirim, salesCount +1 |
| Email Download | Klik link email | Redirect ke R2, file terdownload |
| Library Access | Buka /library | Produk muncul, tombol download aktif |
| Rate Limit | Download 4x dalam 24 jam | Error 429, pesan limit |
| Review | Buyer kasih rating 5 | Review muncul di product detail |
| Withdrawal | Seller request Rp 100.000 | Withdrawal record PENDING, balance tidak berkurang (manual) |
| Reject Product | Admin reject dengan notes | Status REJECTED, tidak muncul di browse |

---

## 18. Notes & Known Limitations (Fase 1)

1. **PPN:** Fase 1 tidak mengkalkulasi PPN 11% di checkout. Harga yang ditampilkan adalah harga final seller. PPN akan ditambahkan sebagai line item transparan di Fase 1.1 setelah konsultasi pajak dan PKP aktif.
2. **Watermark PDF:** Tidak ada di Fase 1. Seller dengan produk >Rp 200.000 tidak diterima. Watermark otomatis (email buyer di setiap halaman PDF) masuk Fase 1.5.
3. **Withdrawal:** 100% manual oleh founder/admin via transfer bank. Tidak ada auto-payout.
4. **WhatsApp Notif:** Email adalah channel notifikasi utama. WhatsApp notification (via Twilio/Wabot) masuk Fase 1.5.
5. **Search:** Menggunakan Prisma `contains` (ILIKE), bukan full-text search. Cukup untuk <10.000 produk. Upgrade ke PostgreSQL full-text search atau Algolia di Fase 2.
6. **File Type Validation:** Validasi di API saja. Client-side juga ada tapi bisa di-bypass. R2 bucket private, tidak ada public listing.
7. **Image Optimization:** Thumbnail di-upload ke R2 tanpa resize. Tambah image optimization service (Cloudflare Images atau Sharp lambda) di Fase 2 jika bandwidth tinggi.

---

## 19. Post-MVP Backlog (Fase 1.5 & Fase 2)

- [ ] Watermark PDF otomatis dengan email buyer
- [ ] WhatsApp notifikasi (Twilio/Wabot)
- [ ] Auto-withdrawal (bank API integration)
- [ ] Affiliate system (kode referral, komisi)
- [ ] PPN 11% auto-calculation dan e-Faktur
- [ ] Full-text search (pg_trgm atau Algolia)
- [ ] Image resize/optimization
- [ ] Subscription products (membership)
- [ ] Mobile app (PWA dulu)
- [ ] AI recommendation (collaborative filtering)

---

**Dokumen ini adalah spesifikasi teknis final untuk eksekusi engineering.** Tidak ada fitur tambahan di luar task list di atas untuk Fase 1 (MVP). Jika ada blocker teknis selama development, diskusikan dan scope cut, bukan scope creep.

**Siap dieksekusi.**
