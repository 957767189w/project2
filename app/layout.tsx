import './globals.css';

export const metadata = {
  title: 'GenPredict - Crypto Prediction Market',
  description: 'Decentralized prediction market powered by GenLayer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
