# Analisis PRD Prodig.id

**Reviewer:** Senior Product Strategist
**Tanggal Review:** 27 Mei 2026
**Dokumen yang Direview:** PRD Prodig.id v1.0 (27 Mei 2026)
**Status Akhir:** Belum siap handoff ke engineering

---

## 1. RINGKASAN EKSEKUTIF

Dokumen ini mengusulkan pembangunan sebuah marketplace produk digital lokal yang menargetkan kreator Indonesia (penjual e-book, template, course, preset) dan konsumennya, dengan posisi sebagai layer tepercaya di atas perilaku jual-beli yang saat ini terjadi secara informal melalui Instagram dan WhatsApp. Justifikasi waktunya bersandar pada dua premis: pivot Bukalapak ke virtual goods dan keterbatasan TikTok Shop dalam delivery file, yang diklaim membuka celah kategori. Target operasionalnya agresif: MVP dalam 30 hari, 1.000 listing dalam 90 hari, dengan tech stack berbasis Next.js, Supabase, R2/S3, dan Mayar.id sebagai payment gateway. Secara substansi, dokumen ini lebih dekat ke *founding memo* atau *project brief* daripada PRD operasional yang bisa langsung dieksekusi oleh tim engineering.

**Catatan awal:** Dokumen memiliki struktur naratif yang cukup, namun beberapa elemen kritikal PRD (persona, user stories, acceptance criteria, validasi pasar) tidak hadir atau hanya hadir parsial. PRD ini **belum siap untuk handoff penuh ke engineering**, tetapi cukup matang untuk dilanjutkan ke iterasi review berikutnya.

---

## 2. KELENGKAPAN DOKUMEN

| Elemen | Status | Catatan |
|---|---|---|
| Problem Statement | Parsial | Ada narasi masalah di Executive Summary, tapi tidak didukung data, riset, atau user interview. Klaim "messy, no discovery, no trust system" adalah asumsi, bukan temuan tervalidasi. |
| User Persona | Tidak Ada | Tidak ada deskripsi konkret siapa "kreator Indonesia" itu (segmen umur, kategori produk dominan, volume penjualan saat ini) maupun siapa "pembeli" (demografi, motivasi pembelian, harga rata-rata yang biasa dibayar). |
| Goals dan Success Metrics | Ada | Tabel di bagian 8 cukup jelas. Namun North Star Metric "Weekly Active Transactions" tidak disertai target spesifik per minggu, hanya target kumulatif 30/90 hari. |
| Scope dan Out-of-Scope | Ada | Tabel di 3.1 dan list 3.2 cukup eksplisit. Ini termasuk bagian terkuat dokumen. |
| User Stories / Use Cases | Tidak Ada | Bagian 4 (User Flow) adalah diagram alur, bukan user story. Tidak ada format "As a [persona], I want [action], so that [benefit]" atau Job-To-Be-Done. Engineer tidak punya panduan edge case. |
| Acceptance Criteria | Tidak Ada | Tidak ada satu pun fitur P0 yang memiliki kriteria penerimaan terukur. Contoh: "Instant Delivery" tidak menjelaskan SLA (berapa detik dari payment sukses sampai link muncul?), state failure, atau perilaku jika file lebih dari 500MB. |
| Dependensi Teknis | Parsial | Tech stack disebutkan di tabel 5, namun dependensi eksternal kritis (Mayar.id webhook reliability, R2 limit upload, Vercel body size limit untuk file 500MB) tidak dianalisis. |
| Timeline | Ada | Bagian 7 menyajikan timeline per minggu/bulan, namun tidak dipecah per fitur dengan ownership engineer. |
| Validasi Pasar / Analisis Kompetitor | Tidak Ada | **Kritikal.** Dokumen menyebut Bukalapak, Shopee, Gumroad, TikTok Shop tapi sama sekali tidak menyinggung kompetitor langsung di Indonesia: Lynk.id, Karya Karsa, Saweria, Trakteer, Mayoo. Ini adalah blind spot serius. |
| Legal & Compliance | Tidak Ada | Tidak ada pembahasan PPN PMSE/e-commerce 11%, UU PDP (Perlindungan Data Pribadi), kebijakan konten (apa yang boleh/tidak boleh dijual), atau Terms of Service kerangka. |
| Unit Economics | Parsial | Komisi 10-15% disebut, tapi tidak ada model biaya (cost per transaction Mayar.id, storage cost per GB, CAC, gross margin). |
| Team & Resource | Tidak Ada | Tidak disebutkan berapa engineer, designer, atau budget yang diasumsikan untuk eksekusi 30 hari. |

