import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPostBySlug, getPostSlugs, getStrapiURL } from '@/lib/strapi';
import BlockRenderer from '@/app/components/BlockRenderer';
import { format, parseISO } from 'date-fns';
import { Post, Block } from '@/types';

// 📌 ISR: Revalidate this page every 60 seconds
// This allows the page to be static (fast) but update with new content/edits automatically.
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
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          {post.title}
        </h1>
        {post.date && (
          <time className="text-gray-500 text-lg">
            {format(parseISO(post.date), 'MMMM d, yyyy')}
          </time>
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