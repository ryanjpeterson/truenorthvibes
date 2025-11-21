import Link from 'next/link';
import Image from 'next/image';
import { getPosts, getStrapiURL } from '@/lib/strapi';
import { Post } from '@/types';
import { format, parseISO } from 'date-fns';

// 📌 ISR: Revalidate the home page every 60 seconds to show new posts
export const revalidate = 1;

export default async function Home() {
  const posts: Post[] = await getPosts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl mb-4">
          True North Vibes
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-gray-500">
          Stories, tips, and guides for rental living.
        </p>
      </header>

      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
           // Safety check: Ensure thumbnail exists before accessing url
           const thumbnail = post.thumbnail;
           const imageUrl = thumbnail?.url
             ? (thumbnail.url.startsWith('http') ? thumbnail.url : getStrapiURL(thumbnail.url))
             : null;

           return (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <article className="flex flex-col overflow-hidden rounded-xl shadow-sm hover:shadow-2xl transition-all duration-300 bg-white h-full border border-gray-100">
                <div className="relative h-56 w-full overflow-hidden bg-gray-100">
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
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                      {post.date ? format(parseISO(post.date), 'MMMM d, yyyy') : ''}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {post.title}
                    </h3>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}