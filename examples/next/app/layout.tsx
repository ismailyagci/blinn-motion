import type { Metadata } from "next";
import "../styles.css";

const siteUrl = "https://next.blinnmotion.com";
const title = "Blinn Motion · Next.js lab";
const description =
  "Advanced Blinn Motion demo on Next.js App Router via @blinn-motion/react — dual stages, transport, scrub, progress mode.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Blinn Motion",
  authors: [{ name: "Blinn Motion" }],
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Blinn Motion",
    locale: "en_US",
    title,
    description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Blinn Motion Next.js example lab",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
  themeColor: "#0B0D12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
