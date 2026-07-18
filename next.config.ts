import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://oqotfihemtqoavxzzics.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_5J_dfYa506wXgZhemR6fJg_b6dck5_y",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "eMZw1jgKeV0dYd1QonADkKo1ANuuD44b1MjkyF+F8cw=",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://internxx-ai.vercel.app",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://internxx-ai.vercel.app"
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "oqotfihemtqoavxzzics.supabase.co",
      },
    ],
  },
};

export default nextConfig;
