import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// Updated import path to include 'app'
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'True North Vibes',
  description: 'A blog about rental living in Canada',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Updated lang attribute to Canadian English
    <html lang="en-CA">
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}