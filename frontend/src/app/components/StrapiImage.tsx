'use client';

import Image from 'next/image';
import { StrapiImage as StrapiImageType } from '@/types';
import { getStrapiURL } from '@/lib/strapi';

interface StrapiImageProps {
  image: StrapiImageType;
  className?: string;
  priority?: boolean;
  fill?: boolean; // Add fill prop to support different layouts
  sizes?: string;
}

export default function StrapiImage({ 
  image, 
  className, 
  priority = false,
  fill = false,
  sizes
}: StrapiImageProps) {
  if (!image) return null;
  
  const imageUrl = image.url.startsWith('http') ? image.url : getStrapiURL(image.url);

  // If using 'fill', we don't pass width/height. 
  // If not using 'fill', we must pass width/height.
  const imageProps = fill 
    ? { fill: true } 
    : { width: image.width, height: image.height };

  return (
    <Image
      src={imageUrl}
      alt={image.alternativeText || 'Blog image'}
      className={className}
      priority={priority}
      sizes={sizes}
      {...imageProps}
    />
  );
}