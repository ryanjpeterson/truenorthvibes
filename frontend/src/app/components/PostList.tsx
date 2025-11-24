'use client';

import { useState, useEffect, useRef } from 'react';
import { Post, Category } from '@/types';
import BlogCard from './BlogCard';

interface PostListProps {
  posts: Post[];
  categories: Category[];
}

export default function PostList({ posts, categories = [] }: PostListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // 1. Create a ref for the container
  const listTopRef = useRef<HTMLDivElement>(null);

  // Debugging: Check if categories are actually arriving
  useEffect(() => {
    console.log('PostList Categories:', categories);
  }, [categories]);

  // 2. Scroll to top when category changes
  const handleCategoryClick = (categoryName: string | null) => {
    setSelectedCategory(categoryName);
    
    // Scroll to the top of the list with smooth behavior
    if (listTopRef.current) {
      // Small timeout ensures the DOM has updated if layout shifts
      setTimeout(() => {
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Filter posts based on selection
  const filteredPosts = selectedCategory
    ? posts.filter((post) =>
        post.categories?.some((cat) => cat.name === selectedCategory)
      )
    : posts;

  return (
    // 3. Attach the ref to the container div
    <div ref={listTopRef} className="space-y-12 scroll-mt-24">
      {/* Category Filter Bar */}
      <div className="flex flex-wrap justify-start gap-4">
        <button
          onClick={() => handleCategoryClick(null)}
          className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
            selectedCategory === null
              ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
              : 'bg-blue-50 text-blue-800 border-blue-100 hover:border-blue-300 hover:text-blue-500'
          }`}
        >
          All
        </button>
        
        {categories && categories.length > 0 ? (
          categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.name)}
              className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
                selectedCategory === category.name
                  ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
                  : 'bg-blue-50 text-blue-800 border-blue-100 hover:border-blue-300 hover:text-blue-500'
              }`}
            >
              {category.name}
            </button>
          ))
        ) : (
          /* Optional: Show a message if no categories are found (for debugging) */
          <span className="text-gray-400 text-xs flex items-center">No categories found</span>
        )}
      </div>

      {/* Blog Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">No posts found in this category.</p>
          <button 
            onClick={() => handleCategoryClick(null)}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            View all posts
          </button>
        </div>
      )}
    </div>
  );
}