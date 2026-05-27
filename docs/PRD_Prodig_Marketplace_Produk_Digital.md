# PRD: Prodig.id — Marketplace Produk Digital No. 1 Indonesia

**Versi:** 1.0  
**Tanggal:** 27 Mei 2026  
**Domain:** prodig.id  
**Payment Gateway:** Mayar.id  
**Tujuan:** MVP live dalam 30 hari, 1.000 produk listing dalam 90 hari.

---

## 1. Executive Summary

**Problem:** Kreator Indonesia jual e-book, course, template via Instagram/WA — _messy_, no discovery, no trust system. Pembeli sulit cari, bandingkan, dan beli aman.

**Solution:** Prodig.id = **"Shopee untuk produk digital"** — marketplace curated dengan instant delivery, review system, dan payment lokal (Mayar.id).

**Why Now:** Bukalapak baru pivot ke virtual goods (Jan 2025). TikTok Shop booming tapi tidak support file delivery. Celah marketplace dedicated masih terbuka lebar.

**Differentiator:** Bukan sekadar jual file. Kita bangun **trust layer** — review verified, preview produk, dan komunitas kreator.

---

## 2. Product Vision

> "Setiap kreator Indonesia bisa monetize skill-nya dalam 5 menit. Setiap pembeli bisa temukan produk digital berkualitas dalam 3 klik."

**Positioning:**
- Bukan competitor Shopee/Tokopedia (mereka jual fisik & virtual goods saja).
- Bukan competitor Gumroad (terlalu global, payment ribet).
- Kita adalah **marketplace lokal** untuk _creative digital products_ (e-book, template, course, preset, font, Notion template, spreadsheet).

---

## 3. MVP Scope — Fase 1 (30 Hari)

### 3.1 Core Features (Must-Have)

| Feature | Deskripsi | Priority |
|---|---|---|
| **Seller Onboarding** | Daftar via email/WA, verifikasi manual v1 (tidak perlu KYC kompleks dulu) | P0 |
| **Product Upload** | Upload file (PDF, ZIP, MP4 max 500MB), thumbnail, deskripsi, kategori, harga | P0 |
| **Instant Delivery** | Pembayaran sukses = buyer dapat link download (expired 24 jam) | P0 |
| **Mayar.id Integration** | Checkout menggunakan Mayar.id (support QRIS, VA, e-wallet) | P0 |
| **Search & Discovery** | Kategori, keyword search, sorting (terbaru/terlaris/termurah) | P0 |
| **Review System** | Rating bintang + teks, hanya buyer verified bisa review | P1 |
| **Seller Dashboard** | Lihat penjualan, withdraw, statistik produk | P1 |

### 3.2 Yang Sengaja Dicut (Fase 2)

- ❌ Affiliate system
- ❌ In-app messaging/chat
- ❌ Subscription/recurring billing
- ❌ Mobile app (mobile web dulu)
- ❌ AI recommendation engine

**Prinsip:** _Launch fast, learn fast._ Semua fitur nice-to-have ditunda sampai ada 500 transaksi.

---

## 4. User Flow

### 4.1 Buyer Journey

```
Landing Page → Search/Kategori → Product Detail (preview)
→ Checkout (Mayar.id) → Payment Success → Download File
```

### 4.2 Seller Journey

```
Daftar → Upload Produk (file + info) → Publish → Dapat Notif Penjualan
→ Withdraw via Dashboard
```

---

## 5. Tech Stack & Arsitektur

| Layer | Pilihan | Alasan |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SEO-friendly, fast, bisa jadi PWA nanti |
| **Backend** | Next.js API Routes + Prisma ORM | Single codebase, cepat develop |
| **Database** | PostgreSQL (Supabase/Neon) | Relational, scalable, murah |
| **File Storage** | Cloudflare R2 / AWS S3 | Murah, CDN global |
| **Payment** | Mayar.id API | Sudah ada, support semua metode pembayaran Indonesia |
| **Hosting** | Vercel | Deploy cepat, auto-scaling |
| **Domain** | prodig.id | Sudah ready |

