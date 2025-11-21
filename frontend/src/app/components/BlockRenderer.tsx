'use client';

import Link from 'next/link';
import { BlocksRenderer, type BlocksContent } from '@strapi/blocks-react-renderer';
import { Block } from '@/types';
import StrapiImage from './StrapiImage';
import ImageCarousel from './ImageCarousel';

export default function BlockRenderer({ block }: { block: Block }) {
  switch (block.__component) {
    case 'blog.text-block':
      return (
        <div className="prose lg:prose-xl max-w-none my-8 text-gray-800">
          <BlocksRenderer 
            content={block.content as BlocksContent} 
            blocks={{
              // Explicitly style headings to override Tailwind's default reset
              heading: ({ children, level }) => {
                switch (level) {
                  case 1:
                    return <h1 className="text-4xl font-extrabold text-gray-900 mt-10 mb-6">{children}</h1>;
                  case 2:
                    return <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{children}</h2>;
                  case 3:
                    return <h3 className="text-2xl font-bold text-gray-900 mt-6 mb-3">{children}</h3>;
                  case 4:
                    return <h4 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{children}</h4>;
                  case 5:
                    return <h5 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h5>;
                  case 6:
                    return <h6 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h6>;
                  default:
                    return <h1 className="text-4xl font-bold text-gray-900 mt-10 mb-6">{children}</h1>;
                }
              },
              // Use Next.js Link for better performance on internal links
              link: ({ children, url }) => (
                <Link 
                  href={url} 
                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {children}
                </Link>
              ),
              // Handle ordered and unordered lists
              list: ({ children, format }) => {
                if (format === 'ordered') {
                  return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>;
                }
                return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>;
              },
              // Handle list items
              'list-item': ({ children }) => (
                <li className="text-gray-800 pl-1">{children}</li>
              ),
            }}
          />
        </div>
      );

    case 'blog.you-tube-embed':
      const videoId = block.url?.split('v=')[1]?.split('&')[0];
      if (!videoId) return null;
      
      return (
        <div className="my-8">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-gray-100">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {block.caption && (
            <p className="text-center text-sm text-gray-500 mt-2 italic">{block.caption}</p>
          )}
        </div>
      );

    case 'blog.single-image':
      if (!block.image) return null;
      return (
        <div className="my-8">
          <StrapiImage
            image={block.image}
            className="rounded-lg shadow-md w-full h-auto"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      );

    case 'blog.multiple-images':
      if (!block.images || block.images.length === 0) return null;
      return (
        <ImageCarousel images={block.images} />
      );

    default:
      return null;
  }
}