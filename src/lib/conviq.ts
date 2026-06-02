/**
 * Conviq (Chatwoot) API client for WhatsApp notifications
 *
 * Required env vars:
 *   CONVIQ_BASE_URL
 *   CONVIQ_ACCOUNT_ID
 *   CONVIQ_API_KEY
 *   CONVIQ_WHATSAPP_INBOX_ID
 */

interface ConviqContact {
  id: number;
  name: string;
  phone_number: string;
}

interface ConviqContactInbox {
  source_id: string;
  inbox_id: number;
}

interface ConviqMessage {
  id: number;
  content: string;
}

function getConfig(env: any) {
  return {
    baseUrl: env.CONVIQ_BASE_URL?.replace(/\/$/, ""),
    accountId: env.CONVIQ_ACCOUNT_ID,
    apiKey: env.CONVIQ_API_KEY,
    inboxId: env.CONVIQ_WHATSAPP_INBOX_ID,
  };
}

function isConfigured(env: any): boolean {
  const c = getConfig(env);
  return !!(c.baseUrl && c.accountId && c.apiKey && c.inboxId);
}

async function conviqFetch<T>(env: any, path: string, options?: RequestInit): Promise<T | null> {
  const { baseUrl, apiKey } = getConfig(env);
  if (!baseUrl || !apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Api-Access-Token": apiKey,
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Conviq API error:", res.status, text);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("Conviq fetch error:", err);
    return null;
  }
}

/**
 * Create or find a contact by phone number
 */
async function createContact(env: any, name: string, phone: string): Promise<ConviqContact | null> {
  const { accountId } = getConfig(env);
  if (!accountId) return null;

  // Try to search existing contact first
  const search = await conviqFetch<{ payload: ConviqContact[] }>(
    env,
    `/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(phone)}`
  );
  if (search?.payload && search.payload.length > 0) {
    return search.payload[0];
  }

  // Create new contact
  const created = await conviqFetch<{ payload: { contact: ConviqContact } }>(
    env,
    `/api/v1/accounts/${accountId}/contacts`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        phone_number: phone,
      }),
    }
  );
  return created?.payload?.contact || null;
}

/**
 * Create contact inbox (link contact to WhatsApp inbox)
 * Returns source_id which can be used as conversation identifier
 */
async function createContactInbox(env: any, contactId: number): Promise<string | null> {
  const { accountId, inboxId } = getConfig(env);
  if (!accountId || !inboxId) return null;

  const result = await conviqFetch<{ payload: { contact_inbox: ConviqContactInbox } }>(
    env,
    `/api/v1/accounts/${accountId}/contacts/${contactId}/contact_inboxes`,
    {
      method: "POST",
      body: JSON.stringify({
        inbox_id: parseInt(inboxId),
      }),
    }
  );
  return result?.payload?.contact_inbox?.source_id || null;
}

/**
 * Send a WhatsApp message to a phone number via Conviq
 */
export async function sendWhatsAppMessage(
  env: any,
  phone: string,
  name: string,
  message: string
): Promise<boolean> {
  if (!isConfigured(env)) {
    console.log("Conviq not configured, skipping WhatsApp notification");
    return false;
  }

  const contact = await createContact(env, name, phone);
  if (!contact) return false;

  const sourceId = await createContactInbox(env, contact.id);
  if (!sourceId) return false;

  const { accountId, inboxId } = getConfig(env);
  if (!accountId || !inboxId) return false;

  // Send message using public API (source_id acts as conversation identifier for API channels)
  const result = await conviqFetch<ConviqMessage>(
    env,
    `/api/v1/accounts/${accountId}/conversations/${sourceId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        content: message,
        message_type: "outgoing",
        private: false,
      }),
    }
  );

  return !!result;
}

/**
 * Send notification to buyer: payment success
 */
export async function notifyBuyerPaymentSuccess(
  env: any,
  phone: string | null | undefined,
  name: string,
  productTitle: string,
  downloadUrl: string
): Promise<void> {
  if (!phone) return;
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const message = `Halo ${name}! Pembayaran untuk *${productTitle}* telah berhasil.\n\nKamu bisa download produk di sini:\n${downloadUrl}\n\nTerima kasih telah berbelanja di Prodig.id!`;
  await sendWhatsAppMessage(env, formattedPhone, name, message);
}

/**
 * Send notification to seller: new sale
 */
export async function notifySellerNewSale(
  env: any,
  phone: string | null | undefined,
  name: string,
  productTitle: string,
  buyerName: string,
  amount: number
): Promise<void> {
  if (!phone) return;
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const message = `Halo ${name}! Ada pembelian baru di produk *${productTitle}*.\n\nPembeli: ${buyerName}\nTotal: Rp ${amount.toLocaleString("id-ID")}\n\nCek dashboard seller-mu untuk detailnya.`;
  await sendWhatsAppMessage(env, formattedPhone, name, message);
}

/**
 * Send notification to affiliate: new conversion
 */
export async function notifyAffiliateConversion(
  env: any,
  phone: string | null | undefined,
  name: string,
  productTitle: string,
  commission: number
): Promise<void> {
  if (!phone) return;
  const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const message = `Selamat ${name}! Ada conversion baru dari link affiliate-mu.\n\nProduk: *${productTitle}*\nKomisi: Rp ${commission.toLocaleString("id-ID")}\n\nCek dashboard affiliate-mu untuk detailnya.`;
  await sendWhatsAppMessage(env, formattedPhone, name, message);
}
