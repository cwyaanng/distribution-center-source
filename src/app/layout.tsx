import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Worker Management App',
  description: 'Created with sanjonsul',
  generator: 'sanjongsul',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}