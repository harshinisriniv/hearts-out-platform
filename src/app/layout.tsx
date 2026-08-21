import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hearts Out for Homeless — Operations",
  description:
    "Inventory, care kit building, partner distribution, and fundraising tracking for Hearts Out for Homeless.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
