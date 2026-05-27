"use client"

interface Product {
  id: string
  title: string
  price: number
  status: string
  salesCount: number
  viewCount: number
  createdAt: string
  category: { name: string }
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  HIDDEN: "bg-gray-100 text-gray-800",
}

export function SellerProductsTable({ products }: { products: Product[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4">Produk</th>
            <th className="text-left py-3 px-4">Kategori</th>
            <th className="text-left py-3 px-4">Harga</th>
            <th className="text-left py-3 px-4">Status</th>
            <th className="text-left py-3 px-4">Penjualan</th>
            <th className="text-left py-3 px-4">Dilihat</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b">
              <td className="py-3 px-4 font-medium">{product.title}</td>
              <td className="py-3 px-4">{product.category.name}</td>
              <td className="py-3 px-4">
                Rp {product.price.toLocaleString("id-ID")}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusColors[product.status] || "bg-gray-100"
                  }`}
                >
                  {product.status}
                </span>
              </td>
              <td className="py-3 px-4">{product.salesCount}</td>
              <td className="py-3 px-4">{product.viewCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Belum ada produk
        </div>
      )}
    </div>
  )
}
