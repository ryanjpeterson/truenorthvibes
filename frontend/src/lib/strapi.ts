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

    // Add a timeout to fail fast if the backend is hanging/down during build
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(requestUrl, { 
      ...mergedOptions, 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Log but don't crash yet, let the catch block handle it
      const errorText = await response.text();
      console.error(`🚨 Strapi API Error (${response.status}) at ${requestUrl}:`, errorText);
      throw new Error(`Strapi Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Fetch API Execution Error:', error);
    
    // CRITICAL FIX for Build Time:
    // If fetch fails (backend down or unreachable during docker build), 
    // return a safe empty structure so the build doesn't crash.
    // ISR will attempt to re-generate the page at runtime when the backend is up.
    if (isServer) {
      console.warn('⚠️ Returning empty fallback data for build safety.');
      return { 
        data: [], 
        meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } 
      };
    }
    
    throw new Error('An unexpected error occurred while fetching from Strapi');
  }
}

// ... rest of your file ...
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
  // Ensure we always match the return type structure even if fetchAPI returned the fallback
  if (!res.data) {
     return { data: [], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } };
  }
  return res; 
}

// 2. Get All Slugs
export async function getPostSlugs() {
  const query = {
    fields: ['slug', 'updatedAt'],
    pagination: {
      pageSize: 1000,
    },
  };
  const res = await fetchAPI('/posts', query);
  return res.data || [];
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
  return res.data && res.data.length > 0 ? res.data[0] : null;
}

// 4. Get Home Page Data
export async function getHomeData(): Promise<Home> {
  const query = { populate: { hero: { fields: ['url', 'alternativeText', 'width', 'height'] } } };
  const res = await fetchAPI('/home', query);
  // Return empty object cast as Home if fails, preventing crash
  return res.data || {} as Home;
}

// 5. Get Categories
export async function getCategories(): Promise<Category[]> {
  const query = { fields: ['name', 'description'], sort: ['name:asc'] };
  const res = await fetchAPI('/categories', query);
  return res.data || [];
}