import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import ChallengeListener from "@/components/ChallengeListener";

export const metadata: Metadata = {
  title: "Arrow Trail — race the maze",
  description:
    "A responsive, competitive arrow-maze puzzle game. Solve levels solo or race friends live.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0e14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <ChallengeListener />
          <main className="min-h-[calc(100dvh-64px)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
