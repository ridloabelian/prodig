import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { ToasterProvider } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Prodig.id — Marketplace Produk Digital Indonesia",
  description: "Jual dan beli produk digital berkualitas dari kreator Indonesia",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AuthProvider>
          <ToasterProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </ToasterProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
