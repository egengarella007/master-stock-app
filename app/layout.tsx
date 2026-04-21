import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EG Portfolio Management",
  description: "Personal portfolio and stock market dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
