/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      name: string | null;
      email: string;
      role: "BUYER" | "SELLER" | "ADMIN";
      image: string | null;
      whatsapp: string | null;
    } | null;
    session: {
      id: string;
      sessionToken: string;
      userId: string;
      expiresAt: Date;
    } | null;
  }
}
