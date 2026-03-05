import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const hostname = request.headers.get("host") || ""

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/images") ||
        pathname.includes(".")
    ) {
        return NextResponse.next()
    }

    const isOpsSubdomain = hostname.startsWith("ops.")
    const session = await auth()

    if (isOpsSubdomain || pathname.startsWith("/ops")) {
        const opsPath = pathname.startsWith("/ops")
            ? pathname.replace(/^\/ops/, "") || "/"
            : pathname

        if (!session && opsPath !== "/" && opsPath !== "/login") {
            const loginUrl = new URL(isOpsSubdomain ? "/" : "/ops", request.url)
            return NextResponse.redirect(loginUrl)
        }

        if (session) {
            const userRole = (session.user as { role: string }).role
            const isManager = ["OPS", "ORG_ADMIN", "SUPERADMIN"].includes(userRole)

            if (!isManager && opsPath !== "/" && opsPath !== "/login") {
                const loginUrl = new URL(isOpsSubdomain ? "/" : "/ops", request.url)
                return NextResponse.redirect(loginUrl)
            }
        }

        if (pathname.startsWith("/ops")) {
            return NextResponse.next()
        }

        const url = request.nextUrl.clone()
        url.pathname = `/ops${opsPath}`
        return NextResponse.rewrite(url)
    }

    if (!session && pathname !== "/" && pathname !== "/login") {
        return NextResponse.redirect(new URL("/", request.url))
    }

    if (session && (pathname === "/" || pathname === "/login")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}
