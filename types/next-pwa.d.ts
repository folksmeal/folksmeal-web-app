declare module "next-pwa" {
  import type { NextConfig } from "next"

  type NextPwaOptions = {
    dest: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    runtimeCaching?: unknown
    buildExcludes?: Array<RegExp | string>
  }

  export default function withPWA(
    _options: NextPwaOptions
  ): (_nextConfig: NextConfig) => NextConfig
}

declare module "next-pwa/cache" {
  const runtimeCaching: unknown
  export default runtimeCaching
}

