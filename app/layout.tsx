import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  applicationName: "FolksMeal",
  title: "FolksMeal - Corporate Meals",
  description:
    "Corporate meal ordering and management with reporting and analytics.",
  manifest: "/manifest.webmanifest",
  themeColor: "#4F624F",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "FolksMeal",
    title: "FolksMeal - Corporate Meals",
    description:
      "Corporate meal ordering and management with reporting and analytics.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "FolksMeal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FolksMeal - Corporate Meals",
    description:
      "Corporate meal ordering and management with reporting and analytics.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FolksMeal",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}