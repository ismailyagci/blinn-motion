import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "Blinn Motion · Next.js example",
  description: "Advanced Blinn Motion demo on Next.js App Router via @blinn-motion/react",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
