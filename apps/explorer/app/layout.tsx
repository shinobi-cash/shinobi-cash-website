import type { Metadata } from "next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./globals.css";

const queryClient = new QueryClient();

export const metadata: Metadata = {
  title: "Shinobi Cash - Explorer",
  description: "Explore Shinobi Cash pool statistics and recent activity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </body>
    </html>
  );
}
