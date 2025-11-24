import qs from 'qs';
import { Post, Home, Category, StrapiResponse } from '@/types';

// Public URL: Used by the browser
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

// Internal URL: Used by the server
const STRAPI_INTERNAL_URL = process.env.STRAPI_INTERNAL_URL || STRAPI_URL;

export function getStrapiURL(path = '') {
  return `${STRAPI_URL}${path}`;
}

export function getStrapiInternalURL(path = '') {
  return `${STRAPI_INTERNAL_URL}${path}`;
}

interface FetchOptions {
  headers?: Record<string, string>;
  [key: string]: unknown;
}

async function fetchAPI(path: string, urlParamsObject = {}, options: FetchOptions = {}) {
  const queryString = qs.stringify(urlParamsObject, { encodeValuesOnly: true });
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? getStrapiInternalURL() : getStrapiURL();
  const requestUrl = `${baseUrl}/api${path}${queryString ? `?${queryString}` : ''}`;

  try {
    const mergedOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    const response = await fetch(requestUrl, mergedOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 Strapi API Error (${response.status}) at ${requestUrl}:`, errorText);
      throw new Error(`Strapi Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Fetch API Execution Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred while fetching from Strapi');
  }
}

interface GetPostsParams {
  page?: number;
  pageSize?: number;
  category?: string;
}

// 1. Get List of Posts
export async function getPosts({ page = 1, pageSize = 10, category }: GetPostsParams = {}): Promise<StrapiResponse<Post[]>> {
  const query: Record<string, unknown> = {
    sort: ['date:desc'],
    pagination: { page, pageSize },
    fields: ['title', 'slug', 'date'],
    populate: {
      thumbnail: { fields: ['url', 'alternativeText', 'width', 'height'] },
      categories: { fields: ['name', 'description'] },
      sponsors: { fields: ['name'], populate: { icon: { fields: ['url', 'alternativeText', 'width', 'height'] } } },
    },
  };
  if (category) {
    query.filters = { categories: { name: { $eq: category } } };
  }

  const res = await fetchAPI('/posts', query);
  return res; 
}

// 2. Get All Slugs (Updated to include updatedAt)
export async function getPostSlugs() {
  const query = {
    fields: ['slug', 'updatedAt'], // Added updatedAt
    pagination: {
      pageSize: 1000, // Increased limit to capture more posts for sitemap
    },
  };
  const res = await fetchAPI('/posts', query);
  return res.data;
}

// 3. Get Single Post
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const query = {
    filters: { slug: { $eq: slug } },
    populate: {
      thumbnail: { fields: ['url', 'alternativeText', 'width', 'height'] },
      categories: { fields: ['name', 'description'] },
      sponsors: { fields: ['name', 'description'], populate: { icon: { fields: ['url', 'alternativeText', 'width', 'height'] } } },
      body: {
        on: {
          'blog.you-tube-embed': { populate: '*' },
          'blog.text-block': { populate: '*' },
          'blog.single-image': { populate: { image: { fields: ['url', 'alternativeText', 'width', 'height'] } } },
          'blog.multiple-images': { populate: { images: { fields: ['url', 'alternativeText', 'width', 'height'] } } },
        },
      },
    },
  };
  const res = await fetchAPI('/posts', query);
  return res.data.length > 0 ? res.data[0] : null;
}

// 4. Get Home Page Data
export async function getHomeData(): Promise<Home> {
  const query = { populate: { hero: { fields: ['url', 'alternativeText', 'width', 'height'] } } };
  const res = await fetchAPI('/home', query);
  return res.data;
}

// 5. Get Categories
export async function getCategories(): Promise<Category[]> {
  const query = { fields: ['name', 'description'], sort: ['name:asc'] };
  const res = await fetchAPI('/categories', query);
  return res.data;
}