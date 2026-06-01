# Prodig.id — Agent Context

> Marketplace produk digital Indonesia. MVP feature-complete.

## Tech Stack (1-sentence each)
- **Next.js 16** App Router + TypeScript
- **Tailwind CSS** + shadcn/ui components
- **NextAuth v4** Credentials provider + Prisma Adapter
- **Prisma 5** + PostgreSQL (Neon)
- **Cloudflare R2** S3-compatible storage, presigned URLs
- **Mayar.id** payment gateway (QRIS/VA/e-wallet) + webhook
- **Resend** transactional email

## File Upload Flow
1. Client → `POST /api/upload/presigned` → server generates presigned R2 URL + publicUrl
2. Client uploads file **directly to R2** via XHR PUT (Promise-based, not callback-based)
3. On success, `onUploadComplete(fileKey, fileName, fileSize, publicUrl)` fires
4. Product form submits `fileKey` + `thumbnail` (publicUrl) to `POST /api/products`

## Critical Patterns

### Presigned URL Generation
```ts
// lib/r2.ts
getPresignedUploadUrl(key, contentType, expiresIn=300) // PUT
getPresignedDownloadUrl(key, expiresIn=300)             // GET
getPublicUrl(key)                                       // custom domain || S3 endpoint
```

### Role-Based Route Protection
```ts
// proxy.ts (Next.js 16 convention, replaces middleware.ts)
/sell, /dashboard    → SELLER or ADMIN
/admin               → ADMIN only
/library             → any authenticated
/checkout/success    → public (but checks session)
```

### Product Lifecycle
```
Seller uploads → PENDING → Admin approves → APPROVED → Buyer browses → Checkout → Mayar invoice → Webhook PAID → Email + download token
```

### Transaction & Download
- `downloadToken` (UUID) created on payment success
- Rate limit: 3 downloads per 24h via `downloadCount` / `lastDownloadAt`
- Permanent access via `/library` (no token needed, checks `Transaction.status === PAID`)

### Webhook Idempotency
```ts
// app/api/webhooks/mayar/route.ts
1. Log payload to WebhookLog
2. Check existingLog.processed — if true, return 200
3. Update transaction, send email, create download token
4. Mark log as processed
```

## Database Schema (12 models)
User | Product | Transaction | Review | Withdrawal | Category | DownloadLog | WebhookLog | Account | Session | VerificationToken

Key enums:
- `UserRole`: BUYER, SELLER, ADMIN
- `ProductStatus`: PENDING, APPROVED, REJECTED, HIDDEN
- `TransactionStatus`: PENDING, PAID, FAILED, EXPIRED, REFUNDED

### Transaction Fields
- `subtotal` — harga dasar produk
- `ppn` — PPN 11%
- `amount` — total bayar buyer (subtotal + ppn)
- `commission` — platform fee % dari subtotal
- `netAmount` — subtotal - commission (diterima seller)

## API Routes (memory map)
```
/api/upload/presigned        POST  → {uploadUrl, fileKey, publicUrl}
/api/products                POST  → create product (seller)
/api/products/[id]           GET   → product detail
/api/products/[id]/reviews   POST  → create review (verified buyer)
/api/checkout                POST  → create Mayar invoice
/api/webhooks/mayar          POST  → handle payment callback
/api/download                GET   → presigned download URL
/api/library                 GET   → list buyer purchases
/api/admin/products          GET   → moderation queue
/api/admin/products/[id]     PATCH → approve/reject
/api/seller/dashboard        GET   → stats
/api/seller/withdrawals      POST  → request withdrawal
```

## Environment Variables (required)
```env
NEXT_PUBLIC_APP_URL
DATABASE_URL / DIRECT_URL
NEXTAUTH_URL / NEXTAUTH_SECRET
R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME
NEXT_PUBLIC_R2_PUBLIC_DOMAIN        # r2.dev public URL
MAYAR_API_KEY / MAYAR_WEBHOOK_SECRET
RESEND_API_KEY / EMAIL_FROM
PLATFORM_FEE_PERCENT=10
```

## Known Quirks
- **R2 CORS** must be configured in Cloudflare dashboard for browser uploads to work
- **Public Development URL** enabled on `prodig-files` bucket for thumbnail access
- Download token expiry (`tokenExpiresAt`) exists in schema but enforcement should be verified if needed
- Withdrawal processing is manual (admin approves in dashboard)
- File size validation (500MB product, 2MB thumbnail) happens in API route, not DB constraint
- Seller bank info (`bankAccount`, `bankName`) exists on User model but no dedicated UI yet

## Demo Credentials
```
seller@prodig.id / password123
buyer@prodig.id / password123
```

## Roadmap (not yet implemented)
- WhatsApp notification
- Affiliate/subscription

---
*Last updated: 2026-06-01*

## Implemented Recently
- **Proxy convention** (Next.js 16) — replaced deprecated `middleware.ts`
- **PPN 11%** — checkout includes tax breakdown, stored in `Transaction.subtotal/ppn/amount`
- **Watermark PDF auto** — post-payment webhook watermarks PDFs with buyer email + transaction ID
