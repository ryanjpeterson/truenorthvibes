import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPostBySlug, getPostSlugs, getStrapiURL } from '@/lib/strapi';
import BlockRenderer from '@/app/components/BlockRenderer';
import Hero from '@/app/components/Hero'; 
import { format, parseISO } from 'date-fns';
import { Post, Block } from '@/types';

export const revalidate = 1;

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((post: { slug: string }) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post: Post | null = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const siteName = 'True North Vibes';
  const hero = post.hero;
  const imageUrl = hero?.url 
    ? (hero.url.startsWith('http') ? hero.url : getStrapiURL(hero.url))
    : null;

  return {
    title: `${post.title} | ${siteName}`,
    description: `Read the article "${post.title}" on ${siteName}. Published on ${format(parseISO(post.date), 'MMMM d, yyyy')}.`,
    openGraph: {
      title: post.title,
      url: `/blog/${post.slug}`,
      siteName: siteName,
      images: imageUrl ? [{ url: imageUrl }] : [],
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post: Post | null = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const sponsor = post.sponsor;
  const category = post.category;
  const formattedDate = post.date ? format(parseISO(post.date), 'MMMM d, yyyy') : '';

  return (
    <div className="min-h-screen">
      <Hero 
        title={post.title}
        subtitle={formattedDate} 
        image={post.hero}
        category={category} 
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="mb-10 text-center">
          {sponsor && (
            <div className="mt-8">
              {(() => {
                 const sponsorIconUrl = sponsor.icon?.url
                   ? (sponsor.icon.url.startsWith('http') ? sponsor.icon.url : getStrapiURL(sponsor.icon.url))
                   : null;

                 return (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 w-full text-left">
                    {sponsorIconUrl && (
                      <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-full overflow-hidden shadow-sm border border-gray-100">
                        <Image 
                          src={sponsorIconUrl} 
                          alt={sponsor.name} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <span>Sponsored by {sponsor.name}</span>
                      </div>
                      {sponsor.description && (
                        <p className="text-gray-600 text-sm mb-2">{sponsor.description}</p>
                      )}
                      {sponsor.url && (
                        <a 
                          href={sponsor.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 text-sm font-medium hover:text-gray-800 hover:underline"
                        >
                          Visit Website &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                 );
              })()}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {post.body?.map((block: Block, index: number) => (
            <BlockRenderer key={index} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}