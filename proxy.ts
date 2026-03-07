import { NextRequest, NextResponse } from "next/server"

// --- Constants ---
const SESSION_COOKIE = "authjs.session-token"
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token"
const STATIC_ASSET_PREFIXES = ["/_next", "/images", "/favicon.ico"] as const
const AUTH_API_PREFIX = "/api/auth"
const API_PREFIX = "/api/"
const PUBLIC_PATHS = new Set(["/", "/login"])

// --- Rate Limiting ---
const ipLimits = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_IP_ENTRIES = 10_000
let lastCleanup = Date.now()

// Different limits for different route types
const RATE_LIMITS: Record<string, number> = {
    auth: 60,       // Auth endpoints: 60 req/min
    mutation: 60,   // POST/PUT/DELETE: 60 req/min
    read: 200,      // GET: 200 req/min
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

// --- Main Proxy Entry ---
export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

    // 1. Rate Limiting for all API routes
    if (pathname.startsWith(API_PREFIX)) {
        // Auth endpoints get strictest limit
        if (pathname.startsWith(AUTH_API_PREFIX)) {
            if (!checkRateLimit(ip, "auth", RATE_LIMITS.auth)) {
                return rateLimitResponse()
            }
            return NextResponse.next()
        }

        // All other API routes
        const method = request.method
        if (method === "GET") {
            if (!checkRateLimit(ip, "read", RATE_LIMITS.read)) {
                return rateLimitResponse()
            }
        } else {
            // POST, PUT, DELETE, PATCH
            if (!checkRateLimit(ip, "mutation", RATE_LIMITS.mutation)) {
                return rateLimitResponse()
            }
        }
        return NextResponse.next()
    }

    // 2. Static Assets
    if (isStaticAsset(pathname)) {
        return NextResponse.next()
    }

    // 3. Routing Logic
    const token = getSessionToken(request)
    const hasSession = !!token
    const hostname = request.headers.get("host") || ""
    const isOpsSubdomain = hostname.startsWith("ops.")

    if (isOpsSubdomain || pathname.startsWith("/ops")) {
        return handleOpsRouting(request, pathname, isOpsSubdomain, hasSession)
    }

    return handleEmployeeRouting(request, pathname, hasSession)
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
