import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import {toast, Toaster} from "sonner"

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "skillsync",
  description: "An AI powered platform for preparing mock nterviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${monaSans.className} antialiased pattern`}>
      
        {children}

        <Toaster />
      </body>
    </html>
  );
}


// this is a global layout file in Next.js 13+ that sets up the HTML structure, imports a Google font (Mona Sans), and applies global styles and metadata for the application. The body has a dark theme and a pattern background. 