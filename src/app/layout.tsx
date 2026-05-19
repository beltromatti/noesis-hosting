import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noesis Hosting - Self-hostable hosting platform web app",
  description:
    "A self-hostable Next.js hosting control plane for ZIP deployments, domains, security scanning, analytics, and platform operations.",
  openGraph: {
    title: "Noesis Hosting",
    description:
      "A self-hostable hosting platform starter with guided DNS, antivirus scanning, runtime profiles, analytics, and nginx provisioning.",
    siteName: "Noesis Hosting",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noesis Hosting",
    description: "Clone it, self-host it, and build your own hosting service.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased bg-transparent">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
