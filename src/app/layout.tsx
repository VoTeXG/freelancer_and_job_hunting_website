import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import 'quill/dist/quill.snow.css';
import ClientProviders from './ClientProviders';
import PageTransition from '@/components/PageTransition';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerBridge – Web3 Freelance Platform",
  description: "Bridge to your success: secure escrow, on-chain reputation, and global talent backed by blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-svh text-[var(--text-primary)]`}
      >
        <GlobalErrorBoundary>
          <ClientProviders>
            {/* Landmark roles */}
            <div role="main" id="main-content">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </ClientProviders>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
