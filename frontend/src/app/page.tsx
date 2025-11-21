import { getPosts, getHomeData } from '@/lib/strapi';
import { Post, Home as HomeType } from '@/types';
import Hero from '@/app/components/Hero';
import BlogCard from '@/app/components/BlogCard';

// 📌 ISR: Revalidate the home page every 1 second
export const revalidate = 1;

export default async function Home() {
  // Fetch both posts and home data in parallel
  const [posts, homeData]: [Post[], HomeType] = await Promise.all([
    getPosts(),
    getHomeData(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Reusable Hero Component */}
      <Hero data={homeData} />

      {/* Blog Grid using Reusable BlogCard Component */}
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}