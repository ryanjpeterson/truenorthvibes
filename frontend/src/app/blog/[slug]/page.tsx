import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPostBySlug, getPostSlugs, getStrapiURL } from '@/lib/strapi';
import BlockRenderer from '@/app/components/BlockRenderer';
import Hero from '@/app/components/Hero'; // Import the Hero component
import { format, parseISO } from 'date-fns';
import { Post, Block } from '@/types';

// 📌 ISR: Revalidate this page every 1 second
export const revalidate = 1;

// 1. SSG: Generate static params for all slugs
export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((post: { slug: string }) => ({
    slug: post.slug,
  }));
}

// 2. Generate Metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post: Post | null = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'True North Vibes';
  
  const hero = post.hero;
  const imageUrl = hero?.url 
    ? (hero.url.startsWith('http') ? hero.url : getStrapiURL(hero.url))
    : null;

  const description = `Read the article "${post.title}" on ${siteName}. Published on ${format(parseISO(post.date), 'MMMM d, yyyy')}.`;

  return {
    title: `${post.title} | ${siteName}`,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      url: `/blog/${post.slug}`,
      siteName: siteName,
      images: imageUrl ? [
        {
          url: imageUrl,
          width: hero.width,
          height: hero.height,
          alt: hero.alternativeText || post.title,
        }
      ] : [],
      locale: 'en_CA',
      type: 'article',
      publishedTime: post.date,
      authors: [siteName],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// 3. Page Component
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post: Post | null = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Resolve Data
  const sponsor = post.sponsor;
  const category = post.category;
  const formattedDate = post.date ? format(parseISO(post.date), 'MMMM d, yyyy') : '';

  return (
    <div className="min-h-screen">
      
      {/* Full Width Hero with Post Title & Date & Categories */}
      <Hero 
        title={post.title}
        subtitle={formattedDate} 
        image={post.hero}
        category={category} // Pass categories to Hero
      />

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Post Meta Header (Sponsors Only - Categories moved to Hero) */}
        {sponsor && (
          <div className="mb-10 text-center">
            {(() => {
              const sponsorIconUrl = sponsor.icon?.url
                  ? (sponsor.icon.url.startsWith('http') ? sponsor.icon.url : getStrapiURL(sponsor.icon.url))
                  : null;

              return (
                <div className="flex flex-col gap-6 mt-8">
                  <div key={sponsor.id} className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 w-full text-left">
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
                          className="text-blue-600 text-sm font-medium hover:text-blue-800 hover:underline"
                        >
                          Visit Website &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Blog Content Body */}
        <div className="space-y-8">
          {post.body?.map((block: Block, index: number) => (
            <BlockRenderer key={index} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}