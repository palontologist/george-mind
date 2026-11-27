import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "George Karani — Mind Atlas",
  description:
    "An immersive 3D portfolio exploring the work, thoughts, and neural landscape of George Karani — Physical AI, embodied intelligence, and autonomous systems.",
};

export const viewport: Viewport = {
  themeColor: "#111318",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${hanken.variable}`}>
      <body className="bg-ground text-ink antialiased">{children}</body>
    </html>
  );
}
