import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GenPredict - Crypto Price Prediction Market',
  description: 'A decentralized prediction market for cryptocurrency prices, powered by GenLayer intelligent contracts.',
  keywords: ['prediction market', 'crypto', 'bitcoin', 'ethereum', 'genlayer', 'blockchain'],
  openGraph: {
    title: 'GenPredict - Crypto Price Prediction Market',
    description: 'Predict crypto prices and earn rewards on GenLayer',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] antialiased">
        {children}
      </body>
    </html>
  );
}
