import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Fira_Code } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Candy Counter",
  description: "Track your trick-or-treat candy collection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${firaCode.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
