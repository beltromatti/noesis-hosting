import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noesis Hosting — Zero-cost static site deployments for the open AI community",
  description:
    "Deploy static websites in minutes on the Noesis infrastructure. Upload compressed builds, map your custom domain, or test under a secure *.hosting.noesisai.org sandbox.",
  metadataBase: new URL("https://hosting.noesisai.org"),
  openGraph: {
    title: "Noesis Hosting",
    description:
      "Production-grade hosting for static sites with guided DNS, antivirus scanning, and automated nginx provisioning.",
    url: "https://hosting.noesisai.org",
    siteName: "Noesis Hosting",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noesis Hosting",
    description: "Upload your site, pick a domain, ship in minutes.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-transparent`}
      >
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
