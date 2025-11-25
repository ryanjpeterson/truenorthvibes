'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Post, Category, Pagination } from '@/types';
import BlogCard from './BlogCard';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface PostListProps {
  posts: Post[];
  categories: Category[];
  pagination: Pagination; 
}

export default function PostList({ posts, categories = [], pagination }: PostListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 1. Create a ref for the container
  const listTopRef = useRef<HTMLDivElement>(null);
  
  // Get current active category from URL
  const currentCategory = searchParams.get('category');

  // Debugging: Check if categories are actually arriving
  useEffect(() => {
    console.log('PostList Categories:', categories);
  }, [categories]);

  // Helper to scroll to top
  const scrollToTop = () => {
    if (listTopRef.current) {
      setTimeout(() => {
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // 2. Handle Category Click (Desktop Buttons & Mobile Dropdown)
  const handleCategoryChange = (categoryName: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (categoryName) {
      params.set('category', categoryName);
    } else {
      params.delete('category');
    }
    
    // Reset to page 1 when filtering
    params.set('page', '1');
    
    // Update URL with scroll: false to prevent full page jump
    router.push(`/?${params.toString()}`, { scroll: false });

    // Manually scroll to top of list
    scrollToTop();
  };

  // 3. Handle Page Change
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    
    router.push(`/?${params.toString()}`, { scroll: false });
    scrollToTop();
  };

  return (
    // Attach the ref to the container div with scroll margin
    <div ref={listTopRef} className="space-y-12 scroll-mt-24">
      
      {/* Category Filter Section */}
      <div className="w-full">
        
        {/* Desktop View: Row of Buttons */}
        <div className="hidden md:flex flex-wrap justify-start gap-4">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
              !currentCategory
                ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
                : 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300 hover:text-blue-500'
            }`}
          >
            All
          </button>
          
          {categories && categories.length > 0 ? (
            categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.name)}
                className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
                  currentCategory === category.name
                    ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
                    : 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300 hover:text-blue-500'
                }`}
              >
                {category.name}
              </button>
            ))
          ) : (
            <span className="text-gray-400 text-xs flex items-center">No categories found</span>
          )}
        </div>

        {/* Mobile View: Dropdown Menu */}
        <div className="md:hidden relative">
          <select
            value={currentCategory || ""}
            onChange={(e) => handleCategoryChange(e.target.value || null)}
            className="block w-full appearance-none bg-blue-50 border border-blue-100 text-blue-600 py-3 px-4 pr-8 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-blue-500 shadow-sm transition-colors font-semibold text-sm"
          >
            <option value="">All Categories</option>
            {categories && categories.length > 0 && categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-600">
            <ChevronDown size={20} />
          </div>
        </div>

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
          {pagination && pagination.pageCount > 1 && (
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
            onClick={() => handleCategoryChange(null)}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}