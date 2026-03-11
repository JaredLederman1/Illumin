import type { Metadata } from "next";
import { DM_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Sovereign — Personal Finance",
  description: "Your personal finance command center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSerifDisplay.variable} ${dmMono.variable} antialiased`}
        style={{ backgroundColor: '#0d0800', color: '#e8d5b0', fontFamily: 'var(--font-mono), monospace' }}
      >
        {children}
      </body>
    </html>
  );
}
