import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import './globals.css'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'ASCII.FLUX — Video to ASCII Converter',
  description: 'Convert any video into real-time ASCII art rendered in the browser.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0f0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased font-mono">{children}</body>
      {process.env.NODE_ENV === 'production' && <Analytics />}
    </html>
  )
}
