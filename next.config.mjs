/** @type {import('next').NextConfig} */
const backendBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:5050';

const nextConfig = {
  async rewrites() {
    // Proxy backend routes so the frontend can use a single base URL (same origin).
    // In production, set `NEXT_PUBLIC_API_BASE_URL` (or `BACKEND_URL`) to your public backend.
    return [
      { source: '/auth/line', destination: `${backendBase}/auth/line` },
      { source: '/callback', destination: `${backendBase}/callback` },
      { source: '/api/:path*', destination: `${backendBase}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendBase}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
