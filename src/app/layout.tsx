// kolay gelsin
import type { Metadata } from "next";
import { Bitter, Source_Sans_3 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GenerativeBackground } from "@/components/generative-background";
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
  title: "Italia 2027",
  description: "A few friends, one trip.",
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
        <GenerativeBackground />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
