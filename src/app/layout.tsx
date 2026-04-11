import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HWA Casino',
  description: 'Private Members Only',
  icons: {
    icon: '/favicon.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