**Ringkasan:** 4 elemen Ada, 4 Parsial, 4 Tidak Ada. Tingkat kelengkapan operasional sekitar **40-50%**.

---

## 3. KUALITAS PROBLEM STATEMENT

**Nilai: 4/10**

### Dasar Penilaian

**Yang sudah ada (poin positif):**

- Ada artikulasi target user (kreator dan pembeli) walaupun belum disegmentasi.
- Ada hipotesis solusi yang spesifik (marketplace dengan instant delivery + review + payment lokal).
- Ada timing rationale (klaim soal Bukalapak dan TikTok Shop).

**Yang membuat skor rendah:**

1. **Nol validasi empiris.** Tidak ada satu pun referensi ke: jumlah kreator yang berjualan di Instagram saat ini, GMV transaksi via DM/WhatsApp, hasil wawancara dengan kreator atau pembeli, atau survei kuantitatif. Klaim "messy, no discovery, no trust system" adalah opini founder, bukan finding tervalidasi.

2. **Klaim "celah pasar terbuka lebar" tidak didukung evidence.** Faktanya, ekosistem ini sudah cukup ramai di Indonesia: Lynk.id (link-in-bio + digital product, jutaan pengguna), Karya Karsa (creator-direct), Saweria, Trakteer, Mayoo. Tidak menyinggung mereka adalah problem statement yang dibangun di atas asumsi yang salah, bukan riset.

3. **Klaim "Bukalapak baru pivot ke virtual goods (Jan 2025)" perlu diverifikasi.** Jika ini akurat, justru menunjukkan kompetitor besar masuk kategori adjacent, bukan menguatkan kasus untuk pemain baru.

4. **Masalah tidak terkuantifikasi.** Kalimat "Pembeli sulit cari, bandingkan, dan beli aman" tidak punya ukuran. Berapa persen pembeli yang gagal bertransaksi karena alasan ini? Berapa lama rata-rata mereka mencari? Tanpa angka, tidak ada baseline untuk mengukur apakah solusi berhasil.

5. **Asumsi "trust" sebagai diferensiator tidak dibuktikan.** Klaim bahwa pembeli butuh "review verified" dan "preview produk" adalah hipotesis. Tidak ada data yang menunjukkan bahwa ini adalah barrier utama (bisa jadi barrier utamanya sebenarnya adalah harga, atau metode pembayaran, atau habit).

### Syarat Naik ke Skor 7-8

Untuk naik ke skor 7-8, problem statement perlu:

- Minimal 10-20 wawancara kreator dan pembeli yang dirangkum dalam insight terstruktur.
- Estimasi market size lokal (TAM/SAM/SOM) berdasarkan data publik.
- Analisis kompetitor langsung dengan tabel fitur vs gap.
- Quantified pain point ("X dari Y kreator gagal closing karena Z").

---

## 4. AMBIGUITAS KRITIS

