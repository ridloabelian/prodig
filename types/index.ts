import { UserRole, ProductStatus, TransactionStatus, WithdrawalStatus } from "@prisma/client"

export { UserRole, ProductStatus, TransactionStatus, WithdrawalStatus }

export interface ProductWithRelations {
  id: string
  title: string
  description: string
  price: number
  thumbnail: string
  status: ProductStatus
  salesCount: number
  viewCount: number
  createdAt: Date
  seller: {
    id: string
    name: string | null
    image: string | null
  }
  category: {
    id: string
    name: string
    slug: string
  }
  _count?: {
    reviews: number
  }
  reviews?: {
    rating: number
  }[]
}
