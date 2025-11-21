'use client';

import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StrapiImage as StrapiImageType } from '@/types';
import StrapiImage from './StrapiImage';

interface ImageCarouselProps {
  images: StrapiImageType[];
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  // Initialize Embla with loop: true
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative group my-8 rounded-xl overflow-hidden shadow-lg bg-gray-100">
      {/* Carousel Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="flex-[0_0_100%] min-w-0 relative aspect-video"
            >
              <StrapiImage 
                image={image} 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons (Visible on Hover) */}
      <button
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}