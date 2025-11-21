import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPostBySlug, getPostSlugs, getStrapiURL } from '@/lib/strapi';
import BlockRenderer from '@/app/components/BlockRenderer';
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
  
  const thumbnail = post.thumbnail;
  const imageUrl = thumbnail?.url 
    ? (thumbnail.url.startsWith('http') ? thumbnail.url : getStrapiURL(thumbnail.url))
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
          width: thumbnail.width,
          height: thumbnail.height,
          alt: thumbnail.alternativeText || post.title,
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

  const thumbnail = post.thumbnail;
  const heroUrl = thumbnail?.url 
    ? (thumbnail.url.startsWith('http') ? thumbnail.url : getStrapiURL(thumbnail.url))
    : null;

  // Resolve Data
  const sponsors = post.sponsors;
  const categories = post.categories;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10 text-center">
        {heroUrl && (
          <div className="relative w-full aspect-[2/1] mb-8 rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={heroUrl}
              alt={thumbnail?.alternativeText || post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
          </div>
        )}

        {/* Header Content: Title (Left) vs Date/Categories (Right) */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 text-left">
          {/* Left: Title */}
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              {post.title}
            </h1>
          </div>

          {/* Right: Date & Categories */}
          <div className="flex flex-col items-start md:items-end flex-shrink-0 gap-2">
            {post.date && (
              <time className="text-blue-600 text-lg font-medium">
                {format(parseISO(post.date), 'MMMM d, yyyy')}
              </time>
            )}
            
            {/* Categories (Blue Buttons) - Stacked */}
            {categories && categories.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2 mt-1">
                {categories.map((category) => (
                  <span 
                    key={category.id} 
                    // Updated styling: rounded-md, removed shadow-sm
                    className="w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center bg-blue-50 text-blue-600 border-blue-200 cursor-default"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sponsors Block - Loop through all sponsors */}
        {sponsors && sponsors.length > 0 && (
          <div className="flex flex-col gap-6 mt-8">
            {sponsors.map(sponsor => {
               const sponsorIconUrl = sponsor.icon?.url
                 ? (sponsor.icon.url.startsWith('http') ? sponsor.icon.url : getStrapiURL(sponsor.icon.url))
                 : null;

               return (
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
                    <div className="font-bold text-blue-600 mb-1 flex items-center gap-2">
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
                        className="text-blue-600 text-sm font-medium hover:text-blue-600 hover:underline"
                      >
                        Visit Website &rarr;
                      </a>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </header>

      <div className="mt-8 space-y-8">
        {post.body?.map((block: Block, index: number) => (
          <BlockRenderer key={index} block={block} />
        ))}
      </div>
    </article>
  );
}