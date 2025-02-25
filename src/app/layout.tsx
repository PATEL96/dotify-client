import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Dotify",
  description: "Generated Nothing Based Dot Pattern Images.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <Navbar />
        {children}
        <Toaster />
      </body>
    </html>
  );
}