import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed Categories
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

  // Seed Demo Seller
  const hashedPassword = await bcrypt.hash('password123', 10)
  const seller = await prisma.user.upsert({
    where: { email: 'seller@prodig.id' },
    update: {},
    create: {
      name: 'Prodig Studio',
      email: 'seller@prodig.id',
      password: hashedPassword,
      role: 'SELLER',
      whatsapp: '6281234567890',
    },
  })
  console.log('Seeded demo seller:', seller.email)

  // Seed Demo Buyer
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@prodig.id' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'buyer@prodig.id',
      password: hashedPassword,
      role: 'BUYER',
    },
  })
  console.log('Seeded demo buyer:', buyer.email)

  // Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@prodig.id' },
    update: {},
    create: {
      name: 'Admin Prodig',
      email: 'admin@prodig.id',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('Seeded admin:', admin.email)

  // Get category IDs for seeding products
  const catMap = await prisma.category.findMany()
  const getCatId = (slug: string) => catMap.find(c => c.slug === slug)?.id ?? catMap[0].id

  // Seed Dummy Products
  const products = [
    {
      title: 'Template Laporan Keuangan UMKM Excel',
      description: 'Template laporan keuangan lengkap untuk UMKM. Sudah include formula otomatis, grafik, dan panduan penggunaan. Cocok untuk pemula yang ingin mengatur keuangan bisnis dengan rapi. File berupa Excel (.xlsx) yang bisa langsung digunakan.',
      price: 50000,
      categorySlug: 'template-umkm',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop',
      fileKey: 'demo/template-laporan-keuangan.xlsx',
      fileName: 'template-laporan-keuangan.xlsx',
      fileSize: 245760,
      status: 'APPROVED' as const,
      salesCount: 12,
      viewCount: 145,
    },
    {
      title: 'Template Skripsi Format APA Lengkap',
      description: 'Template skripsi dengan format APA 7th edition. Include cover, daftar isi otomatis, format sitasi, daftar pustaka, dan bab-bab standar. Compatible dengan Microsoft Word dan Google Docs.',
      price: 35000,
      categorySlug: 'template-akademik',
      thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=600&fit=crop',
      fileKey: 'demo/template-skripsi-apa.docx',
      fileName: 'template-skripsi-apa.docx',
      fileSize: 512000,
      status: 'APPROVED' as const,
      salesCount: 28,
      viewCount: 312,
    },
    {
      title: 'E-Book: Panduan Memulai Bisnis Online',
      description: 'Panduan lengkap memulai bisnis online dari nol. Dari riset pasar, branding, hingga strategi marketing digital. 120 halaman praktis dan actionable. Bonus: checklist dan template tambahan.',
      price: 75000,
      categorySlug: 'ebook',
      thumbnail: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop',
      fileKey: 'demo/panduan-bisnis-online.pdf',
      fileName: 'panduan-bisnis-online.pdf',
      fileSize: 5242880,
      status: 'APPROVED' as const,
      salesCount: 45,
      viewCount: 520,
    },
    {
      title: 'Course: Edit Foto Profesional dengan Lightroom',
      description: 'Video course 5 jam belajar edit foto dengan Adobe Lightroom. Dari basic adjustment, color grading, hingga batch editing untuk wedding photographer. Include 50 preset gratis.',
      price: 150000,
      categorySlug: 'course',
      thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop',
      fileKey: 'demo/course-lightroom.zip',
      fileName: 'course-lightroom.zip',
      fileSize: 209715200,
      status: 'APPROVED' as const,
      salesCount: 8,
      viewCount: 89,
    },
    {
      title: '50 Preset Lightroom Moody Tone',
      description: 'Koleksi 50 preset Lightroom dengan moody tone aesthetic. Cocok untuk portrait, street photography, dan travel. Compatible dengan Lightroom Mobile & Desktop.',
      price: 25000,
      categorySlug: 'preset',
      thumbnail: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=800&h=600&fit=crop',
      fileKey: 'demo/50-preset-moody.zip',
      fileName: '50-preset-moody.zip',
      fileSize: 10485760,
      status: 'APPROVED' as const,
      salesCount: 67,
      viewCount: 430,
    },
    {
      title: 'Font Bundle: Display Sans Serif Modern',
      description: 'Koleksi 10 font display sans serif modern untuk branding, logo, dan headline. Include commercial license. Format OTF dan TTF.',
      price: 45000,
      categorySlug: 'font',
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
      fileKey: 'demo/font-bundle-sans.zip',
      fileName: 'font-bundle-sans.zip',
      fileSize: 15728640,
      status: 'APPROVED' as const,
      salesCount: 15,
      viewCount: 210,
    },
    {
      title: 'Template Invoice & Quotations Professional',
      description: 'Template invoice dan quotation dengan desain profesional. Sudah include perhitungan otomatis, logo placeholder, dan 5 color variants. Format Excel dan Google Sheets.',
      price: 40000,
      categorySlug: 'template-umkm',
      thumbnail: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop',
      fileKey: 'demo/template-invoice.xlsx',
      fileName: 'template-invoice.xlsx',
      fileSize: 307200,
      status: 'PENDING' as const,
      salesCount: 0,
      viewCount: 0,
    },
    {
      title: 'E-Book: Cara Dapat Beasiswa Luar Negeri',
      description: 'Panduan lengkap apply beasiswa S2/S3 luar negeri. Dari preparation, drafting SOP, cari supervisor, hingga interview tips. Berdasarkan pengalaman penulis yang lolos 3 beasiswa.',
      price: 60000,
      categorySlug: 'ebook',
      thumbnail: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=600&fit=crop',
      fileKey: 'demo/beasiswa-luar-negeri.pdf',
      fileName: 'beasiswa-luar-negeri.pdf',
      fileSize: 3145728,
      status: 'APPROVED' as const,
      salesCount: 33,
      viewCount: 278,
    },
  ]

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { fileKey: product.fileKey },
    })
    if (!existing) {
      await prisma.product.create({
        data: {
          title: product.title,
          description: product.description,
          price: product.price,
          categoryId: getCatId(product.categorySlug),
          sellerId: seller.id,
          fileKey: product.fileKey,
          fileName: product.fileName,
          fileSize: product.fileSize,
          thumbnail: product.thumbnail,
          status: product.status,
          salesCount: product.salesCount,
          viewCount: product.viewCount,
        },
      })
    }
  }
  console.log(`Seeded ${products.length} dummy products`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
