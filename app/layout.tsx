import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CssVarsProvider } from "@mui/joy";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MkxAI",
  description: "Ask me anything about the MKx AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <CssVarsProvider>
        <body className={inter.className}>{children}</body>
      </CssVarsProvider>
    </html>
  );
}
