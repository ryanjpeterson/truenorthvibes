'use client';

import { useState } from 'react';
import { Post, Category } from '@/types';
import BlogCard from './BlogCard';

interface PostListProps {
  posts: Post[];
  categories: Category[];
}

export default function PostList({ posts, categories }: PostListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter posts based on selection
  const filteredPosts = selectedCategory
    ? posts.filter((post) =>
        post.categories?.some((cat) => cat.name === selectedCategory)
      )
    : posts;

  return (
    <div className="space-y-12">
      {/* Category Filter Bar */}
      <div className="flex flex-wrap justify-start gap-4">
        <button
          onClick={() => setSelectedCategory(null)}
          // Changed rounded-full to rounded-md and removed shadow-md
          className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
            selectedCategory === null
              ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.name)}
            // Changed rounded-full to rounded-md and removed shadow-md
            className={`w-24 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 border flex justify-center items-center ${
              selectedCategory === category.name
                ? 'bg-blue-600 text-white border-blue-600 transform scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500'
            }`}
          >
            {category.name}
          </button>
        ))}
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
            onClick={() => setSelectedCategory(null)}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            View all posts
          </button>
        </div>
      )}
    </div>
  );
}