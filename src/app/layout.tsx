import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Web3Provider } from "@/providers/Web3Provider";
import { NotificationProvider } from '@/providers/NotificationProvider';
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlockFreelancer - Blockchain Freelance Platform",
  description: "Decentralized freelance platform with blockchain technology for secure payments and reputation management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <Web3Provider>
          <NotificationProvider>
            <Navigation />
            <main className="min-h-screen">
              {children}
            </main>
          </NotificationProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
