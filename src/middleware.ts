import { defineMiddleware } from "astro:middleware";
import { getDb } from "./db";
import { validateSessionToken } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Exclude static assets, public folder files, and internal Astro paths
  if (
    pathname.startsWith("/_") || 
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return next();
  }

  // 1. Fetch Session Cookie
  const sessionToken = context.cookies.get("session_token")?.value;

  context.locals.user = null;
  context.locals.session = null;

  if (sessionToken) {
    try {
      const db = getDb(context.locals.runtime.env);
      const { session, user } = await validateSessionToken(db, sessionToken);

      if (session && user) {
        context.locals.session = session;
        context.locals.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          whatsapp: user.whatsapp,
        };
      } else {
        // Delete invalid or expired cookie
        context.cookies.delete("session_token", { path: "/" });
      }
    } catch (error) {
      console.error("Gagal memvalidasi token sesi di middleware:", error);
    }
  }

  const user = context.locals.user;

  // 2. Role-Based Route Protection
  
  // Protect ADMIN paths
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return context.redirect("/login?redirect=" + encodeURIComponent(pathname));
    }
    if (user.role !== "ADMIN") {
      return context.redirect("/");
    }
  }

  // Protect SELLER paths (dashboard, sell)
  if (pathname.startsWith("/sell") || pathname.startsWith("/dashboard")) {
    if (!user) {
      return context.redirect("/login?redirect=" + encodeURIComponent(pathname));
    }
    if (user.role !== "SELLER" && user.role !== "ADMIN") {
      return context.redirect("/");
    }
  }

  // Protect buyer LIBRARY or AFFILIATE paths
  if (pathname.startsWith("/library") || pathname.startsWith("/affiliate")) {
    if (!user) {
      return context.redirect("/login?redirect=" + encodeURIComponent(pathname));
    }
  }

  // Prevent logged-in users from accessing login/register pages
  if (pathname === "/login" || pathname === "/register") {
    if (user) {
      if (user.role === "SELLER" || user.role === "ADMIN") {
        return context.redirect("/dashboard");
      }
      return context.redirect("/library");
    }
  }

  return next();
});
