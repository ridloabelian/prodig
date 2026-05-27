const MAYAR_BASE_URL = process.env.MAYAR_API_URL || "https://api.mayar.id"

export async function createMayarInvoice(params: {
  amount: number
  description: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  redirectUrl: string
  webhookUrl: string
  externalId: string
}) {
  const res = await fetch(`${MAYAR_BASE_URL}/v1/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Mayar API error: ${res.status} - ${err}`)
  }

  return res.json()
}
