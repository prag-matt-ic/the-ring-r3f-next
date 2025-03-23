import "./globals.css";

import type { Metadata } from "next";
import { Long_Cang } from "next/font/google";

const longCang = Long_Cang({
  variable: "--long-cang",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "The Ring with React Three Fiber & WebGPU",
  description: "The Ring movie poster effect using WebGPU",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${longCang.variable} ${longCang.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
