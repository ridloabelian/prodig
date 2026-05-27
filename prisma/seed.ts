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
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
