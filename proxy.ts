import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "authjs.session-token"
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token"

const OPS_ROLES = new Set(["OPS", "ORG_ADMIN", "SUPERADMIN"])

const STATIC_ASSET_PREFIXES = [
    "/_next",
    "/images",
    "/favicon.ico",
] as const

const AUTH_API_PREFIX = "/api/auth"

const PUBLIC_EMPLOYEE_PATHS = new Set(["/", "/login"])
const PUBLIC_OPS_PATHS = new Set(["/", "/login"])

function hasSessionCookie(request: NextRequest): boolean {
    return (
        request.cookies.has(SESSION_COOKIE) ||
        request.cookies.has(SECURE_SESSION_COOKIE)
    )
}

function isStaticAsset(pathname: string): boolean {
    for (const prefix of STATIC_ASSET_PREFIXES) {
        if (pathname.startsWith(prefix)) return true
    }
    return pathname.includes(".")
}

function parseSessionRole(request: NextRequest): string | null {
    const token =
        request.cookies.get(SESSION_COOKIE)?.value ||
        request.cookies.get(SECURE_SESSION_COOKIE)?.value

    if (!token) return null

    try {
        const segments = token.split(".")
        if (segments.length < 2) return null
        const payload = JSON.parse(
            Buffer.from(segments[1], "base64url").toString("utf-8")
        )
        return (payload.role as string) || null
    } catch {
        return null
    }
}

function buildRedirectResponse(
    request: NextRequest,
    destination: string,
    permanent = false
): NextResponse {
    const url = new URL(destination, request.url)
    return NextResponse.redirect(url, permanent ? 308 : 307)
}

function handleOpsRouting(
    request: NextRequest,
    pathname: string,
    isOpsSubdomain: boolean
): NextResponse {
    const opsPath = pathname.startsWith("/ops")
        ? pathname.replace(/^\/ops/, "") || "/"
        : pathname

    const loginTarget = isOpsSubdomain ? "/" : "/ops"
    const isPublicOpsPath = PUBLIC_OPS_PATHS.has(opsPath)
    const hasSession = hasSessionCookie(request)

    if (!hasSession && !isPublicOpsPath) {
        return buildRedirectResponse(request, loginTarget)
    }

    if (hasSession && !isPublicOpsPath) {
        const role = parseSessionRole(request)
        if (role && !OPS_ROLES.has(role)) {
            return buildRedirectResponse(request, loginTarget)
        }
    }

    if (pathname.startsWith("/ops")) {
        return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    url.pathname = `/ops${opsPath}`
    return NextResponse.rewrite(url)
}

function handleEmployeeRouting(
    request: NextRequest,
    pathname: string
): NextResponse {
    const hasSession = hasSessionCookie(request)
    const isPublicPath = PUBLIC_EMPLOYEE_PATHS.has(pathname)

    if (!hasSession && !isPublicPath) {
        return buildRedirectResponse(request, "/")
    }

    return NextResponse.next()
}

export function proxy(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl

    if (isStaticAsset(pathname) || pathname.startsWith(AUTH_API_PREFIX)) {
        return NextResponse.next()
    }

    const hostname = request.headers.get("host") || ""
    const isOpsSubdomain = hostname.startsWith("ops.")

    if (isOpsSubdomain || pathname.startsWith("/ops")) {
        return handleOpsRouting(request, pathname, isOpsSubdomain)
    }

    return handleEmployeeRouting(request, pathname)
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}
