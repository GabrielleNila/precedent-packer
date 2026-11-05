import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Precedent Pack", template: "%s · Precedent Pack" },
  description: "Document drafting suite for the litigation team.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-SG">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
