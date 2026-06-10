# 🪐 Insight Antigravity: Master-Plan Pengembangan Prodig.id

Dokumen ini menyajikan analisis arsitektur, kesenjangan sistem saat ini (gaps), dan cetak biru (roadmap) strategis untuk mengembangkan **Prodig.id** dari MVP (*Minimum Viable Product*) menjadi platform marketplace produk digital kelas dunia yang siap berskala (*production-ready*).

---

## 1. Analisis Status Proyek & Arsitektur Saat Ini

Prodig.id telah sukses bermigrasi dari arsitektur monolitik Next.js tradisional ke arsitektur **Edge-Native Serverless** berbasis Cloudflare.

### Karakteristik Stack:
- **Framework:** Astro 6.x dengan `@astrojs/cloudflare` adapter. Mengaktifkan *Hybrid Rendering* (`prerender = false` pada halaman dinamis/API).
- **Database:** Drizzle ORM berjalan di atas **Cloudflare D1** (SQLite serverless database).
- **Storage:** **Cloudflare R2** dengan presigned URLs untuk upload/download, menghemat bandwidth server dengan *direct-to-client transfer*.
- **Styling:** Tailwind CSS v4.3.0 menggunakan modern CSS-first `@theme` configuration di `src/styles/global.css`.
- **Integrasi Pihak Ketiga:**
  - Payment Gateway: **Mayar.id** (Invoice API & Webhook callback).
  - Transactional Email: **Resend** (untuk notifikasi pengiriman file).
  - WhatsApp Notifications: **Conviq** (Chatwoot API client) untuk notifikasi pembeli, penjual, dan affiliate.

### 🌟 Kelebihan Utama Arsitektur Ini:
1. **Kecepatan Edge:** Halaman dinamis dirender di serverless functions terdekat dengan user, memangkas TTFB (*Time to First Byte*).
2. **Biaya Operasional Rendah (Zero Cold Starts):** D1 & R2 pada infrastruktur Cloudflare memiliki *pricing model* yang sangat kompetitif dibandingkan database PostgreSQL tradisional dan AWS S3.
3. **Keamanan File Maksimal:** Penggunaan *presigned URLs* jangka pendek (5 menit) mencegah kebocoran tautan mentah R2. File PDF juga dilengkapi *automatic watermark* sebelum dikirim.

---

## 2. Kesenjangan Fungsional (MVP Gaps)

Meskipun sistem inti sudah berjalan (Checkout, Upload, Admin Moderasi, LP Builder), terdapat beberapa kesenjangan kritis yang harus segera diperbaiki sebelum peluncuran komersial:

### A. Ekosistem Affiliate yang Pincang (Gaps Terbesar)
- **Database:** Skema database (`affiliates`, `affiliateWithdrawals`, transaksi dengan referensi komisi) sudah siap.
- **Webhook & Checkout:** Logika pembagian komisi sudah berjalan otomatis saat checkout dan pembayaran sukses di webhook.
- **Kesenjangan (Gaps):** **Sama sekali tidak ada UI untuk pengguna.**
  - Pengguna tidak bisa mendaftar sebagai affiliate.
  - Pengguna tidak bisa melihat kode rujukan mereka atau menghasilkan tautan referensi.
  - Pengguna tidak bisa memantau statistik penghasilan komisi.
  - Pengguna tidak bisa mengajukan penarikan dana khusus komisi affiliate (hanya bisa dikelola via admin API).

### B. Otomatisasi Payout (Disbursement)
- **Proses Saat Ini:** Penarikan dana (withdrawals) oleh seller dan affiliate bersifat manual. Admin menyetujui di dasbor, lalu mentransfer manual via bank atau portal pembayaran eksternal, dan menandai status sebagai `PROCESSED`.
- **Dampak:** Proses ini lambat, berisiko kesalahan input, dan tidak skalabel saat volume penarikan harian melonjak.

### C. Keterbatasan Landing Page Builder
1. **Tata Letak Kaku:** Desain section (Hero, Features, Testi, FAQ) terkunci dalam struktur tetap. Penjual tidak dapat menyembunyikan atau mengubah urutan tampilannya.
2. **Analisis Transaksi & Trafik:** Kreator tidak mengetahui performa konversi halaman mereka karena `salesCount` dan `viewCount` hanya berupa angka statis.
3. **Custom HTML/Header Injection:** Penting bagi kreator profesional untuk memasukkan Meta Pixel, Google Analytics, atau TikTok Pixel di landing page mereka untuk optimasi iklan.

### D. Skalabilitas & Limitasi Runtime
1. **Cloudflare Worker Memory Limit (128MB):** Proses pembubuhan watermark PDF menggunakan `pdf-lib` berjalan di dalam memori Worker. Jika file PDF berukuran sangat besar (misal >50MB dengan banyak gambar), hal ini berpotensi memicu *Out Of Memory* (OOM) pada Worker.
2. **Keterbatasan SQLite (D1):** Sebagai SQLite, D1 sangat cepat untuk operasi baca, namun operasi tulis konkuren yang sangat tinggi (misal flash sale) berisiko memicu lock database.

---

## 3. Master-Plan & Roadmap Pengembangan (4 Fase)

### 📅 Fase 1: Kelengkapan Ekosistem Affiliate & Akun (Paling Mendesak / Quick Wins)
*Fokus: Mengaktifkan fungsionalitas affiliate yang saat ini sudah setengah jalan di database & webhook.*

