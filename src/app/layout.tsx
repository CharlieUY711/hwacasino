import "./globals.css";
import { RegisterSW } from "./register-sw";
import type { ReactNode } from "react";

export const metadata = {
  title: "HWA Casino",
  description: "HWA Casino — Private Members Only",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HWA Casino" },
};

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HWA Casino" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
