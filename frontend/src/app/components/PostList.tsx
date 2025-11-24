'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useEffect } from 'react';
import { Post, Category } from '@/types';
import BlogCard from './BlogCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface PostListProps {
  posts: Post[];
  categories: Category[];
  pagination: Pagination;
}

export default function PostList({ posts, categories = [], pagination }: PostListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get current active category from URL
  const currentCategory = searchParams.get('category');

  // Scroll to top of list when posts change (pagination or filter)
  // We listen to searchParams to trigger the scroll
  useEffect(() => {
    // Only scroll if we are not at the top of the page (to avoid jump on initial load)
    // and if the container exists.
    if (containerRef.current) {
      // Scroll the container into view with a bit of offset for the sticky header if you have one
      const yOffset = -100; // Adjust based on your header height
      const element = containerRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [searchParams]);

  // Handle Category Click
  const handleCategoryClick = (categoryName: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryName) {
      params.set('category', categoryName);
    } else {
      params.delete('category');
    }
    // Reset to page 1 when filtering
    params.set('page', '1');
    
    // Use scroll: false to prevent jumping to top of page
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    
    // Use scroll: false to prevent jumping to top of page
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    // Add ref to the container
    <div ref={containerRef} className="space-y-12 scroll-mt-24">
      {/* Category Filter Bar */}
      <div className="flex flex-wrap justify-start gap-4">
        <button
          onClick={() => handleCategoryClick(null)}
          className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
            !currentCategory
              ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
              : 'bg-blue-50 text-blue-800 border-blue-100 hover:border-blue-300 hover:text-blue-500'
          }`}
        >
          All
        </button>
        
        {categories && categories.length > 0 && categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.name)}
            className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
              currentCategory === category.name
                ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
                : 'bg-blue-50 text-blue-800 border-blue-100 hover:border-blue-300 hover:text-blue-500'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Blog Grid */}
      {posts.length > 0 ? (
        <>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.pageCount > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 rounded-full border ${
                  pagination.page === 1
                    ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
                aria-label="Previous Page"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="text-sm font-medium text-gray-600">
                Page {pagination.page} of {pagination.pageCount}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pageCount}
                className={`p-2 rounded-full border ${
                  pagination.page === pagination.pageCount
                    ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
                aria-label="Next Page"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">No posts found.</p>
          <button 
            onClick={() => handleCategoryClick(null)}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}