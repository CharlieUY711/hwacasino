import "./globals.css";
import { RegisterSW } from "./register-sw";

export const metadata = {
  title: "HWA Casino",
  description: "Casino PWA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
