import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// ─── Next.js 16 Proxy Function ──────────────────────────────────────
// Replaces middleware.ts. Runs on Node.js runtime.
// Handles subdomain routing + auth protection.

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const hostname = request.headers.get("host") || ""

    // ─── Skip static assets and API auth routes ─────────────────────
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/images") ||
        pathname.includes(".") // static files (favicon, images, etc.)
    ) {
        return NextResponse.next()
    }

    // ─── Detect subdomain ──────────────────────────────────────────
    const isOpsSubdomain = hostname.startsWith("ops.")

    // ─── Get session ───────────────────────────────────────────────
    const session = await auth()

    // ─── Ops subdomain routing ────────────────────────────────────
    if (isOpsSubdomain || pathname.startsWith("/ops")) {
        // Strip /ops prefix for rewriting to the (ops) route group
        const opsPath = pathname.startsWith("/ops")
            ? pathname.replace(/^\/ops/, "") || "/"
            : pathname

        // Unauthenticated → ops login
        if (!session && opsPath !== "/" && opsPath !== "/login") {
            const loginUrl = new URL(isOpsSubdomain ? "/" : "/ops", request.url)
            return NextResponse.redirect(loginUrl)
        }

        // Authenticated but not OPS role → reject
        if (session && (session.user as { role: string }).role !== "OPS" && opsPath !== "/" && opsPath !== "/login") {
            const loginUrl = new URL(isOpsSubdomain ? "/" : "/ops", request.url)
            return NextResponse.redirect(loginUrl)
        }

        // Rewrite to ops route group
        if (pathname.startsWith("/ops")) {
            return NextResponse.next()
        }

        const url = request.nextUrl.clone()
        url.pathname = `/ops${opsPath}`
        return NextResponse.rewrite(url)
    }

    // ─── Employee (default) routing ───────────────────────────────
    // Unauthenticated → login page
    if (!session && pathname !== "/" && pathname !== "/login") {
        return NextResponse.redirect(new URL("/", request.url))
    }

    // Authenticated employee trying to access login → redirect to dashboard
    if (session && (pathname === "/" || pathname === "/login")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        // Match all paths except static files
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}
