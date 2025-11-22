import qs from 'qs';
import { Post, Home, Category } from '@/types';

// Public URL: Used by the browser (e.g., https://vibes.ryanjpeterson.dev)
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

// Internal URL: Used by the Next.js server (Docker container to Docker container)
const STRAPI_INTERNAL_URL = process.env.STRAPI_INTERNAL_URL || STRAPI_URL;

export function getStrapiURL(path = '') {
  return `${STRAPI_URL}${path}`;
}

export function getStrapiInternalURL(path = '') {
  return `${STRAPI_INTERNAL_URL}${path}`;
}

async function fetchAPI(path: string, urlParamsObject = {}, options = {}) {
  // Build the request URL
  const queryString = qs.stringify(urlParamsObject, { encodeValuesOnly: true });
  
  // Determine if we are running on the server or client
  const isServer = typeof window === 'undefined';
  
  // CRITICAL FIX:
  // When fetching data (JSON) on the server, use the INTERNAL URL (http://backend:1337)
  // When constructing IMAGE URLs for the client, we typically use getStrapiURL() in components.
  // This logic here is strictly for fetching API data.
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

// ... rest of the file (getPosts, etc.) remains the same
// 1. Get List of Posts
export async function getPosts() {
  const query = {
    sort: ['date:desc'],
    fields: ['title', 'slug', 'date'],
    populate: {
      thumbnail: {
        fields: ['url', 'alternativeText', 'width', 'height'],
      },
      // Add Categories population for the Home Page
      categories: {
        fields: ['name', 'description'],
      },
      sponsors: {
        fields: ['name'],
        populate: {
          icon: {
            fields: ['url', 'alternativeText', 'width', 'height'],
          },
        },
      },
    },
  };
  const res = await fetchAPI('/posts', query);
  return res.data;
}

// 2. Get All Slugs
export async function getPostSlugs() {
  const query = {
    fields: ['slug'],
    pagination: {
      pageSize: 100,
    },
  };
  const res = await fetchAPI('/posts', query);
  return res.data;
}

// 3. Get Single Post by Slug
export async function getPostBySlug(slug: string) {
  const query = {
    filters: {
      slug: {
        $eq: slug,
      },
    },
    populate: {
      thumbnail: {
        fields: ['url', 'alternativeText', 'width', 'height'],
      },
      // Add Categories population
      categories: {
        fields: ['name', 'description'],
      },
      sponsors: {
        fields: ['name', 'description'], 
        populate: {
          icon: {
            fields: ['url', 'alternativeText', 'width', 'height'],
          },
        },
      },
      body: {
        on: {
          'blog.you-tube-embed': {
            populate: '*',
          },
          'blog.text-block': {
            populate: '*', 
          },
          'blog.single-image': {
            populate: {
              image: {
                fields: ['url', 'alternativeText', 'width', 'height'],
              },
            },
          },
          'blog.multiple-images': {
            populate: {
              images: {
                fields: ['url', 'alternativeText', 'width', 'height'],
              },
            },
          },
        },
      },
    },
  };

  const res = await fetchAPI('/posts', query);
  return res.data.length > 0 ? res.data[0] : null;
}

// 4. Get Home Page Data
export async function getHomeData() {
  const query = {
    populate: {
      hero: {
        fields: ['url', 'alternativeText', 'width', 'height'],
      },
    },
  };
  const res = await fetchAPI('/home', query);
  return res.data;
}

// 5. Get All Categories
export async function getCategories() {
  const query = {
    fields: ['name', 'description'],
    sort: ['name:asc'],
  };
  const res = await fetchAPI('/categories', query);
  return res.data;
}