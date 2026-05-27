export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { ProductUploadForm } from "@/components/upload/product-upload-form"

export default async function SellPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Jual Produk Digital</h1>
        <p className="text-muted-foreground mb-8">
          Upload produk digitalmu dan mulai menghasilkan uang
        </p>
        <ProductUploadForm categories={categories} />
      </div>
    </div>
  )
}
