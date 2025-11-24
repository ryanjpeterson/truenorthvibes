import Link from 'next/link';
import { getPosts } from '@/lib/strapi';
import BlogCard from '@/app/components/BlogCard';
import { Post } from '@/types';

export default async function NotFound() {
  // Fetch the 3 most recent posts
  const { data: recentPosts }: { data: Post[] } = await getPosts({ pageSize: 3 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex-grow">
        
        {/* 404 Header */}
        <div className="mb-16">
          <h1 className="text-6xl font-extrabold text-blue-600 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-600 mb-6">
            Page Not Found
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Sorry, we couldn&apos;t find what you&apos;re looking for. Check out one of our latest blog posts!
          </p>
        </div>

        {/* Recent Posts Grid */}
        {recentPosts.length > 0 && (
          <div className="mt-12 text-left mb-16">
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-16">
                    <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            View All Posts
          </Link>
        </div>
      </div>
    </div>
  );
}