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
      // If response is not OK (e.g. 400), throw to catch block
      const errorText = await response.text();
      console.error(`🚨 Strapi API Error (${response.status}) at ${requestUrl}:`, errorText);
      throw new Error(`Strapi Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('❌ Fetch API Execution Error:', error);
    
    // CRITICAL: If we are on the server (Build Time or ISR), we suppress the error 
    // and return a safe fallback to allow the build to complete.
    if (isServer) {
      console.warn('⚠️ Returning empty fallback data to prevent build crash.');
      
      return { 
        data: null, 
        meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } 
      };
    }
    
    throw error;
  }
}

interface GetPostsParams {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

// 1. Get List of Posts (HOME PAGE)
export async function getPosts({ page = 1, pageSize = 12, category, search }: GetPostsParams = {}): Promise<StrapiResponse<Post[]>> {
  const query: Record<string, unknown> = {
    sort: ['date:desc'],
    pagination: { page, pageSize },
    fields: ['title', 'slug', 'date'],
    populate: {
      hero: true, 
      category: { fields: ['name', 'description'] },
      sponsor: { fields: ['name'], populate: { icon: true } },
      // We still populate body to display the excerpt in the card
      body: {
        on: {
          'blog.text-block': { fields: ['content'] }
        }
      }
    },
  };

  // Filtering Logic
  const filters: any = {};
  
  if (category) {
    filters.category = { name: { $eq: category } };
  }

  if (search) {
    filters.title = { $containsi: search };
  }

  if (Object.keys(filters).length > 0) {
    query.filters = filters;
  }

  const res = await fetchAPI('/posts', query);
  
  if (!res || !res.data) {
     return { 
       data: [], 
       meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } 
     };
  }
  return res; 
}

// 2. Get All Slugs
export async function getPostSlugs() {
  const query = {
    fields: ['slug', 'updatedAt'], 
    pagination: { pageSize: 1000 },
  };
  const res = await fetchAPI('/posts', query);
  return res?.data || [];
}

// 3. Get Single Post (BLOG POST PAGE)
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const query = {
    filters: { slug: { $eq: slug } },
    populate: {
      // FIX: Use true
      hero: true, 
      category: { fields: ['name', 'description'] },
      sponsor: { fields: ['name', 'description', 'url'], populate: { icon: true } },
      body: {
        on: {
          'blog.you-tube-embed': { populate: '*' },
          'blog.text-block': { populate: '*' },
          'blog.single-image': { populate: { image: true } }, 
          'blog.multiple-images': { populate: { images: true } },
        },
      },
    },
  };
  const res = await fetchAPI('/posts', query);
  return res?.data && res.data.length > 0 ? res.data[0] : null;
}

// 4. Get Home Page Data
export async function getHomeData(): Promise<Home> {
  const query = { populate: { hero: true } }; // FIX: Use true
  const res = await fetchAPI('/home', query);
  return (res?.data as Home) || ({} as Home);
}

// 5. Get Categories
export async function getCategories(): Promise<Category[]> {
  const query = { fields: ['name', 'description'], sort: ['name:asc'] };
  const res = await fetchAPI('/categories', query);
  return res?.data || [];
}