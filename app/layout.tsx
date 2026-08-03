import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Task Tracker",
  description: "Track employee tasks by priority and completion status.",
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
