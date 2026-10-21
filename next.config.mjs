/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static, client-only demo — exportable to any static host
  // (Vercel, Netlify, GitHub Pages) with no server runtime.
  output: "export",
  reactStrictMode: true,
  images: {
    // `next/image` optimisation needs a server; disable it for static export.
    unoptimized: true,
  },
  eslint: {
    // The portfolio build is gated on `next build`; linting is advisory.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
