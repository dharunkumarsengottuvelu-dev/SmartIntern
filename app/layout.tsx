import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Inter, JetBrains_Mono } from "next/font/google";

// next/font downloads font files at build time and serves them locally —
// no external network request at runtime (eliminates ERR_NAME_NOT_RESOLVED).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "InternX — AI-Powered Internship Recommendations",
    template: "%s | InternX",
  },
  description:
    "Upload your resume, get AI-powered ATS analysis, take skill-based assessments, and receive personalized internship recommendations.",
  keywords: ["internship", "AI", "resume", "ATS", "college", "students", "recommendation"],
  authors: [{ name: "InternX" }],
  openGraph: {
    title: "InternX — AI-Powered Internship Recommendations",
    description: "The smartest way for college students to find the right internship.",
    type: "website",
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} animated-bg min-h-screen antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

