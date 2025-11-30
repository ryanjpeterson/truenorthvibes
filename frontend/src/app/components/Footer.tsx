'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-gray-500 text-sm">
          &copy; {currentYear} {process.env.NEXT_PUBLIC_SITE_NAME || 'True North Vibes'}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}