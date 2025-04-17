/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add rule for PDF files
    config.module.rules.push({
      test: /\.pdf$/,
      type: 'asset/resource'
    });

    if (!isServer) {
      // Avoid SSR errors with pdfjs-dist
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        process: false,
        canvas: false
      };
    }

    return config;
  },
  // Add security headers to allow loading PDF.js worker from CDN and Supabase connections
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' unpkg.com; style-src 'self' 'unsafe-inline'; worker-src 'self' blob: unpkg.com; connect-src 'self' unpkg.com *.supabase.co; img-src 'self' data: blob: https:;"
          }
        ]
      }
    ];
  }
};

export default nextConfig; 