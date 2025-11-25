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
    search?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // Resolve search params
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page = Number(resolvedSearchParams.page) || 1;
  const category = resolvedSearchParams.category;
  const search = resolvedSearchParams.search;
  
  // Set pageSize
  const pageSize = 12; 

  // Fetch data
  const [postsResponse, homeData, categories]: [StrapiResponse<Post[]>, HomeType, Category[]] = await Promise.all([
    getPosts({ page, pageSize, category, search }),
    getHomeData(),
    getCategories(),
  ]);

  const posts: Post[] = postsResponse.data;
  const pagination = postsResponse.meta.pagination;

  return (
    <div className="min-h-screen">
      <Hero 
        title={homeData?.header || "True North Vibes"}
        subtitle={homeData?.subtitle || "Stories, tips, and guides for rental living."}
        image={homeData?.hero}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PostList 
          posts={posts} 
          categories={categories} 
          pagination={pagination}
        />
      </div>
    </div>
  );
}