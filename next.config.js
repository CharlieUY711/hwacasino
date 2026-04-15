/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'admin.hwacasino.com' }],
        destination: 'https://admin.hwacasino.com/admin/dashboard',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
