import qs from 'qs';
import { Post } from '@/types';

// Public URL: Used by the browser (e.g., http://localhost:1337 or https://my-site.com)
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
  try {
    const mergedOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    const queryString = qs.stringify(urlParamsObject, { encodeValuesOnly: true });
    
    // Determine if we are running on the server or client
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer ? getStrapiInternalURL() : getStrapiURL();
    
    const requestUrl = `${baseUrl}/api${path}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(requestUrl, mergedOptions);

    if (!response.ok) {
      throw new Error(`Error fetching from Strapi: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch API Error:', error);
    throw new Error('Failed to fetch data from Strapi');
  }
}

// 1. Get List of Posts
export async function getPosts() {
  const query = {
    sort: ['date:desc'],
    fields: ['title', 'slug', 'date'],
    populate: {
      thumbnail: {
        fields: ['url', 'alternativeText', 'width', 'height'],
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