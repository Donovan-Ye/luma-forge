import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteUrl } from "@/lib/config/site";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Luma Forge | Online Image Editor";
const siteDescription =
  "Luma Forge is a premium, browser-native image editor with pro-grade adjustments, fast cropping, and export-ready color workflows.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Luma Forge",
  },
  description: siteDescription,
  applicationName: "Luma Forge",
  generator: "Next.js",
  authors: [{ name: "Luma Forge" }],
  creator: "Luma Forge",
  publisher: "Luma Forge",
  keywords: [
    "Luma Forge",
    "online image editor",
    "photo editor",
    "web-based photoshop",
    "image adjustments",
    "photo cropping",
    "color grading",
  ],
  category: "technology",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Luma Forge",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1024,
        height: 1024,
        alt: "Luma Forge aperture and spark logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      {
        url: "/logo.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/logo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon.ico"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          href="/logo2.png"
          as="image"
          type="image/png"
          fetchPriority="high"
        />
      </head>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased min-h-screen bg-background text-foreground"
        )}
      >
        <I18nProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
