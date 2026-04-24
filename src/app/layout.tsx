// kolay gelsin
import type { Metadata, Viewport } from "next";
import { Bitter, Source_Sans_3 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GenerativeBackground } from "@/components/generative-background";
import { RegisterSw } from "@/components/pwa/register-sw";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import "./globals.css";

const bitter = Bitter({
  variable: "--font-bitter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://italia-2027.vercel.app"),
  title: "Italia 2027",
  description: "A few friends, one trip.",
  openGraph: {
    title: "Italia 2027",
    description: "A few friends, one trip.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Italia 2027",
    description: "A few friends, one trip.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Italia 2027",
  },
};

export const viewport: Viewport = {
  themeColor: "#c65d3a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bitter.variable} ${sourceSans.variable} bg-cream text-ink antialiased`}
      >
        <OfflineBanner />
        <GenerativeBackground />
        {children}
        <Toaster />
        <RegisterSw />
      </body>
    </html>
  );
}
