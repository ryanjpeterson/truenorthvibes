import { getPosts, getHomeData, getCategories } from '@/lib/strapi';
import { Post, Home as HomeType, Category, StrapiResponse } from '@/types';
import Hero from '@/app/components/Hero';
import PostList from '@/app/components/PostList';

// 📌 ISR: Revalidate the home page every 1 second
export const revalidate = 1;

interface HomeProps {
  searchParams?: Promise<{
    page?: string;
    category?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // Resolve search params (Next.js 15+ convention requires awaiting searchParams)
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page = Number(resolvedSearchParams.page) || 1;
  const category = resolvedSearchParams.category;
  
  // Set pageSize to 12 as requested.
  const pageSize = 12; 

  // Fetch posts, home data, and categories in parallel
  // Updated type definition to remove 'any'
  const [postsResponse, homeData, categories]: [StrapiResponse<Post[]>, HomeType, Category[]] = await Promise.all([
    getPosts({ page, pageSize, category }),
    getHomeData(),
    getCategories(),
  ]);

  const posts: Post[] = postsResponse.data;
  const pagination = postsResponse.meta.pagination;

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
        {/* Interactive Post List with Category Filter & Pagination */}
        <PostList 
          posts={posts} 
          categories={categories} 
          pagination={pagination}
        />
      </div>
      
    </div>
  );
}