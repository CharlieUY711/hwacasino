import "./globals.css";
import { RegisterSW } from "./register-sw";
import type { ReactNode } from "react";

export const metadata = {
  title: "HWA Casino",
  description: "Casino PWA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
