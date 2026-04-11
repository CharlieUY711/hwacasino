import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HWA Casino',
  description: 'Private Members Only',
  icons: {
    icon: '/favicon.jpg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
