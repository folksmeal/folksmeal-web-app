import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "authjs.session-token"
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token"
const STATIC_ASSET_PREFIXES = [
    "/_next",
    "/images",
    "/favicon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/manifest.webmanifest",
] as const
const AUTH_API_PREFIX = "/api/auth"
const API_PREFIX = "/api/"
const PUBLIC_PATHS = new Set(["/", "/login"])

// --- Rate Limiting ---
const ipLimits = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_IP_ENTRIES = 10_000
let lastCleanup = Date.now()

const RATE_LIMITS: Record<string, number> = {
    // Requests per minute, per IP.
    auth: 60,
    mutation: 60,
    read: 200,
}

function cleanupExpiredEntries() {
    const now = Date.now()
    if (now - lastCleanup < 30_000) return
    lastCleanup = now
    for (const [ip, record] of ipLimits) {
        if (now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
            ipLimits.delete(ip)
        }
    }
}

function checkRateLimit(ip: string, bucket: string, limit: number): boolean {
    cleanupExpiredEntries()
    const key = `${ip}:${bucket}`
    const now = Date.now()
    const record = ipLimits.get(key)
    if (!record || now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
        if (ipLimits.size >= MAX_IP_ENTRIES) {
            ipLimits.clear()
        }
        ipLimits.set(key, { count: 1, windowStart: now })
        return true
    }
    if (record.count >= limit) {
        return false
    }
    record.count += 1
    return true
}

function rateLimitResponse(): NextResponse {
    return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": "60",
            },
        }
    )
}

// --- Helpers ---
function getSessionToken(request: NextRequest): string | undefined {
    return (
        request.cookies.get(SESSION_COOKIE)?.value ||
        request.cookies.get(SECURE_SESSION_COOKIE)?.value
    )
}

function isStaticAsset(pathname: string): boolean {
    return (
        STATIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
        // If it looks like a file request, skip middleware rewrites/rate-limits.
        pathname.includes(".")
    )
}

function redirect(request: NextRequest, destination: string): NextResponse {
    const url = new URL(destination, request.url)
    return NextResponse.redirect(url)
}

// --- Routing Handlers ---
function handleOpsRouting(
    request: NextRequest,
    pathname: string,
    isOpsSubdomain: boolean,
    hasSession: boolean
): NextResponse {
    const opsPath = pathname.startsWith("/ops")
        ? pathname.replace(/^\/ops/, "") || "/"
        : pathname

    const loginTarget = isOpsSubdomain ? "/" : "/ops"
    const isPublicPath = PUBLIC_PATHS.has(opsPath)

    if (!hasSession && !isPublicPath) {
        return redirect(request, loginTarget)
    }

    if (!isOpsSubdomain && pathname.startsWith("/ops")) {
        return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    url.pathname = `/ops${opsPath}`
    return NextResponse.rewrite(url)
}

function handleAdminRouting(
    request: NextRequest,
    pathname: string,
    isAdminSubdomain: boolean,
    hasSession: boolean
): NextResponse {
    const adminPath = pathname.startsWith("/admin")
        ? pathname.replace(/^\/admin/, "") || "/"
        : pathname

    const loginTarget = isAdminSubdomain ? "/" : "/admin"
    const isPublicPath = PUBLIC_PATHS.has(adminPath)

    if (!hasSession && !isPublicPath) {
        return redirect(request, loginTarget)
    }

    if (!isAdminSubdomain && pathname.startsWith("/admin")) {
        return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    url.pathname = `/admin${adminPath}`
    return NextResponse.rewrite(url)
}

function handleEmployeeRouting(
    request: NextRequest,
    pathname: string,
    hasSession: boolean
): NextResponse {
    const isPublicPath = PUBLIC_PATHS.has(pathname)
    if (!hasSession && !isPublicPath) {
        return redirect(request, "/")
    }
    return NextResponse.next()
}

export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

    if (pathname.startsWith(API_PREFIX)) {
        if (pathname.startsWith(AUTH_API_PREFIX)) {
            if (!checkRateLimit(ip, "auth", RATE_LIMITS.auth)) {
                return rateLimitResponse()
            }
            return NextResponse.next()
        }

        const method = request.method
        if (method === "GET") {
            if (!checkRateLimit(ip, "read", RATE_LIMITS.read)) {
                return rateLimitResponse()
            }
        } else {
            if (!checkRateLimit(ip, "mutation", RATE_LIMITS.mutation)) {
                return rateLimitResponse()
            }
        }
        return NextResponse.next()
    }

    if (isStaticAsset(pathname)) {
        return NextResponse.next()
    }

    const token = getSessionToken(request)
    const hasSession = !!token
    const hostname = request.headers.get("host") || ""
    const isOpsSubdomain = hostname.startsWith("ops.")
    const isAdminSubdomain = hostname.startsWith("admin.")

    if (isOpsSubdomain || pathname.startsWith("/ops")) {
        return handleOpsRouting(request, pathname, isOpsSubdomain, hasSession)
    }

    if (isAdminSubdomain || pathname.startsWith("/admin")) {
        return handleAdminRouting(request, pathname, isAdminSubdomain, hasSession)
    }

    return handleEmployeeRouting(request, pathname, hasSession)
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.png|icon-192.png|icon-512.png|manifest.webmanifest).*)",
    ],
}
