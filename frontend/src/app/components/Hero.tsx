'use client';

import Image from 'next/image';
import { Home } from '@/types';
import { getStrapiURL } from '@/lib/strapi';

interface HeroProps {
  data: Home;
}

export default function Hero({ data }: HeroProps) {
  // Resolve Hero Image URL
  const heroImageUrl = data?.hero?.url
    ? (data.hero.url.startsWith('http') ? data.hero.url : getStrapiURL(data.hero.url))
    : null;

  return (
    // Changed rounded-3xl to rounded-b-3xl to match blog cards style
    <header className="relative text-center mb-16 rounded-xl overflow-hidden h-[400px] flex items-center justify-center">
      {/* Background Image */}
      {heroImageUrl && (
        <Image
          src={heroImageUrl}
          alt={data.hero.alternativeText || "Hero background"}
          fill
          priority
          className="object-cover z-0"
        />
      )}
      
      {/* Dark Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Text Content (Z-Index to sit above image/overlay) */}
      <div className="relative z-20 max-w-3xl px-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-4 drop-shadow-md">
          {data?.header || "True North Vibes"}
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-200 drop-shadow-sm">
          {data?.subtitle || "Stories, tips, and guides for rental living."}
        </p>
      </div>
    </header>
  );
}