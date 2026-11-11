import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteInfo } from "@/lib/content";

export const metadata: Metadata = {
  metadataBase: new URL(siteInfo.url),
  title: { default: siteInfo.name, template: `%s | ${siteInfo.name}` },
  description: siteInfo.tagline,
  openGraph: { siteName: siteInfo.name, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
