import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Objetiva Comercios Admin',
  description: 'Commercial administration application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
