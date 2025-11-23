import { getPosts, getHomeData, getCategories } from '@/lib/strapi';
import { Post, Home as HomeType, Category } from '@/types';
import Hero from '@/app/components/Hero';
import PostList from '@/app/components/PostList';

// 📌 ISR: Revalidate the home page every 1 second
export const revalidate = 1;

export default async function Home() {
  // Fetch posts, home data, and categories in parallel
  const [posts, homeData, categories]: [Post[], HomeType, Category[]] = await Promise.all([
    getPosts(),
    getHomeData(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen">
      
      {/* Reusable Hero Component - Full Width */}
      <Hero 
        title={homeData?.header || "True North Vibes"}
        subtitle={homeData?.subtitle || "Stories, tips, and guides for rental living."}
        image={homeData?.hero}
      />

      {/* Main Content Container - Centered and Constrained */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Interactive Post List with Category Filter */}
        <PostList posts={posts} categories={categories} />
      </div>
      
    </div>
  );
}