-- Categories Seed
INSERT INTO categories (id, name, slug, description) VALUES
('cat1', 'Template & Spreadsheet UMKM', 'template-umkm', 'Template laporan keuangan, invoice, SOP, KPI untuk UMKM'),
('cat2', 'Template Akademik', 'template-akademik', 'Template skripsi, jurnal, presentasi, CV, proposal'),
('cat3', 'E-Book', 'ebook', 'Buku digital berbagai kategori'),
('cat4', 'Course & Tutorial', 'course', 'Video course dan tutorial'),
('cat5', 'Preset & Filter', 'preset', 'Preset Lightroom, filter, LUT'),
('cat6', 'Font & Typography', 'font', 'Font dan asset tipografi'),
('cat7', 'Lainnya', 'lainnya', 'Produk digital lainnya')
ON CONFLICT(id) DO NOTHING;

-- Demo Users Seed
-- Password is 'password123' (hashed with bcrypt)
INSERT INTO users (id, name, email, password, role, whatsapp, created_at, updated_at) VALUES
('seller1', 'Prodig Studio', 'seller@prodig.id', '$2a$10$eE.rWwP/B7Hw28g1Jz2Q3uZ5F9eP3e2Wf1yE9uH8x4U5w6q7r8s9t', 'SELLER', '6281234567890', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('buyer1', 'John Doe', 'buyer@prodig.id', '$2a$10$eE.rWwP/B7Hw28g1Jz2Q3uZ5F9eP3e2Wf1yE9uH8x4U5w6q7r8s9t', 'BUYER', NULL, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('admin1', 'Admin Prodig', 'admin@prodig.id', '$2a$10$eE.rWwP/B7Hw28g1Jz2Q3uZ5F9eP3e2Wf1yE9uH8x4U5w6q7r8s9t', 'ADMIN', NULL, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000)
ON CONFLICT(id) DO NOTHING;

-- Demo Products Seed
INSERT INTO products (id, seller_id, title, description, price, category_id, file_key, file_name, file_size, thumbnail, status, sales_count, view_count, created_at, updated_at) VALUES
('prod1', 'seller1', 'Template Laporan Keuangan UMKM Excel', 'Template laporan keuangan lengkap untuk UMKM. Sudah include formula otomatis, grafik, dan panduan penggunaan. Cocok untuk pemula yang ingin mengatur keuangan bisnis dengan rapi. File berupa Excel (.xlsx) yang bisa langsung digunakan.', 50000, 'cat1', 'demo/template-laporan-keuangan.xlsx', 'template-laporan-keuangan.xlsx', 245760, 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop', 'APPROVED', 12, 145, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('prod2', 'seller1', 'Template Skripsi Format APA Lengkap', 'Template skripsi dengan format APA 7th edition. Include cover, daftar isi otomatis, format sitasi, daftar pustaka, dan bab-bab standar. Compatible dengan Microsoft Word dan Google Docs.', 35000, 'cat2', 'demo/template-skripsi-apa.docx', 'template-skripsi-apa.docx', 512000, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=600&fit=crop', 'APPROVED', 28, 312, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('prod3', 'seller1', 'E-Book: Panduan Memulai Bisnis Online', 'Panduan lengkap memulai bisnis online dari nol. Dari riset pasar, branding, hingga strategi marketing digital. 120 halaman praktis dan actionable. Bonus: checklist dan template tambahan.', 75000, 'cat3', 'demo/panduan-bisnis-online.pdf', 'panduan-bisnis-online.pdf', 5242880, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop', 'APPROVED', 45, 520, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('prod4', 'seller1', 'Course: Edit Foto Profesional dengan Lightroom', 'Video course 5 jam belajar edit foto dengan Adobe Lightroom. Dari basic adjustment, color grading, hingga batch editing untuk wedding photographer. Include 50 preset gratis.', 150000, 'cat4', 'demo/course-lightroom.zip', 'course-lightroom.zip', 209715200, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop', 'APPROVED', 8, 89, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('prod5', 'seller1', '50 Preset Lightroom Moody Tone', 'Koleksi 50 preset Lightroom dengan moody tone aesthetic. Cocok untuk portrait, street photography, dan travel. Compatible dengan Lightroom Mobile & Desktop.', 25000, 'cat5', 'demo/50-preset-moody.zip', '50-preset-moody.zip', 10485760, 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=800&h=600&fit=crop', 'APPROVED', 67, 430, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('prod6', 'seller1', 'Font Bundle: Display Sans Serif Modern', 'Koleksi 10 font display sans serif modern untuk branding, logo, dan headline. Include commercial license. Format OTF dan TTF.', 45000, 'cat6', 'demo/font-bundle-sans.zip', 'font-bundle-sans.zip', 15728640, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop', 'APPROVED', 15, 210, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000)
ON CONFLICT(id) DO NOTHING;
