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
  const hero = post.hero;
  const imageUrl = hero?.url
    ? (hero.url.startsWith('http') ? hero.url : getStrapiURL(hero.url))
    : null;

  // UPDATED: Destructure singular variables
  const sponsor = post.sponsor;
  const category = post.category;

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex flex-col h-[26rem] overflow-hidden rounded-xl shadow-sm hover:shadow-2xl transition-all duration-300 bg-white border border-gray-100">
        <div className="relative h-56 w-full overflow-hidden bg-gray-100 flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={hero?.alternativeText || post.title}
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
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-blue-600 mt-1">
                {post.date ? format(parseISO(post.date), 'MMMM d, yyyy') : ''}
              </p>
              
              {/* Single Category Badge */}
              {/* UPDATED: Check for singular category */}
              {category && (
                <span 
                  className="inline-block bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md transition-colors"
                >
                  {category.name}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-3">
              {post.title}
            </h3>
          </div>
          
          {/* Single Sponsor Display */}
          {/* UPDATED: Check for singular sponsor */}
          {sponsor && (
            <div className="mt-4 pt-4 flex flex-col gap-2">
              {(() => {
                const sponsorIconUrl = sponsor.icon?.url
                  ? (sponsor.icon.url.startsWith('http') ? sponsor.icon.url : getStrapiURL(sponsor.icon.url))
                  : null;
                
                return (
                  <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-2">
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
                    <span className="text-xs font-semibold tracking-wide truncate">
                      Sponsored by {sponsor.name}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}