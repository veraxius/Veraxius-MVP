import "./globals.css";
import type { Metadata } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import Script from "next/script";
import { NavBar } from "@/components/NavBar";
import { SessionSync } from "@/components/SessionSync";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veraxius | Integrity Infrastructure",
  description: "Veraxius replaces assumption with measurable integrity. Integrity Infrastructure for an AI-saturated world.",
  icons: {
    icon: "/Veraxius Favicon FINAL-01.ico",
    shortcut: "/Veraxius Favicon FINAL-01.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* Google tag (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-7WC0W45L36"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7WC0W45L36');
          `}
        </Script>
      </head>
      <body className="overflow-x-hidden min-h-screen min-w-0">
        <ThemeProvider>
          <SessionSync />
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
