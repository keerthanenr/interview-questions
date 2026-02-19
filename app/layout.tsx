import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ReactAssess | AI-Augmented Technical Assessment",
  description:
    "Adaptive AI-augmented technical assessment platform that evaluates how developers build, understand, and ship React code using modern AI tools.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${spaceGrotesk.variable} ${ibmPlex.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              },
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
