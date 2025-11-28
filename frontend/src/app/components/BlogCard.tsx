'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Post } from '@/types';
import { getStrapiURL } from '@/lib/strapi';
import { format, parseISO } from 'date-fns';

interface BlogCardProps {
  post: Post;
}

// Helper to extract plain text from Blocks (JSON) or String content
const getExcerpt = (body: any[], length = 100) => {
  if (!body || body.length === 0) return '';
  
  // Find the first text block
  const textBlock = body.find(b => b.__component === 'blog.text-block');
  if (!textBlock || !textBlock.content) return '';

  let text = '';

  // Handle Strapi Blocks (JSON) format
  if (Array.isArray(textBlock.content)) {
    text = textBlock.content
      .map((node: any) => node.children?.map((child: any) => child.text).join(' ') || '');
  } 
  // Handle simple Rich Text (Markdown/String)
  else if (typeof textBlock.content === 'string') {
    text = textBlock.content;
  }

  return text.length > length ? text.substring(0, length) + '...' : text;
};

export default function BlogCard({ post }: BlogCardProps) {
  const hero = post.hero;
  const imageUrl = hero?.url
    ? (hero.url.startsWith('http') ? hero.url : getStrapiURL(hero.url))
    : null;

  const sponsor = post.sponsor;
  const category = post.category;
  const excerpt = getExcerpt(post.body || []);

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <article className="flex flex-col h-full overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 bg-white border border-gray-100">
        
        {/* Image Section */}
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
          
          {category && (
            <div className="absolute top-4 left-4">
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {category.name}
              </span>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 mb-2">
              {post.date ? format(parseISO(post.date), 'MMMM d, yyyy') : ''}
            </p>

            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-2">
              {post.title}
            </h3>

            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
              {excerpt}
            </p>
          </div>
          
          {/* Sponsor */}
          <div className="mt-4 pt-4 flex items-center justify-between gap-4">
            {/* Sponsor (Compact) */}
            {sponsor && (
               <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                 {sponsor.icon?.url && (
                   <div className="relative w-4 h-4 rounded-full overflow-hidden">
                    <Image 
                      src={sponsor.icon.url.startsWith('http') ? sponsor.icon.url : getStrapiURL(sponsor.icon.url)}
                      alt="Sponsor" 
                      fill
                      className="object-cover"
                    />
                   </div>
                 )}
                 <span className="text-[10px] font-bold text-gray-500 tracking-wider">Sponsored by {sponsor.name}</span>
               </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}