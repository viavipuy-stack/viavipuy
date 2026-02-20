/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "21eb041d-6e31-4862-8ed4-7a0db4fa587d-00-14bz0ymap9e0i.spock.replit.dev",
    "127.0.0.1",
    "0.0.0.0",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
