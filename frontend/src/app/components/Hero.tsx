'use client';

import Image from 'next/image';
import { StrapiImage, Category } from '@/types';
import { getStrapiURL } from '@/lib/strapi';

interface HeroProps {
  title: string;
  subtitle?: string;
  image?: StrapiImage;
  categories?: Category[];
}

export default function Hero({ title, subtitle, image, categories }: HeroProps) {
  // Resolve Hero Image URL
  const heroImageUrl = image?.url
    ? (image.url.startsWith('http') ? image.url : getStrapiURL(image.url))
    : null;

  return (
    <header className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      {heroImageUrl && (
        <Image
          src={heroImageUrl}
          alt={image?.alternativeText || "Hero background"}
          fill
          priority
          className="object-cover z-0"
          quality={1}
        />
      )}
      
      {/* Dark Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/50 z-10" />

      {/* Text Content (Z-Index to sit above image/overlay) */}
      <div className="relative z-20 max-w-4xl px-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-4 drop-shadow-md">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl mx-auto text-xl md:text-2xl text-gray-100 drop-shadow-sm font-medium mb-6">
            {subtitle}
          </p>
        )}

        {/* Categories (Blue Buttons) - Centered below date */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <span 
                key={category.id} 
                // Updated styling: bg-blue-50, border-blue-100 (consistent with other tags)
                // Note: On a dark hero background, we might want these to stand out more or be transparent/white border. 
                // Sticking to the requested consistent "light blue" theme for now, but opaque.
                className="inline-block bg-blue-50 text-blue-800 border border-blue-100 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md cursor-default shadow-sm"
              >
                {category.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}