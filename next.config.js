/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'admin.hwacasino.com' }],
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
