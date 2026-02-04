import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'GenPredict | Crypto Prediction Market',
  description: 'Decentralized prediction market for cryptocurrency prices powered by GenLayer',
  keywords: ['prediction market', 'crypto', 'blockchain', 'GenLayer', 'DeFi'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
