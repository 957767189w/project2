import './globals.css';

export const metadata = {
  title: 'GenPredict - Crypto Prediction Market',
  description: 'Decentralized prediction market on GenLayer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
