import { Resend } from "resend"

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function sendPurchaseSuccessEmail(
  to: string,
  data: {
    productTitle: string
    productPrice: number
    downloadUrl: string
    libraryUrl: string
  }
) {
  const resend = getResend()
  if (!resend) {
    console.log("Resend not configured, skipping email")
    return
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@prodig.id",
      to,
      subject: `[Prodig.id] Pembayaran Berhasil — ${data.productTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Terima kasih telah berbelanja di Prodig.id!</h2>
          <p>Pembayaranmu telah berhasil. Berikut detail pembelian:</p>
          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Produk</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.productTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Harga</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">Rp ${data.productPrice.toLocaleString("id-ID")}</td>
            </tr>
          </table>
          <p>
            <a href="${data.downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Download File
            </a>
          </p>
          <p style="font-size: 12px; color: #666;">
            Link download berlaku 24 jam. Kamu juga bisa mengakses file kapan saja melalui <a href="${data.libraryUrl}">Library</a>.
          </p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">
            Butuh bantuan? Hubungi kami via WhatsApp.
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error("Email send error:", error)
  }
}
