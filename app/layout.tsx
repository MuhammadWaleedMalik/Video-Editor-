import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CVVID — Video Editor',
  description: 'Professional video editor with subtitles, trim, split and audio controls',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} overflow-hidden bg-[#1a0c05]`}>{children}</body>
    </html>
  );
}
