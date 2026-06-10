import { Resend } from "resend";

function getResend(env: any) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendPurchaseSuccessEmail(
  env: any,
  to: string,
  data: {
    productTitle: string;
    productPrice: number;
    downloadUrl: string;
    libraryUrl: string;
    mentorUrl?: string;
  }
) {
  const resend = getResend(env);
  if (!resend) {
    console.log("Resend not configured (missing RESEND_API_KEY), skipping email sending.");
    return;
  }

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM || "noreply@prodig.id",
      to,
      subject: `[Prodig.id] Pembayaran Berhasil — ${data.productTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #000;">Terima kasih telah berbelanja di Prodig.id!</h2>
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
          <p style="margin: 24px 0;">
            <a href="${data.downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Download File
            </a>
          </p>
          ${data.mentorUrl ? `
          <p style="margin: 16px 0;">
            <a href="${data.mentorUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Akses AI Mentor Mas Bluprint
            </a>
          </p>
          ` : ''}
          <p style="font-size: 12px; color: #666;">
            Link download berlaku 24 jam. Kamu juga bisa mengakses file kapan saja melalui <a href="${data.libraryUrl}" style="color: #000; text-decoration: underline;">Library</a>.
          </p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">
            Butuh bantuan? Hubungi kami via WhatsApp.
          </p>
        </div>
      `,
    });
    console.log(`Success email sent to ${to} for product: ${data.productTitle}`);
  } catch (error) {
    console.error("Email send error:", error);
  }
}
