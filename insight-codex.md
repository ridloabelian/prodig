# Insight Codex: Master Plan Prodig.id

Tanggal analisis: 2026-06-04

Dokumen ini dibuat berdasarkan pembacaan kode aktual di repo, bukan hanya dari `README.md` atau `AGENTS.md`. Baseline teknis terakhir: `npm run build` berhasil.

## 1. Ringkasan Jujur

Prodig.id sudah melewati fase "sekadar prototype". Core marketplace sudah ada: auth, katalog produk, upload file, checkout Mayar, webhook pembayaran, download token, library pembeli, review, dashboard seller, admin moderation, withdrawal, affiliate data model, WhatsApp notification, watermark PDF, dan landing page builder.

Tetapi status yang lebih akurat adalah:

> MVP feature-complete, belum production-hardened.

Prioritas ke depan bukan menambah fitur sebanyak mungkin. Yang paling penting adalah menutup risiko finansial dan operasional dulu, karena aplikasi ini memproses uang, file digital berbayar, dan akses permanen pembeli.

## 2. Realita Stack Saat Ini

Dokumentasi proyek masih banyak menyebut Next.js, Prisma, PostgreSQL, NextAuth, dan Vercel. Kode aktif root sudah berbeda.

| Area | Tertulis di dokumen lama | Kode aktual |
| --- | --- | --- |
| Framework | Next.js App Router | Astro 6 |
| Hosting/runtime | Vercel/Next server | Cloudflare Workers via `@astrojs/cloudflare` |
| Database | PostgreSQL/Neon | Cloudflare D1 SQLite |
| ORM | Prisma | Drizzle ORM |
| Auth | NextAuth | Custom session cookie |
| Storage | Cloudflare R2 | Cloudflare R2 |
| Payment | Mayar.id | Mayar.id |
| Email | Resend | Resend |
| WhatsApp | Conviq/Chatwoot | Conviq/Chatwoot |
| AI | Belum jelas di dokumen utama | Cloudflare Workers AI fallback rule-based |

Keputusan pertama yang harus dibuat: jadikan stack Astro + Cloudflare sebagai arsitektur resmi, atau rollback ke Next.js backup. Menurut saya, lanjutkan Astro + Cloudflare karena repo aktif sudah bergerak ke sana dan biaya operasionalnya cocok untuk marketplace digital Indonesia.

## 3. Temuan Paling Penting

### P0: Route payment/download punya bug runtime

Di `src/pages/api/webhooks/mayar.ts` dan `src/pages/api/download.ts` ada pola:

```ts
const env = env;
```

Ini shadowing import `env` dan berpotensi menyebabkan `ReferenceError` saat route dieksekusi. Build lolos, tetapi dua alur paling kritis bisa gagal runtime:

- webhook Mayar tidak memproses pembayaran sukses
- download file pembeli tidak berjalan

Ini harus diperbaiki sebelum testing transaksi end-to-end berikutnya.

### P0: Webhook Mayar belum memverifikasi signature

`MAYAR_WEBHOOK_SECRET` disebut di dokumentasi, tetapi handler webhook belum memakai verifikasi signature/HMAC. Dampaknya serius: request palsu ke endpoint webhook bisa menandai transaksi sebagai `PAID` jika payment id cocok atau dapat ditebak lewat celah lain.

Webhook harus menolak payload yang gagal signature validation sebelum menulis `webhook_logs` atau mengubah transaksi.

### P0: Dokumentasi arsitektur menyesatkan kontributor

`AGENTS.md` dan `README.md` masih menggambarkan proyek lama. Ini membuat setiap engineer atau agent baru akan memulai dari asumsi salah: mencari Prisma schema aktif, route Next.js, atau NextAuth, padahal root project aktif adalah Astro/D1.

Dokumentasi harus menjadi source of truth, bukan artefak migrasi.

### P1: Upload flow aktif tidak sama dengan dokumen

Dokumen menjelaskan presigned upload langsung ke R2. UI `src/pages/sell.astro` saat ini memakai `/api/upload/direct`, lalu server menerima file multipart dan menulis ke R2 binding.

Untuk thumbnail kecil, direct upload masih masuk akal. Untuk produk sampai 500MB, flow ini perlu diaudit terhadap limit Cloudflare Workers, timeout, memory, dan UX retry. Master plan terbaik: kembalikan file produk besar ke presigned/multipart direct-to-R2, sementara thumbnail boleh tetap server-mediated.

### P1: Akses library detail belum cukup ketat