### Database Schema (Simplified)

```sql
User (
  id, email, name, role: buyer/seller, created_at
)

Product (
  id, seller_id, title, description, price, category,
  file_url, thumbnail, status, created_at
)

Transaction (
  id, buyer_id, product_id, amount, mayar_payment_id,
  status, download_token, created_at
)

Review (
  id, transaction_id, product_id, rating, comment, created_at
)

Withdrawal (
  id, seller_id, amount, status, created_at
)
```

---

## 6. Monetization (Revenue Model)

| Sumber | Detail |
|---|---|
| **Commission** | 10-15% per transaksi (Shopee charge 2-5% tapi mereka subsidized. Kita mulai 10%, turun ke 5% saat volume tinggi) |
| **Featured Listing** | Seller bayar untuk pin produk di homepage/kategori (Fase 2) |
| **Premium Seller Badge** | Verifikasi + analytics advanced (Fase 2) |

**Payout ke Seller:** Net amount dikurangi komisi, withdrawable ke rekening bank/e-wallet setiap minggu.

---

## 7. Go-to-Market & Execution Plan

### Minggu 1-2: Build Core
- Setup repo, DB, Mayar.id integration test
- Product upload + checkout flow
- Basic landing page

### Minggu 3-4: Polish & Seed
- Seller onboarding flow
- Upload 50 "seed products" (tim/beta tester)
- Soft launch ke komunitas kecil

### Bulan 2: Acquire Sellers
- Target 100 sellers aktif
- Outreach ke kreator Instagram/TikTok (e-book, template, course)
- Value prop: "Jualan di Instagram ribet. Di Prodig.id, buyer bisa search & checkout otomatis."

### Bulan 3: Acquire Buyers
- Target 1.000 produk listing, 100 transaksi
- Content marketing: "7 Template Excel UMKM Terbaik di Prodig.id"
- TikTok organic + SEO long-tail

---

## 8. Metrics & Success Criteria

| Metric | Target 30 Hari | Target 90 Hari |
|---|---|---|
| **Products Listed** | 50 | 1.000 |
| **Registered Sellers** | 20 | 200 |
| **Transactions** | 10 | 300 |
| **GMV** | Rp 5 juta | Rp 150 juta |
| **Repeat Buyer Rate** | N/A | >20% |

**North Star Metric:** Weekly Active Transactions (transaksi unik per minggu).

---

## 9. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| **Seller tidak mau pindah dari Instagram** | Buat onboarding 5 menit. Offer: "Upload di sini, link bisa dipasang di bio Instagram" — jadi _complement_, bukan _replacement_. |
| **Buyer tidak percaya platform baru** | Highlight "instant delivery", review system, dan money-back guarantee (Fase 1: manual refund via admin). |
| **Mayar.id downtime/limitasi** | Simpan webhook log, buat retry mechanism. Siapkan fallback manual (admin kirim file via WA sementara). |
| **File piracy/resell** | Download link expired 24 jam, watermark PDF (Fase 2), Terms of Service tegas. |

---

## 10. Next Action (What to Do Today)

1. **Setup repo** Next.js + shadcn/ui + Prisma + Supabase.
2. **Register Mayar.id** API key untuk environment dev.
3. **Design database schema** lengkap (gunakan Prisma schema di atas sebagai base).
4. **Buat wireframe** 3 halaman kritis: Homepage, Product Detail, Checkout Success.
5. **Recruit 5 beta sellers** dari jaringan — tawarkan 0% komisi untuk 10 produk pertama.

---

**Fokus execution-nya:** Jangan buat fitur yang tidak ada di PRD ini. Launch dalam 30 hari, lalu iterate berdasarkan data transaksi nyata.

---

_Dokumen ini dibuat untuk Prodig.id — Marketplace Produk Digital Indonesia._