| Kutipan | Mengapa Ini Masalah | Pertanyaan Klarifikasi |
|---|---|---|
| "Commission 10-15% per transaksi" | Range 5 persen point berdampak signifikan pada unit economics dan posisi kompetitif. Lynk.id menggratiskan direct sale; jika Prodig charge 15%, kemungkinan kreator menolak. Engineer perlu satu angka untuk hardcode/config. | Berapa angka final untuk launch? Apakah tier-based per kategori atau per volume seller? Apakah ada fee tambahan dari Mayar.id yang ditanggung seller atau platform? |
| "Pembayaran sukses = buyer dapat link download (expired 24 jam)" | Apakah pembeli bisa re-download setelah 24 jam? Jika tidak, ini akan menyebabkan komplain massif (pembeli kehilangan akses ke produk yang sudah dibayar). Jika ya, kapan link benar-benar dimatikan? Apakah ada library akses permanen? | Apakah ada konsep "user library" di mana pembeli bisa akses produk seumur hidup? Berapa kali maksimum re-download? Bagaimana mencegah link disebar tanpa membatasi pembeli sah? |
| "Verifikasi manual v1 (tidak perlu KYC kompleks dulu)" + "curated marketplace" | Dua klaim ini saling bertentangan secara semantik. "Curated" implikasinya ketat dan selektif; "verifikasi manual tanpa KYC kompleks" implikasinya longgar. Tim engineering, ops, dan legal akan menafsirkan berbeda. | Apa kriteria penerimaan seller di v1? Siapa yang melakukan verifikasi manual (founder, ops team, AI)? Berapa SLA aproval seller? Apa konsekuensi jika konten illegal lolos? |
| "Money-back guarantee (Fase 1: manual refund via admin)" | Untuk produk digital yang sudah didownload, refund secara teknis tidak bisa "menarik kembali" produk. Kebijakan ini berisiko abuse (download lalu minta refund). Tidak ada policy detail. | Dalam kondisi apa refund di-grant (file korup, salah produk, kualitas di bawah ekspektasi)? Apa window waktu request refund? Apakah ada blacklist buyer yang abuse? Apa fallback teknis untuk mencegah keep + refund? |
| "Target 90 hari: 1.000 produk listing, 300 transaksi, GMV Rp 150 juta" | Matematika tidak konsisten. GMV 150 juta / 300 transaksi = Rp 500.000 per transaksi rata-rata. Ini jauh di atas rata-rata harga produk digital di Indonesia (e-book biasanya Rp 25-75 ribu, template Rp 50-150 ribu, course Rp 200-500 ribu hanya untuk tier premium). Apakah asumsi mix produk realistis? | Apa asumsi distribusi kategori produk yang menghasilkan AOV Rp 500.000? Jika asumsi salah, target GMV harus direvisi atau strategi acquisition harus diarahkan ke produk high-ticket. |

**Catatan tambahan (di luar top 5):** "MVP live dalam 30 hari" mencakup seller onboarding, product upload dengan file 500MB, Mayar.id integration, search, dan implisit review system + dashboard (P1 di tabel, tapi muncul di timeline minggu 1-4). Untuk tim satu engineer fullstack ini tidak feasible; untuk tim 3-4 orang ketat tapi mungkin. Tanpa kejelasan team size, "30 hari" adalah angka aspiratif, bukan komitmen yang bisa diukur.

---

## 5. RISIKO EKSEKUSI

### Risiko 1: Salah baca lanskap kompetitif Indonesia

**Kategori:** Product-Market Fit

Dokumen membingkai kompetisi terhadap Shopee, Tokopedia, Gumroad, TikTok Shop, padahal kompetitor riil adalah Lynk.id, Karya Karsa, Saweria, dan Trakteer yang sudah punya basis kreator besar. Jika diferensiasi Prodig.id hanya "marketplace lokal dengan Mayar.id", semua kompetitor di atas juga melakukan hal serupa. Tanpa wedge yang tajam, akuisisi seller akan mahal dan retention rendah.

### Risiko 2: Asumsi migrasi kreator dari Instagram tidak realistis

**Kategori:** Product-Market Fit

Mitigasi yang ditawarkan ("complement, bukan replacement") secara halus mengakui masalah ini, tapi tidak menyelesaikannya. Kreator yang sudah punya audience di Instagram tidak punya insentif kuat untuk repotin diri upload di platform baru kecuali ada *demand-side* yang sudah jadi. Ini classic chicken-and-egg marketplace problem yang tidak dibahas strateginya.

### Risiko 3: File piracy dan resell ilegal

**Kategori:** Teknis + Bisnis

Mitigasi "download link expired 24 jam" sama sekali tidak mencegah piracy. Pembeli download sekali, lalu file fisik bisa disebar ke ribuan orang. Watermark PDF baru di Fase 2. Tanpa DRM atau enkripsi konten serius, seller premium (yang menjual course atau produk high-ticket) tidak akan percaya platform. Ini berdampak langsung ke kualitas listing.

### Risiko 4: Kompleksitas Mayar.id integration + 500MB file upload

**Kategori:** Teknis

Vercel memiliki batas body size untuk serverless function (4.5MB di Hobby, 100MB di Pro). File 500MB tidak bisa di-upload langsung lewat Next.js API route standar. Diperlukan presigned URL upload langsung ke R2/S3, multipart upload, dan dedicated upload service. Belum lagi webhook Mayar.id yang perlu retry mechanism, idempotency, dan reconciliation. Salah satu dari ini terlewat = transaksi failed atau double-charge. Estimasi 30 hari menjadi sangat tipis.