`src/pages/api/library.ts` menerima `trx_id` dan mengembalikan transaksi tanpa memastikan transaksi itu milik user aktif. List library sudah dibatasi ke buyer, tetapi detail by `trx_id` perlu ditambah `buyerId = user.id`.

### P1: Balance withdrawal rawan double request

Perhitungan saldo seller mengurangi withdrawal `PROCESSED`, tetapi tidak mengurangi withdrawal `PENDING`. Seller bisa membuat beberapa request pending yang totalnya melebihi saldo tersedia. Saldo withdrawable sebaiknya:

```text
paid net revenue - processed withdrawals - pending withdrawals
```

Hal yang sama perlu dicek untuk affiliate withdrawal.

### P1: Tidak ada test otomatis

Repo hanya punya `test-r2.ts`, bukan test suite. Untuk aplikasi marketplace, test wajib minimal mencakup checkout, webhook, download, auth/session, dan withdrawal.

## 4. Arah Strategis

Strategi terbaik untuk 90 hari ke depan:

1. Stabilkan alur uang dan akses file.
2. Jadikan arsitektur Cloudflare sebagai source of truth.
3. Tambahkan test dan observability supaya refactor aman.
4. Lengkapi fitur seller dan affiliate yang sudah setengah jadi.
5. Baru dorong growth: search, SEO, landing page analytics, coupon, bundle, dan seller storefront.

Jangan scale marketing sebelum P0 selesai. Risiko utama bukan kekurangan fitur, tetapi transaksi palsu, webhook gagal, dan pengalaman pembeli gagal download setelah bayar.

## 5. Master Plan

### Fase 0: Production Hardening

Target: 3-7 hari.

Wajib selesai sebelum launch/marketing serius:

1. Perbaiki `const env = env` di webhook dan download route.
2. Implementasi verifikasi signature webhook Mayar memakai `MAYAR_WEBHOOK_SECRET`.
3. Jalankan transaksi end-to-end: checkout -> webhook PAID -> email/WA -> download token -> library download.
4. Perbaiki authorization `trx_id` di `/api/library`.
5. Perbaiki perhitungan withdrawal supaya pending request ikut mengurangi available balance.
6. Review `wrangler.jsonc`: pindahkan credential sensitif ke Wrangler Secrets, rotasi key yang pernah masuk repository bila ada.
7. Update `AGENTS.md`, `README.md`, dan env docs agar sesuai Astro + D1 + Drizzle + Workers.

Output fase ini:

- Payment dan download bisa dipercaya.
- Dokumentasi tidak lagi salah arah.
- Risiko fraud webhook turun drastis.

### Fase 1: Quality Baseline

Target: 1-2 minggu.

1. Tambahkan `astro check` script dan jalankan di CI.
2. Tambahkan Biome atau ESLint/Prettier untuk format dan lint.
3. Tambahkan Vitest, idealnya dengan Cloudflare Workers/D1 test harness.
4. Buat fixture D1 untuk user, product, transaction, webhook.
5. Test prioritas:
   - webhook menolak signature invalid
   - webhook idempotent untuk event yang sama
   - checkout menghitung subtotal, PPN, platform fee, affiliate commission, net amount
   - download menolak token expired
   - download rate limit 3 kali per 24 jam
   - library tidak bisa membaca transaksi user lain
   - withdrawal tidak bisa melebihi saldo setelah pending withdrawal
6. Tambahkan GitHub Actions: install -> typecheck -> test -> build.

Output fase ini:

- Refactor berikutnya lebih aman.
- Bug finansial bisa tertangkap sebelum deploy.

### Fase 2: Repo Cleanup dan Operasional

Target: 3-5 hari.

1. Putuskan nasib `backup-nextjs/`: pindahkan ke branch arsip, zip release, atau hapus dari repo aktif.
2. Hapus atau pindahkan `Prodig-handoff.zip` dari working tree.
3. Pindahkan `test-r2.ts` ke `scripts/` atau ubah menjadi test resmi.
4. Konsolidasikan docs di `docs/` supaya tidak ada tiga PRD yang saling bertentangan.
5. Tambahkan runbook:
   - deploy
   - rollback
   - D1 migration
   - D1 backup/export
   - R2 CORS/public bucket setup
   - Mayar webhook setup
6. Tambahkan observability standar:
   - structured logs untuk checkout/webhook/download
   - alert untuk webhook error dan email/WA failure
   - dashboard transaksi pending terlalu lama

Output fase ini:

- Repo lebih mudah di-maintain.
- Operasional tidak bergantung pada ingatan developer.

