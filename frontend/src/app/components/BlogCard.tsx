'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Post } from '@/types';
import { getStrapiURL } from '@/lib/strapi';
import { format, parseISO } from 'date-fns';

interface BlogCardProps {
  post: Post;
}

export default function BlogCard({ post }: BlogCardProps) {
  const thumbnail = post.thumbnail;
  const imageUrl = thumbnail?.url
    ? (thumbnail.url.startsWith('http') ? thumbnail.url : getStrapiURL(thumbnail.url))
    : null;

  const sponsors = post.sponsors;
  const categories = post.categories;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      {/* Fixed height h-[26rem] */}
      <article className="flex flex-col h-[26rem] overflow-hidden rounded-xl shadow-sm hover:shadow-2xl transition-all duration-300 bg-white border border-gray-100">
        <div className="relative h-56 w-full overflow-hidden bg-gray-100 flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={thumbnail?.alternativeText || post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-sm">No Image</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            {/* Flex container with justify-between to push date left and categories right */}
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-blue-600 mt-1">
                {post.date ? format(parseISO(post.date), 'MMMM d, yyyy') : ''}
              </p>
              
              {/* Categories (Blue Buttons) - Stacked vertically on the right */}
              {categories && categories.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  {categories.map((category) => (
                    <span 
                      key={category.id} 
                      // Updated styling: rounded-md, removed shadow
                      className="inline-block bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-3">
              {post.title}
            </h3>
          </div>
          
          {/* Sponsors Display Loop */}
          {sponsors && sponsors.length > 0 && (
            <div className="mt-4 pt-4 flex flex-col gap-2">
              {sponsors.map(sponsor => {
                const sponsorIconUrl = sponsor.icon?.url
                  ? (sponsor.icon.url.startsWith('http') ? sponsor.icon.url : getStrapiURL(sponsor.icon.url))
                  : null;
                
                return (
                  <div key={sponsor.id} className="flex items-center bg-blue-50 border border-blue-100 rounded-lg p-2">
                    <div className="relative w-6 h-6 mr-2 flex-shrink-0 rounded-full overflow-hidden bg-white">
                      {sponsorIconUrl && (
                        <Image 
                          src={sponsorIconUrl} 
                          alt={sponsor.name} 
                          fill 
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide truncate">
                      Sponsored by {sponsor.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}