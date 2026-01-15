import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mayday - Broken Website Lead Finder',
  description: 'Find local businesses with website problems',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
