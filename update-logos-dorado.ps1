$base = "C:\Carlos\HWA\hwacasino"
$logos = "C:\Carlos\HWA\Logos"

# ─── 1. Copiar archivos a public/ ─────────────────────────
Copy-Item "$logos\Favicom.jpg" "$base\public\favicon.jpg" -Force
Copy-Item "$logos\Logo Dorado Nombre.jpg" "$base\public\logo-dorado.jpg" -Force
Write-Host "Archivos copiados." -ForegroundColor Cyan

# ─── 2. layout.tsx ────────────────────────────────────────
Set-Content "$base\src\app\layout.tsx" -Encoding UTF8 -Value @'
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
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
'@
Write-Host "layout.tsx actualizado." -ForegroundColor Cyan

# ─── 3. Reemplazar logo en page.tsx ───────────────────────
$page = Get-Content "$base\src\app\page.tsx" -Raw -Encoding UTF8

# Reemplazar referencias al logo rojo por el dorado
$page = $page -replace 'logo-rojo\.png', 'logo-dorado.jpg'

# Agrandar el logo principal (de 140 a 180)
$page = $page -replace 'width={140} height={140}', 'width={180} height={180}'

Set-Content "$base\src\app\page.tsx" -Value $page -Encoding UTF8
Write-Host "page.tsx actualizado." -ForegroundColor Cyan

Write-Host "Listo. El servidor recarga automaticamente." -ForegroundColor Green
