import './globals.css'

import type { Metadata } from 'next'
import { Long_Cang } from 'next/font/google'

const longCang = Long_Cang({
  variable: '--font-long-cang',
  subsets: ['latin'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'The Ring Poster in 3D',
  description: 'A scary showcase of Three.js Shading Language in Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="The Ring" />
      </head>
      <body className={`${longCang.variable} ${longCang.className} antialiased`}>{children}</body>
    </html>
  )
}
