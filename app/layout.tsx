import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

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
    <html lang="en">
      <body className="animated-bg min-h-screen antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
