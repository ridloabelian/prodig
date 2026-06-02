export async function createMayarInvoice(
  env: any,
  params: {
    amount: number;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    redirectUrl: string;
    webhookUrl: string;
    externalId: string;
  }
) {
  const apiKey = env.MAYAR_API_KEY;
  const baseUrl = env.MAYAR_API_URL || "https://api.mayar.id/hl";

  if (!apiKey) {
    throw new Error("Kunci API Mayar ('MAYAR_API_KEY') belum dikonfigurasi.");
  }

  const res = await fetch(`${baseUrl}/v1/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mayar API error: ${res.status} - ${err}`);
  }

  return res.json();
}
