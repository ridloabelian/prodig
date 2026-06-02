"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Prodig.id
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost">Jelajahi</Button>
          </Link>

          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          ) : session ? (
            <>
              {session.user.role === "SELLER" || session.user.role === "ADMIN" ? (
                <Link href="/sell">
                  <Button variant="ghost">Jual Produk</Button>
                </Link>
              ) : null}
              {(session.user.role === "SELLER" || session.user.role === "ADMIN") && (
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
              )}
              {session.user.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="ghost">Admin</Button>
                </Link>
              )}
              <Link href="/library">
                <Button variant="ghost">Library</Button>
              </Link>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
                Keluar
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Masuk</Button>
              </Link>
              <Link href="/register">
                <Button>Daftar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
