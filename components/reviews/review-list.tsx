"use client"

import { Card, CardContent } from "@/components/ui/card"

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  buyer: {
    name: string | null
    image: string | null
  }
}

interface ReviewListProps {
  reviews: Review[]
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Belum ada ulasan
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-medium">
                {review.buyer.name || "Pembeli"}
              </div>
              <div className="text-yellow-600">
                {"★".repeat(review.rating)}
              </div>
            </div>
            {review.comment && (
              <p className="text-muted-foreground">{review.comment}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
