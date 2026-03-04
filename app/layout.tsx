import type { Metadata } from "next"
import { Inter, DM_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })

export const metadata: Metadata = {
  title: "FolksMeal - Corporate Meal Selection",
  description:
    "Simple internal office meal selection tool for employees. Choose your meal preference for tomorrow.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