1. **Dashboard Khusus Affiliate (`/affiliate`):**
   - Halaman registrasi untuk pembeli/seller agar bisa menjadi affiliate.
   - Panel monitoring: Total Klik, Total Referral, Pendapatan Kotor, dan Komisi yang Dapat Ditarik.
   - Daftar tautan rujukan yang siap disalin (format: `prodig.id/products/[id]?ref=[code]`).
2. **Formulir Penarikan Komisi Affiliate:**
   - Halaman khusus bagi affiliate untuk meminta penarikan dana ke rekening bank terdaftar.
   - Pencatatan otomatis ke tabel `affiliate_withdrawals`.
3. **Penyempurnaan Profil Akun & Data Bank:**
   - Menambahkan form input Rekening Bank (`bankName`, `bankAccount`, nama pemilik) pada profil user di dashboard (saat ini data sudah ada di model `User` tetapi belum ada UI pengaturannya).

### 📅 Fase 2: Otomatisasi Finansial & Operasional
*Fokus: Mengurangi beban administrasi platform (Admin Ops) seiring meningkatnya transaksi.*

1. **Integrasi Mayar Payouts (Disbursement API):**
   - Menghubungkan tombol "Approve" penarikan dana di panel admin dengan API transfer otomatis Mayar.
   - Mengurangi risiko kesalahan transfer manual dan mempercepat pencairan dana bagi seller & affiliate (real-time).
2. **Sistem Pajak Otomatis (PPN & PPh):**
   - Sistem perpajakan e-commerce otomatis (PPN 11%).
   - Pemotongan PPh 21/23 atas komisi kreator secara otomatis untuk kepatuhan hukum di Indonesia.
3. **Auto-Moderasi Konten Berbasis AI:**
   - Memanfaatkan Cloudflare Workers AI untuk menganalisis deskripsi produk yang di-upload.
   - Mendeteksi pelanggaran hak cipta, spam, atau konten tidak layak sebelum masuk ke antrean persetujuan admin manual.

### 📅 Fase 3: Visual & UX Optimizer (LP Builder & Analytics v2)
*Fokus: Meningkatkan performa penjualan kreator dan fleksibilitas kustomisasi.*

1. **Peningkatan Fitur LP Builder:**
   - Kustomisasi font (pilihan Google Fonts populer).
   - Pengaturan ulang tata letak (Section Reordering) menggunakan kontrol sederhana (atas/bawah).
   - Upload media pendukung (galeri gambar produk atau video embed dari YouTube/Vimeo).
2. **Integrasi Analytics & Grafik Visual:**
   - Menampilkan grafik performa penjualan harian/mingguan di dashboard kreator menggunakan SVG ringan atau chart library.
   - Metrik penting: *Page Views*, *Unique Visitors*, *Add to Cart*, *Purchase*, dan *Conversion Rate*.
3. **Pelacakan Pixel Kustom (Conversion Tracking):**
   - Form input ID Meta Pixel, Google Analytics (GA4), dan TikTok Pixel di LP Builder.
   - Inject script pelacakan secara otomatis pada halaman `/lp/[slug]` untuk membantu kreator memantau efektivitas iklan berbayar mereka.

### 📅 Fase 4: Skalabilitas File & Distribusi Premium
*Fokus: Mengakomodasi produk video dan mengamankan pengiriman file besar.*

1. **Integrasi Cloudflare Stream untuk Produk Kelas Video:**
   - Menghindari pengunduhan langsung file video dengan memutarnya langsung di platform menggunakan pemutar video terenkripsi (Signed URL tokens).
   - Mencegah pembajakan video tutorial/kursus secara masif.
2. **Sistem File Versioning & Notifikasi Pembaruan:**
   - Kreator dapat mengunggah versi baru dari file produk digital mereka.
   - Pengiriman email/WA otomatis kepada semua pembeli terdahulu untuk memberi tahu adanya update versi produk beserta tautan unduhan baru.
3. **Queue-Based Watermarking:**
   - Memindahkan proses watermarking PDF dari request-response cycle utama ke **Cloudflare Queues** atau asynchronous background task.
   - Mencegah error timeout/memori pada Worker ketika memproses file PDF berukuran raksasa.

---

## 4. Rekomendasi Mitigasi Risiko Teknis

### A. Migrasi Database ke Cloudflare Hyperdrive / Neon (Jika Skala Besar)
Meskipun Cloudflare D1 sangat praktis, ia memiliki batas kapasitas penyimpanan tertentu dan latensi pada operasi tulis konkuren tinggi. Jika Prodig.id mencapai jutaan transaksi bulanan, disarankan bermigrasi ke PostgreSQL (misal Neon / Supabase) dengan memanfaatkan **Cloudflare Hyperdrive** untuk pooling koneksi berkecepatan tinggi dari edge.

### B. Optimalisasi Ukuran Berkas R2 (Multipart Upload)
Untuk mengunggah berkas produk berukuran hingga 500MB dari peramban secara stabil tanpa membentur batasan timeout gateway:
- Terapkan **Multipart Upload** pada R2 client-side uploader.
- Potong file menjadi bagian kecil (misal per 5MB) dan gabungkan kembali di R2 setelah semua bagian terunggah dengan sukses.

### C. Backup Data & Pengarsipan Log Transaksi
Tabel `webhook_logs` dan `download_logs` akan berkembang sangat cepat. Disarankan memiliki fungsi pembersihan (cron job) bulanan untuk mengarsipkan log lama ke dalam bucket cold-storage R2 guna menjaga ukuran database D1 tetap optimal dan performa kueri tetap cepat.
