import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CVVID — Video Editor',
  description: 'Professional video editor with subtitles, trim, layers, and audio controls',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="overflow-y-auto overflow-x-hidden bg-[#1a0c05] font-sans scrollbar-thin">{children}</body>
    </html>
  );
}
