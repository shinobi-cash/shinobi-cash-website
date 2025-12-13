import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import Navbar from "@/components/navbar"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Shinobi Cash - Private Cross-Chain Transactions",
  description:
    "Private, cross-chain transactions powered by zero-knowledge proofs. Deposit from any chain, withdraw to any chain with complete privacy.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
