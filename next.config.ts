import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // IMPORTANT: Do NOT put NEXT_PUBLIC_* or NEXTAUTH_URL values here.
  // The `env` block bakes values into the compiled bundle at build time,
  // which overrides any runtime environment variable (including docker-compose env).
  // All env vars are injected at runtime via docker-compose.yml / .env.local.
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
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "host.docker.internal",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
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
