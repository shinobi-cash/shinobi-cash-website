import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import Navbar from "@/components/navbar";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Shinobi Cash - Simple, Borderless, Compliant Privacy",
  description:
    "Deposit from any chain. Withdraw to any chain. One unified pool for maximum privacy. Cross-chain privacy protocol powered by zero-knowledge proofs.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${fontSans.variable} ${fontMono.variable} bg-linear-to-br from-neutral-950 via-neutral-900 to-black font-sans text-white antialiased`}
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
