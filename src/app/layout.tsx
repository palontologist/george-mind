import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "George Karani — Mind Atlas & Connectome",
  description: "3D Neural Connectome & Spatial Portfolio of George Karani (Physical AI, Embodied Intelligence, Autonomous Systems)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#09090b] text-zinc-100">{children}</body>
    </html>
  );
}
