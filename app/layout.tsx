import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GenPredict | Crypto Price Prediction Market',
  description: 'Decentralized prediction market for cryptocurrency prices powered by GenLayer intelligent contracts and AI consensus.',
  keywords: ['prediction market', 'crypto', 'bitcoin', 'ethereum', 'genlayer', 'blockchain', 'defi'],
  openGraph: {
    title: 'GenPredict | Crypto Price Prediction Market',
    description: 'Predict crypto prices and earn rewards on GenLayer',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
