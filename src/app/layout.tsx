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
  title: "George Karani — Mind Atlas & Connectome",
  description:
    "3D Neural Connectome & Spatial Portfolio of George Karani (Physical AI, Embodied Intelligence, Autonomous Systems)",
};

export const viewport: Viewport = {
  themeColor: "#15171c",
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
      <body className="bg-[#15171c] text-[#f2f0ed] antialiased">{children}</body>
    </html>
  );
}
