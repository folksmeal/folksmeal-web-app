import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    generateEtags: true,

    serverExternalPackages: ["bcryptjs", "exceljs"],

    typescript: {
        ignoreBuildErrors: false,
    },

    logging: {
        fetches: {
            fullUrl: true,
            hmrRefreshes: false,
        },
        incomingRequests: {
            ignore: [/\/_next\//, /\/favicon\.png/],
        },
    },

    experimental: {
        serverMinification: true,
        optimizePackageImports: [
            "lucide-react",
            "date-fns",
            "recharts",
            "@radix-ui/react-icons",
            "framer-motion",
            "react-hook-form",
            "swr",
            "zod"
        ],
    },

    compiler: {
        removeConsole: process.env.NODE_ENV === "production"
            ? { exclude: ["error", "warn"] }
            : false,
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
                    },
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https:",
                            "font-src 'self' data:",
                            "connect-src 'self' https://va.vercel-scripts.com https://*.supabase.com",
                            "worker-src 'self' blob:",
                            "manifest-src 'self'",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join("; "),
                    },
                ],
            },
            {
                source: "/_next/static/(.*)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                source: "/images/(.*)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400, stale-while-revalidate=604800",
                    },
                ],
            },
        ]
    },

    async redirects() {
        if (process.env.NODE_ENV === "development") {
            return []
        }
        return [
            {
                source: "/ops",
                has: [{ type: "host", value: "(?!ops\\.).*" }],
                destination: "https://ops.folksmeal.com/",
                permanent: true,
            },
            {
                source: "/ops/:path*",
                has: [{ type: "host", value: "(?!ops\\.).*" }],
                destination: "https://ops.folksmeal.com/:path*",
                permanent: true,
            },
            {
                source: "/admin",
                has: [{ type: "host", value: "(?!admin\\.).*" }],
                destination: "https://admin.folksmeal.com/",
                permanent: true,
            },
            {
                source: "/admin/:path*",
                has: [{ type: "host", value: "(?!admin\\.).*" }],
                destination: "https://admin.folksmeal.com/:path*",
                permanent: true,
            },
        ]
    },
}

export default async function config() {
    const withBundleAnalyzer = (await import("@next/bundle-analyzer")).default({
        enabled: process.env.ANALYZE === "true",
    })

    const withPWA = (await import("next-pwa")).default({
        dest: "public",
        register: true,
        skipWaiting: true,
        disable: process.env.NODE_ENV === "development",
        runtimeCaching: (await import("next-pwa/cache")).default,
        buildExcludes: [/middleware-manifest\.json$/],
    })

    return withBundleAnalyzer(withPWA(nextConfig))
}
