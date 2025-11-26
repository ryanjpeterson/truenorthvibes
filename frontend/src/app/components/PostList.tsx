'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Post, Category, Pagination } from '@/types';
import BlogCard from './BlogCard';
import { ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-react';

interface PostListProps {
  posts: Post[];
  categories: Category[];
  pagination: Pagination; 
}

export default function PostList({ posts, categories = [], pagination }: PostListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listTopRef = useRef<HTMLDivElement>(null);
  
  // Get current state from URL
  const currentCategory = searchParams.get('category') || "";
  const currentSearch = searchParams.get('search') || "";

  // Local state for search input to allow typing without instant reload
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  const scrollToTop = () => {
    if (listTopRef.current) {
      setTimeout(() => {
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const updateURL = (newParams: URLSearchParams) => {
    // Always reset to page 1 on filter change
    newParams.set('page', '1');
    router.push(`/?${newParams.toString()}`, { scroll: false });
    scrollToTop();
  };

  // 1. Handle Category Change (Dropdown)
  const handleCategoryChange = (categoryName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (categoryName) {
      params.set('category', categoryName);
    } else {
      params.delete('category');
    }
    
    updateURL(params);
  };

  // 2. Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
      // Reset category when searching to search all posts
      params.delete('category'); 
    } else {
      params.delete('search');
    }
    
    updateURL(params);
  };

  // 3. Handle Page Change
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/?${params.toString()}`, { scroll: false });
    scrollToTop();
  };

  const clearAll = () => {
    router.push('/', { scroll: false });
    setSearchTerm("");
    scrollToTop();
  };

  return (
    <div ref={listTopRef} className="space-y-12 scroll-mt-24">
      
      {/* Filters & Search Container */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white">
        
        {/* 1. Category Dropdown (Left) */}
        <div className="relative min-w-[200px]">
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="block w-full appearance-none bg-gray-50 border border-gray-100 text-gray-800 py-3 px-4 pr-10 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-semibold text-sm cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories && categories.length > 0 && categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-600">
            <ChevronDown size={18} />
          </div>
        </div>

        {/* 2. Search Bar (Right) */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => { setSearchTerm(""); clearAll(); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>

      </div>

      {/* Active Filters Feedback */}
      {(currentCategory || currentSearch) && (
        <div className="flex items-center gap-2 text-sm text-gray-500 -mt-6 ml-1">
          <span>Showing results for:</span>
          {currentCategory && (
            <span className="font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded">Category: {currentCategory}</span>
          )}
          {currentSearch && (
            <span className="font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded">Search: &quot;{currentSearch}&quot;</span>
          )}
          <button onClick={clearAll} className="font-medium text-red-800 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 hover:cursor-pointer">Clear All</button>
        </div>
      )}

      {/* Blog Grid */}
      {posts.length > 0 ? (
        <>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination */}
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
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-xl text-gray-500">No posts found matching your criteria.</p>
          <button 
            onClick={clearAll}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}