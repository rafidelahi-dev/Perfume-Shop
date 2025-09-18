import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Perfume Share MVP",
  description: "Perfume marketplace MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <div className="max-w-5xl mx-auto p-4">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