### Fase 3: Seller dan Affiliate Completion

Target: 2-4 minggu.

Fokus: manfaatkan schema dan logic yang sudah ada.

1. Affiliate dashboard:
   - lihat kode referral
   - generate link produk dengan `?ref=`
   - total referral, total earnings, pending payout
   - request affiliate withdrawal
2. Tracking referral:
   - simpan `ref` dari URL ke cookie
   - atribusi saat checkout
   - cegah self-referral
   - expiry referral cookie yang jelas
3. Seller product management:
   - edit metadata produk
   - hide/unhide produk
   - kebijakan perubahan file setelah ada pembelian
4. Seller profile/storefront:
   - slug seller
   - bio, avatar, social link
   - halaman publik semua produk seller
5. Withdrawal detail:
   - status history
   - notes admin
   - breakdown transaksi yang membentuk saldo

Output fase ini:

- Seller dan affiliate punya workflow lengkap.
- Platform mulai punya retention engine, bukan hanya marketplace katalog.

### Fase 4: Buyer Experience dan Growth

Target: 3-6 minggu.

1. SEO teknis:
   - dynamic meta title/description
   - Open Graph image
   - canonical URL
   - sitemap
   - robots.txt
   - JSON-LD Product untuk product detail
2. Discovery:
   - pagination katalog
   - filter harga
   - filter rating
   - related products
   - search lebih baik dari `LIKE` sederhana
3. Trust:
   - seller badge
   - verified buyer badge untuk review
   - report product
   - refund/dispute policy page
4. Conversion:
   - coupon/voucher
   - bundle product
   - abandoned checkout reminder
   - landing page CTA analytics
5. Legal/public pages:
   - Terms
   - Privacy Policy
   - Refund Policy
   - Contact/Support

Output fase ini:

- Traffic organik dan paid traffic punya landing yang lebih siap.
- Buyer trust naik.
- Seller punya alat promosi yang lebih kuat.

### Fase 5: Scale dan Automation

Target: setelah transaksi nyata mulai konsisten.

1. Pindahkan watermark PDF berat ke queue/background flow.
2. Evaluasi Cloudflare Queues untuk post-payment jobs:
   - watermark
   - email
   - WhatsApp
   - analytics event
3. Tambahkan file versioning:
   - seller upload versi baru
   - buyer lama mendapat akses update
4. Pertimbangkan Cloudflare Stream untuk video course agar tidak sekadar download MP4.
5. Arsipkan `webhook_logs` dan `download_logs` lama ke R2.
6. Evaluasi D1 limits dan migrasi ke Postgres/Hyperdrive hanya jika volume write mulai menekan D1.

Output fase ini:

- Sistem lebih tahan volume.
- Produk video/course bisa diproteksi lebih baik.
- Database tetap sehat.

## 6. Rekomendasi Urutan Eksekusi Minggu Ini

Jika saya yang memimpin eksekusi, urutannya:

1. Fix runtime bug `env` di webhook/download.
2. Tambah Mayar webhook signature verification.
3. Test manual transaksi sukses end-to-end.
4. Fix authorization `/api/library?trx_id=...`.
5. Fix saldo withdrawal agar pending ikut dihitung.
6. Update `AGENTS.md` dan `README.md` ke stack aktual.
7. Tambah minimal test untuk webhook, download, library, withdrawal.

Ini urutan paling defensible karena langsung melindungi uang, file pembeli, dan kredibilitas platform.

## 7. North Star Produk

Prodig.id sebaiknya tidak hanya menjadi "tempat upload dan checkout". Positioning yang lebih kuat:

> Infrastruktur jualan produk digital untuk kreator Indonesia: marketplace, landing page, pembayaran lokal, pengiriman file aman, affiliate, dan anti-pembajakan dalam satu tempat.

Fitur yang paling layak dijadikan moat:

1. Landing page builder per produk.
2. Affiliate system yang mudah dipakai micro-influencer.
3. Watermark dan delivery aman untuk file digital.
4. Pembayaran lokal yang familiar untuk pembeli Indonesia.
5. Seller dashboard yang fokus pada penjualan, bukan sekadar daftar produk.

## 8. Kesimpulan

Prodig.id sudah punya fondasi produk yang menarik. Langkah berikutnya bukan rebuild, melainkan hardening dan konsolidasi.

Jangan mulai dari fitur baru. Mulai dari payment/download reliability, webhook security, docs yang benar, dan test untuk alur finansial. Setelah itu, dorong seller/affiliate dan landing page analytics sebagai growth engine utama.