### Risiko 5: Compliance pajak dan data tidak dipersiapkan

**Kategori:** Bisnis + Legal

PPN e-commerce 11% di Indonesia berlaku untuk transaksi platform. Tidak jelas siapa yang remit pajak (platform atau seller), bagaimana invoicing, dan bagaimana withholding tax untuk seller individual. UU PDP juga mengatur pengumpulan data pembeli (email, nomor HP, transaksi). Tanpa kerangka legal sejak awal, platform berisiko dipanggil regulator setelah scaling, dan refactoring sistem pajak/data di belakang sangat mahal.

---

## 6. REKOMENDASI PRIORITAS

### Prioritas 1: Lakukan validasi pasar dan analisis kompetitor terstruktur sebelum coding

**Dampak:** Tanpa ini, semua keputusan downstream (diferensiasi produk, pricing komisi, urutan fitur) dibuat di atas asumsi yang tidak teruji.

**Action konkret:**

- Lakukan 15-20 wawancara dalam 1 minggu: 10 kreator (5 yang sudah pakai Lynk.id/Karya Karsa, 5 yang masih full Instagram), 10 pembeli produk digital.
- Bangun tabel kompetitif vs Lynk.id, Karya Karsa, Saweria, Trakteer dengan kolom: komisi, fitur delivery, sistem review, kategori produk, perkiraan jumlah seller aktif.
- Tentukan satu wedge tajam yang tidak dimiliki kompetitor (misalnya: kategori vertikal seperti "course Islam profesional", atau fitur unik seperti "split payment kolaborasi seller").
- Update bagian Executive Summary dan Differentiator dengan finding ini.

### Prioritas 2: Tulis user persona, user stories, dan acceptance criteria untuk setiap fitur P0

**Dampak:** Engineering tidak bisa eksekusi tanpa kriteria penerimaan. Saat ini PRD mengasumsikan banyak hal yang akan diisi oleh engineer secara default, dan asumsi ini akan berbeda-beda per developer.

**Action konkret:**

- Definisikan minimal 2 persona seller dan 2 persona buyer (misalnya: Seller A = guru yang jual template RPP, Seller B = ilustrator yang jual font; Buyer A = mahasiswa cari template skripsi, Buyer B = UMKM cari template Canva).
- Untuk setiap fitur P0 di tabel 3.1, tulis: (a) user story format JTBD, (b) acceptance criteria terukur, (c) edge case dan failure mode.
- Contoh untuk "Instant Delivery": "Setelah Mayar.id webhook payment success diterima, sistem harus menghasilkan link download dalam <5 detik, mengirim notifikasi email + WhatsApp ke buyer, dan menyimpan log transaksi. Jika webhook gagal 3x, masuk ke dead letter queue untuk admin review."

### Prioritas 3: Klarifikasi commission structure, refund policy, dan kerangka compliance (PPN + UU PDP)

**Dampak:** Tiga hal ini secara langsung memblokir launch karena memengaruhi: kontrak seller, terms of service, alur akuntansi, dan struktur database. Tidak bisa "diiterasi nanti" tanpa refactor besar.

**Action konkret:**

- Tetapkan satu angka komisi launch (misalnya: 10% flat untuk Fase 1, dengan promosi "0% untuk 5 transaksi pertama"). Update di PRD dan model proyeksi GMV.
- Tulis refund policy 1 halaman: kondisi grant, window waktu (saran: 7 hari sejak download dengan bukti file tidak sesuai), prosedur, blacklist mechanism.
- Konsultasi dengan konsultan pajak atau legal untuk memastikan: (a) status PPN PMSE/e-commerce, (b) struktur invoice ke seller, (c) data privacy compliance UU PDP. Tambahkan section "Legal & Compliance" sebagai bab 11 di PRD.

---

## Kesimpulan Akhir

**Status PRD:** Belum siap handoff ke engineering.

**Estimasi effort revisi:** 5-7 hari kerja terfokus untuk mencapai status "ready for build".

**Rekomendasi:** Selesaikan revisi Prioritas 1-3 terlebih dahulu sebelum kickoff sprint pertama. Tanpa fondasi ini, eksekusi 30 hari akan menghasilkan produk yang dibangun di atas asumsi yang salah, dan iterasi pasca-launch akan menjadi rework yang mahal.
