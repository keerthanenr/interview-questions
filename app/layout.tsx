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
  title: "coffeerun | find the perfect spot between everyone",
  description:
    "Create a link, share it with friends, and we'll find the best coffee shop between everyone's locations.",
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
                background: "#241f1c",
                border: "1px solid #3d3330",
                color: "#f5e6d3",
              },
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
