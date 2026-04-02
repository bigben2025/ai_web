import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Concierge Care Florida - AI Care Assistant',
  description:
    'AI-powered care concierge for Concierge Care Florida. Get help finding the right home care for your loved ones 24/7.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
