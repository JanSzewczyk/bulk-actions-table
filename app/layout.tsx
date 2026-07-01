import type { Metadata } from "next";

import { ThemeProvider } from "~/components/providers/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  description: "Bulk Actions Table by Szum-Tech",
  title: "Bulk Actions Table"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
