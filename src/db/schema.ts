import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. Users Table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  image: text("image"),
  password: text("password"), // hashed password
  role: text("role").$type<"BUYER" | "SELLER" | "ADMIN">().default("BUYER").notNull(),
  whatsapp: text("whatsapp"),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 2. Sessions Table (Custom Session Store)
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").unique().notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// 3. Categories Table
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
});

// 4. Products Table
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // IDR
  categoryId: text("category_id")
    .references(() => categories.id)
    .notNull(),
  fileKey: text("file_key").notNull(), // R2 key
  fileSize: integer("file_size"), // bytes
  fileName: text("file_name"),
  thumbnail: text("thumbnail").notNull(), // publicUrl
  status: text("status")
    .$type<"PENDING" | "APPROVED" | "REJECTED" | "HIDDEN">()
    .default("PENDING")
    .notNull(),
  salesCount: integer("sales_count").default(0).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 5. Affiliates Table
export const affiliates = sqliteTable("affiliates", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  code: text("code").unique().notNull(),
  commissionPercent: integer("commission_percent").default(20).notNull(),
  status: text("status").$type<"ACTIVE" | "INACTIVE">().default("ACTIVE").notNull(),
  totalEarnings: integer("total_earnings").default(0).notNull(),
  totalReferrals: integer("total_referrals").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 6. Transactions Table
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: text("product_id")
    .references(() => products.id)
    .notNull(),
  subtotal: integer("subtotal").default(0).notNull(),
  ppn: integer("ppn").default(0).notNull(),
  amount: integer("amount").notNull(), // total bayar
  commission: integer("commission").default(0).notNull(), // platform fee
  netAmount: integer("net_amount").default(0).notNull(), // seller net
  affiliateId: text("affiliate_id").references(() => affiliates.id),
  affiliateCommission: integer("affiliate_commission").default(0).notNull(),
  mayarPaymentId: text("mayar_payment_id"),
  mayarInvoiceUrl: text("mayar_invoice_url"),
  status: text("status")
    .$type<"PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED">()
    .default("PENDING")
    .notNull(),
  downloadToken: text("download_token").unique(),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  downloadCount: integer("download_count").default(0).notNull(),
  lastDownloadAt: integer("last_download_at", { mode: "timestamp" }),
  watermarkedFileKey: text("watermarked_file_key"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 7. Reviews Table
export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id")
    .references(() => transactions.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  buyerId: text("buyer_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 8. Withdrawals Table
export const withdrawals = sqliteTable("withdrawals", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: integer("amount").notNull(),
  status: text("status")
    .$type<"PENDING" | "PROCESSED" | "REJECTED">()
    .default("PENDING")
    .notNull(),
  notes: text("notes"),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 9. AffiliateWithdrawals Table
export const affiliateWithdrawals = sqliteTable("affiliate_withdrawals", {
  id: text("id").primaryKey(),
  affiliateId: text("affiliate_id")
    .references(() => affiliates.id, { onDelete: "cascade" })
    .notNull(),
  amount: integer("amount").notNull(),
  status: text("status")
    .$type<"PENDING" | "PROCESSED" | "REJECTED">()
    .default("PENDING")
    .notNull(),
  notes: text("notes"),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 10. DownloadLogs Table
export const downloadLogs = sqliteTable("download_logs", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull(),
  userId: text("user_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 11. WebhookLogs Table
export const webhookLogs = sqliteTable("webhook_logs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(), // "mayar"
  eventId: text("event_id"),
  payload: text("payload").notNull(), // JSON string
  processed: integer("processed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

// 12. LandingPages Table
export const landingPages = sqliteTable("landing_pages", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  sellerId: text("seller_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  theme: text("theme").default("midnight").notNull(), // midnight, emerald, ocean, sunset
  prompt: text("prompt"),
  status: text("status").$type<"DRAFT" | "PUBLISHED">().default("DRAFT").notNull(),
  
  // JSON structure for sections
  heroTitle: text("hero_title").notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  heroFeatures: text("hero_features"), // JSON string array (e.g. ["Akses Selamanya", "Grup Support WA"])
  
  features: text("features").notNull(), // JSON string representing array of {title, description, icon}
  testimonials: text("testimonials"), // JSON string representing array of {name, role, content, rating}
  faqs: text("faqs"), // JSON string representing array of {question, answer}
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now') * 1000)`)
    .notNull(),
});

